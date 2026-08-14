package main

import (
	"context"
	"fmt"
)

/*
 * Badges — derived, never stored.
 *
 * Every badge is a query over the domain tables, computed on read. Same
 * reasoning as the reputation formula: nothing to backfill, nothing to drift,
 * and deleting content correctly takes its badge away. A badges table would
 * need a job to keep it honest; this cannot go stale by construction.
 *
 * Tiers are cosmetic groupings the UI colours by: bronze < silver < gold.
 */

type badge struct {
	Slug        string `json:"slug"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Tier        string `json:"tier"`
	/* Progress toward the next tier, when the badge is countable. */
	Count int `json:"count,omitempty"`
}

// badgeStats are the raw counts every badge rule reads from.
type badgeStats struct {
	Posts        int
	Projects     int
	Replies      int
	Accepted     int
	VotesGiven   int
	VotesEarned  int
	ActiveDays   int
	BestTagRank  int
	BestTag      string
	Reputation   int
	AnsweredFast int
}

func (s *server) badgeStats(ctx context.Context, userID int64) (badgeStats, error) {
	var st badgeStats
	err := s.db.QueryRow(ctx, `
		select
		  (select count(*) from posts where author_id = $1),
		  (select count(*) from posts where author_id = $1 and kind = 'project'),
		  (select count(*) from replies where author_id = $1),
		  (select count(*) from replies where author_id = $1 and accepted),
		  (select count(*) from post_votes where user_id = $1)
		    + (select count(*) from reply_votes where user_id = $1),
		  (select coalesce(sum(case when v.direction = 1 then 1 else 0 end), 0)
		     from post_votes v join posts p on p.id = v.post_id
		     where p.author_id = $1),
		  (select count(distinct d) from (
		     select date_trunc('day', created_at) d from posts where author_id = $1
		     union select date_trunc('day', created_at) from replies where author_id = $1
		   ) days),
		  -- Answers posted within an hour of the question.
		  (select count(*) from replies r join posts p on p.id = r.post_id
		     where r.author_id = $1 and r.created_at - p.created_at < interval '1 hour')
		`, userID).Scan(&st.Posts, &st.Projects, &st.Replies, &st.Accepted,
		&st.VotesGiven, &st.VotesEarned, &st.ActiveDays, &st.AnsweredFast)
	if err != nil {
		return st, err
	}

	// Reputation and tag standing come from the single formula.
	if board, err := s.leaderboardRows(ctx, nil, ""); err == nil {
		for _, b := range board {
			if b.UserID == userID {
				st.Reputation = b.Points
				break
			}
		}
	}
	if tags, err := s.userTopTags(ctx); err == nil {
		for _, tag := range tags[userID] {
			if rank := s.tagRank(ctx, userID, tag); rank > 0 {
				if st.BestTagRank == 0 || rank < st.BestTagRank {
					st.BestTagRank, st.BestTag = rank, tag
				}
			}
		}
	}
	return st, nil
}

// tierFor picks a tier from thresholds: bronze, silver, gold.
func tierFor(n, silver, gold int) string {
	switch {
	case n >= gold:
		return "gold"
	case n >= silver:
		return "silver"
	default:
		return "bronze"
	}
}

// badgesFor evaluates every rule against the stats. Order is the display
// order: earned rarity roughly descending.
func badgesFor(st badgeStats) []badge {
	out := []badge{}
	add := func(b badge) { out = append(out, b) }

	if st.BestTagRank == 1 {
		add(badge{
			Slug: "tag-leader", Label: fmt.Sprintf("#1 in %s", st.BestTag),
			Description: "Top of the all-time board for this tag.",
			Tier:        "gold",
		})
	} else if st.BestTagRank > 0 && st.BestTagRank <= 10 {
		add(badge{
			Slug: "tag-top-ten", Label: fmt.Sprintf("Top 10 in %s", st.BestTag),
			Description: "Among the ten highest-scoring contributors for this tag.",
			Tier:        "silver", Count: st.BestTagRank,
		})
	}

	if st.Accepted > 0 {
		add(badge{
			Slug: "problem-solver", Label: "Problem solver",
			Description: "Answers marked as accepted by the person who asked.",
			Tier:        tierFor(st.Accepted, 5, 20), Count: st.Accepted,
		})
	}
	if st.Replies >= 5 {
		add(badge{
			Slug: "helper", Label: "Helper",
			Description: "Shows up in the discussions.",
			Tier:        tierFor(st.Replies, 25, 100), Count: st.Replies,
		})
	}
	if st.AnsweredFast >= 3 {
		add(badge{
			Slug: "quick-draw", Label: "Quick draw",
			Description: "Answered within an hour of the question being asked.",
			Tier:        tierFor(st.AnsweredFast, 10, 30), Count: st.AnsweredFast,
		})
	}
	if st.Projects > 0 {
		add(badge{
			Slug: "builder", Label: "Builder",
			Description: "Shipped projects for the community to see.",
			Tier:        tierFor(st.Projects, 3, 10), Count: st.Projects,
		})
	}
	if st.VotesEarned >= 10 {
		add(badge{
			Slug: "well-received", Label: "Well received",
			Description: "Upvotes earned on their contributions.",
			Tier:        tierFor(st.VotesEarned, 50, 200), Count: st.VotesEarned,
		})
	}
	if st.ActiveDays >= 5 {
		add(badge{
			Slug: "regular", Label: "Regular",
			Description: "Separate days with a contribution.",
			Tier:        tierFor(st.ActiveDays, 30, 100), Count: st.ActiveDays,
		})
	}
	if st.VotesGiven >= 10 {
		add(badge{
			Slug: "good-citizen", Label: "Good citizen",
			Description: "Votes cast to surface other people's work.",
			Tier:        tierFor(st.VotesGiven, 50, 150), Count: st.VotesGiven,
		})
	}
	if st.Posts > 0 {
		add(badge{
			Slug: "first-steps", Label: "First steps",
			Description: "Posted their first contribution.",
			Tier:        "bronze",
		})
	}

	return out
}
