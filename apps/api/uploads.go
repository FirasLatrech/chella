package main

import (
	"bytes"
	"context"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

/*
 * Image uploads for posts.
 *
 * Storage backend is Cloudflare R2 (S3-compatible) when configured:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
 *   R2_PUBLIC_URL  (the bucket's public base, e.g. https://media.chelaa.tn)
 * Without R2 credentials it falls back to local disk (UPLOAD_DIR, served at
 * /uploads/) so dev needs zero setup. Either way the API stores and returns
 * the full public URL.
 */

const maxUploadBytes = 5 << 20 // 5 MB

var allowedImageTypes = map[string]string{
	"image/png":  ".png",
	"image/jpeg": ".jpg",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

// PDFs ride the same endpoint for CV uploads; validStoredImage still rejects
// them so a PDF can never become a post image.
var allowedDocTypes = map[string]string{
	"application/pdf": ".pdf",
}

type storage interface {
	// Save stores the object and returns its public URL.
	Save(ctx context.Context, name, contentType string, data []byte) (string, error)
	// PublicBase is the prefix all stored URLs share — used to validate that
	// an imageUrl on createPost came from our own uploader.
	PublicBase() string
}

// --- R2 ---

type r2Storage struct {
	client *s3.Client
	bucket string
	public string
}

func (r *r2Storage) Save(ctx context.Context, name, contentType string, data []byte) (string, error) {
	_, err := r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(r.bucket),
		Key:         aws.String(name),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", err
	}
	return r.public + "/" + name, nil
}

func (r *r2Storage) PublicBase() string { return r.public + "/" }

// --- local disk (dev fallback) ---

type diskStorage struct {
	dir    string
	public string
}

func (d *diskStorage) Save(_ context.Context, name, _ string, data []byte) (string, error) {
	if err := os.MkdirAll(d.dir, 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(filepath.Join(d.dir, name), data, 0o644); err != nil {
		return "", err
	}
	return d.public + "/uploads/" + name, nil
}

func (d *diskStorage) PublicBase() string { return d.public + "/uploads/" }

// newStorage picks R2 when fully configured, disk otherwise.
func newStorage() storage {
	account := os.Getenv("R2_ACCOUNT_ID")
	key := os.Getenv("R2_ACCESS_KEY_ID")
	secret := os.Getenv("R2_SECRET_ACCESS_KEY")
	bucket := os.Getenv("R2_BUCKET")
	public := strings.TrimSuffix(os.Getenv("R2_PUBLIC_URL"), "/")

	if account != "" && key != "" && secret != "" && bucket != "" && public != "" {
		cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
			awsconfig.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(key, secret, "")),
			awsconfig.WithRegion("auto"),
		)
		if err != nil {
			log.Fatalf("r2 config: %v", err)
		}
		client := s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.BaseEndpoint = aws.String("https://" + account + ".r2.cloudflarestorage.com")
		})
		log.Printf("uploads: using R2 bucket %q", bucket)
		return &r2Storage{client: client, bucket: bucket, public: public}
	}

	dir := os.Getenv("UPLOAD_DIR")
	if dir == "" {
		dir = "./uploads"
	}
	base := os.Getenv("PUBLIC_API_URL")
	if base == "" {
		base = "http://localhost:" + env("PORT", "4120")
	}
	log.Printf("uploads: R2 not configured, using local disk %q", dir)
	return &diskStorage{dir: dir, public: strings.TrimSuffix(base, "/")}
}

// POST /api/uploads — multipart field "file". Returns {"url": "<public url>"}.
func (s *server) upload(w http.ResponseWriter, r *http.Request) {
	u := s.requireUser(w, r)
	if u == nil {
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	file, _, err := r.FormFile("file")
	if err != nil {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "expected an image up to 5 MB in field 'file'"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unreadable upload"})
		return
	}

	// Sniff the real content type — the client's filename proves nothing.
	contentType := http.DetectContentType(data)
	ext, ok := allowedImageTypes[contentType]
	if !ok {
		ext, ok = allowedDocTypes[contentType]
	}
	if !ok {
		writeJSON(w, http.StatusBadRequest,
			map[string]string{"error": "only png, jpeg, webp, gif or pdf files are allowed"})
		return
	}

	token, err := newToken()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}
	name := token[:24] + ext

	url, err := s.storage.Save(r.Context(), name, contentType, data)
	if err != nil {
		log.Printf("upload save: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"url": url})
}

// validStoredFile guards profile input (CV): any URL our own uploader
// hands out.
func (s *server) validStoredFile(url string) bool {
	return url != "" && strings.HasPrefix(url, s.storage.PublicBase()) &&
		!strings.Contains(url, "..")
}

// validStoredImage guards createPost input: only image URLs our own
// uploader hands out (a stored PDF is not a post image).
func (s *server) validStoredImage(url string) bool {
	if !s.validStoredFile(url) {
		return false
	}
	for _, ext := range allowedImageTypes {
		if strings.HasSuffix(url, ext) {
			return true
		}
	}
	return false
}
