package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type server struct {
	db      *pgxpool.Pool
	storage storage
	mail    mailer
}

func main() {
	ctx := context.Background()

	dsn := env("DATABASE_URL", "postgres://chelaa:chelaa@localhost:5432/chelaa?sslmode=disable")
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pool.Close()

	if err := migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if err := seed(ctx, pool); err != nil {
		log.Fatalf("seed: %v", err)
	}
	if err := seedJobs(ctx, pool); err != nil {
		log.Fatalf("seed jobs: %v", err)
	}
	if err := ensureDevPasswords(ctx, pool); err != nil {
		log.Fatalf("dev passwords: %v", err)
	}
	purgeExpired(ctx, pool)

	st := newStorage()
	s := &server{db: pool, storage: st, mail: newMailer()}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.healthz)
	mux.HandleFunc("GET /api/posts", s.listPosts)
	mux.HandleFunc("GET /api/posts/{id}", s.getPost)
	mux.HandleFunc("POST /api/posts", s.createPost)
	mux.HandleFunc("POST /api/posts/{id}/replies", s.createReply)
	mux.HandleFunc("POST /api/posts/{id}/vote", s.votePost)
	mux.HandleFunc("PATCH /api/posts/{id}", s.updatePost)
	mux.HandleFunc("DELETE /api/posts/{id}", s.deletePost)
	mux.HandleFunc("PATCH /api/replies/{id}", s.updateReply)
	mux.HandleFunc("DELETE /api/replies/{id}", s.deleteReply)
	mux.HandleFunc("POST /api/posts/{id}/save", s.savePost)
	mux.HandleFunc("GET /api/saved", s.listSaved)
	mux.HandleFunc("POST /api/replies/{id}/vote", s.voteReply)
	mux.HandleFunc("POST /api/replies/{id}/accept", s.acceptReply)
	mux.HandleFunc("POST /api/auth/signup", rateLimited(s.signup))
	mux.HandleFunc("POST /api/auth/login", rateLimited(s.login))
	mux.HandleFunc("POST /api/auth/logout", s.logout)
	mux.HandleFunc("GET /api/auth/me", s.me)
	mux.HandleFunc("GET /api/auth/available", s.available)
	mux.HandleFunc("POST /api/auth/forgot", rateLimited(s.forgotPassword))
	mux.HandleFunc("POST /api/auth/reset", rateLimited(s.resetPassword))
	mux.HandleFunc("GET /api/users", s.listUsers)
	mux.HandleFunc("GET /api/rails/top-week", s.topWeek)
	mux.HandleFunc("GET /api/leaderboard", s.leaderboard)
	mux.HandleFunc("GET /api/jobs", s.listJobs)
	mux.HandleFunc("GET /api/search", s.search)
	mux.HandleFunc("GET /api/rails/trending-tags", s.trendingTags)
	mux.HandleFunc("POST /api/uploads", s.upload)
	mux.HandleFunc("GET /api/notifications", s.listNotifications)
	mux.HandleFunc("POST /api/notifications/{id}/read", s.readNotification)
	mux.HandleFunc("POST /api/notifications/read-all", s.readAllNotifications)
	if disk, ok := st.(*diskStorage); ok {
		mux.Handle("GET /uploads/", http.StripPrefix("/uploads/",
			http.FileServer(http.Dir(disk.dir))))
	}
	mux.HandleFunc("GET /api/users/{handle}", s.getProfile)
	mux.HandleFunc("GET /api/users/{handle}/posts", s.listUserPosts)
	mux.HandleFunc("GET /api/users/{handle}/activity", s.userActivity)
	mux.HandleFunc("PUT /api/me/profile", s.updateProfile)

	addr := ":" + env("PORT", "4120")
	srv := &http.Server{
		Addr:              addr,
		Handler:           cors(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("api listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

func (s *server) healthz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	status := "ok"
	code := http.StatusOK
	if err := s.db.Ping(ctx); err != nil {
		status = "degraded"
		code = http.StatusServiceUnavailable
		log.Printf("db ping: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{
		"status": status,
		"db":     map[bool]string{true: "up", false: "down"}[code == http.StatusOK],
	})
}

// cors allows the Next.js dev server to call the API from the browser.
func cors(next http.Handler) http.Handler {
	origin := env("CORS_ORIGIN", "http://localhost:4100")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Add("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		// CSRF defence in depth beyond SameSite: browsers attach Origin to
		// cross-site state-changing requests — if one is present on an unsafe
		// method and doesn't match, reject. Requests without Origin (curl,
		// same-origin server-side fetches) pass through.
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			if o := r.Header.Get("Origin"); o != "" && o != origin {
				writeJSON(w, http.StatusForbidden,
					map[string]string{"error": "cross-origin request rejected"})
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
