package main

import (
	"sync"
	"time"
)

/*
 * Short-lived cache in front of the reputation formula.
 *
 * leaderboardQuery is a six-CTE aggregation over every post, reply and vote,
 * joined against every user — there is no per-user filter to push down. A
 * single profile view legitimately needs it several times (all-time, this
 * week, once per tag for ranks, again for badges), so without a cache one
 * page view triggers half a dozen full recomputations.
 *
 * The cache sits UNDER leaderboardRows rather than replacing call sites, so
 * the "one formula, one implementation" rule still holds — callers cannot
 * tell it is here, and nothing else gained the ability to do point maths.
 *
 * The TTL is deliberately short. Reputation must feel live: casting a vote
 * and seeing your points move is the core loop, so a few seconds of
 * staleness is the most that is acceptable.
 */
const boardCacheTTL = 5 * time.Second

type boardCacheEntry struct {
	rows []boardRow
	at   time.Time
}

type boardCache struct {
	mu      sync.Mutex
	entries map[string]boardCacheEntry
}

func newBoardCache() *boardCache {
	return &boardCache{entries: map[string]boardCacheEntry{}}
}

// get returns cached rows for a window+tag if they are still fresh.
func (c *boardCache) get(key string) ([]boardRow, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.entries[key]
	if !ok || time.Since(e.at) > boardCacheTTL {
		return nil, false
	}
	return e.rows, true
}

func (c *boardCache) put(key string, rows []boardRow) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Drop expired entries opportunistically; the key space is tiny (a
	// handful of windows × tags), so this cannot grow unbounded.
	for k, e := range c.entries {
		if time.Since(e.at) > boardCacheTTL {
			delete(c.entries, k)
		}
	}
	c.entries[key] = boardCacheEntry{rows: rows, at: time.Now()}
}
