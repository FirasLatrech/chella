package main

import (
	"encoding/json"
	"strings"
)

/*
 * Post bodies are stored as jsonb blocks and rendered to every reader, so
 * incoming blocks are re-built here rather than trusted: unknown types are
 * dropped, every field is copied explicitly, and all content is plain text.
 * The client has a matching whitelist (web/src/lib/blocks.ts) — this one is
 * the boundary that actually enforces it.
 */

const (
	maxBlocks    = 60
	maxBlockRune = 5000
	maxListItems = 40
)

// block is the wire/storage shape. Fields are a union across types; only
// those relevant to Type are ever set.
type block struct {
	Type    string   `json:"type"`
	Text    string   `json:"text,omitempty"`
	Level   int      `json:"level,omitempty"`
	Code    string   `json:"code,omitempty"`
	Lang    string   `json:"lang,omitempty"`
	Items   []string `json:"items,omitempty"`
	Ordered bool     `json:"ordered,omitempty"`
}

func clip(s string) string {
	s = strings.TrimSpace(s)
	if r := []rune(s); len(r) > maxBlockRune {
		return string(r[:maxBlockRune])
	}
	return s
}

// sanitizeBlocks returns a safe copy of the input, dropping anything that
// isn't a known block type or that carries no content.
func sanitizeBlocks(in []block) []block {
	out := []block{}
	for _, b := range in {
		if len(out) >= maxBlocks {
			break
		}
		switch b.Type {
		case "p", "quote":
			if text := clip(b.Text); text != "" {
				out = append(out, block{Type: b.Type, Text: text})
			}
		case "heading":
			level := 2
			if b.Level == 1 {
				level = 1
			}
			if text := clip(b.Text); text != "" {
				out = append(out, block{Type: "heading", Level: level, Text: text})
			}
		case "code":
			// Code keeps its internal whitespace; only the ends are trimmed.
			if code := clip(b.Code); code != "" {
				lang := b.Lang
				if len(lang) > 20 {
					lang = ""
				}
				out = append(out, block{Type: "code", Code: code, Lang: lang})
			}
		case "list":
			items := []string{}
			for _, item := range b.Items {
				if item = clip(item); item != "" {
					items = append(items, item)
				}
				if len(items) >= maxListItems {
					break
				}
			}
			if len(items) > 0 {
				out = append(out, block{Type: "list", Items: items, Ordered: b.Ordered})
			}
		}
	}
	return out
}

// blocksText flattens blocks to plain text, for excerpt generation.
func blocksText(blocks []block) string {
	parts := make([]string, 0, len(blocks))
	for _, b := range blocks {
		switch b.Type {
		case "p", "quote", "heading":
			parts = append(parts, b.Text)
		case "code":
			parts = append(parts, b.Code)
		case "list":
			parts = append(parts, strings.Join(b.Items, " "))
		}
	}
	return strings.Join(parts, " ")
}

// buildBlocks turns composer input into stored jsonb. Rich blocks win when
// present; otherwise the plain body becomes a single paragraph, which keeps
// older clients (and the seed) working.
func buildBlocks(in []block, body string) ([]byte, string) {
	blocks := sanitizeBlocks(in)
	if len(blocks) == 0 {
		if body = strings.TrimSpace(body); body != "" {
			blocks = []block{{Type: "p", Text: clip(body)}}
		}
	}
	text := blocksText(blocks)
	encoded, err := json.Marshal(blocks)
	if err != nil {
		encoded = []byte("[]")
	}
	return encoded, text
}

// excerptFrom renders the feed preview: first ~180 characters of body text.
func excerptFrom(text, fallback string) string {
	text = strings.Join(strings.Fields(text), " ")
	if text == "" {
		text = fallback
	}
	if r := []rune(text); len(r) > 180 {
		return string(r[:177]) + "…"
	}
	return text
}
