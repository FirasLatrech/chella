package main

import (
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

/*
 * Minimal fixed-window rate limiter for the credential endpoints — enough to
 * blunt online brute force without infrastructure. Per-IP, in memory; resets
 * on restart, which is acceptable for its purpose. Behind a proxy in
 * production, swap RemoteAddr for the trusted forwarded header there.
 */

const (
	authRateLimit  = 10
	authRateWindow = time.Minute
)

// Behind a reverse proxy every request shares the proxy's RemoteAddr, which
// would make one bucket for all users. Set TRUST_PROXY=1 there (and only
// there — trusting the header from the open internet lets clients spoof it).
var trustProxy = os.Getenv("TRUST_PROXY") == "1"

func clientIP(r *http.Request) string {
	if trustProxy {
		if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
			return strings.TrimSpace(strings.Split(fwd, ",")[0])
		}
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

type rateLimiter struct {
	mu   sync.Mutex
	hits map[string][]time.Time
}

var authLimiter = &rateLimiter{hits: map[string][]time.Time{}}

func (l *rateLimiter) allow(key string) bool {
	now := time.Now()
	cutoff := now.Add(-authRateWindow)

	l.mu.Lock()
	defer l.mu.Unlock()

	// Keep the map bounded: drop buckets whose entries have all expired.
	if len(l.hits) > 10_000 {
		for k, ts := range l.hits {
			if len(ts) == 0 || !ts[len(ts)-1].After(cutoff) {
				delete(l.hits, k)
			}
		}
	}

	kept := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= authRateLimit {
		l.hits[key] = kept
		return false
	}
	l.hits[key] = append(kept, now)
	return true
}

// rateLimited guards a handler with the per-IP auth limiter.
func rateLimited(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !authLimiter.allow(clientIP(r)) {
			writeJSON(w, http.StatusTooManyRequests,
				map[string]string{"error": "too many attempts — try again in a minute"})
			return
		}
		next(w, r)
	}
}
