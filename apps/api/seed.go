package main

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// seed populates an empty database with the launch content (ported from the
// frontend's original mock store). Idempotent: it does nothing once posts
// exist, so it is safe to run on every boot.
func seed(ctx context.Context, pool *pgxpool.Pool) error {
	var count int
	if err := pool.QueryRow(ctx, `select count(*) from posts`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	users := []struct{ handle, name string }{
		{"ahmed", "Ahmed"}, {"sarra", "Sarra"}, {"mehdi", "Mehdi"},
		{"firas", "Firas"}, {"nour", "Nour"},
	}
	ids := map[string]int64{}
	for _, u := range users {
		var id int64
		if err := tx.QueryRow(ctx,
			`insert into users (handle, name, email) values ($1, $2, $3) returning id`,
			u.handle, u.name, u.handle+"@chelaa.tn").Scan(&id); err != nil {
			return fmt.Errorf("seed user %s: %w", u.handle, err)
		}
		ids[u.handle] = id
	}

	type post struct {
		id       int64
		kind     string
		title    string
		excerpt  string
		blocks   string // JSON
		tags     []string
		author   string
		votes    int
		views    int
		solved   bool
		hasImage bool
		ageMin   int // minutes ago
	}

	posts := []post{
		{1, "question", "How do you structure a Go API for a multi-tenant SaaS?",
			"Weighing row-level security against schema-per-tenant with pgx connection pooling — what has actually held up in production?",
			`[{"type":"p","text":"We're building a SaaS for Tunisian accounting firms and every design doc I read contradicts the last one. The two candidates are row-level security on a shared schema, or one schema per tenant."},{"type":"p","text":"Our constraints: ~200 tenants in year one, a single Postgres 17 instance, and a Go API using pgx pools. The part I can't reason about is connection pooling — RLS needs the tenant set per connection:"},{"type":"code","lang":"go","code":"conn.Exec(ctx, \"SET app.tenant_id = $1\", tenantID)\n// …every checkout from the pool?"},{"type":"p","text":"Has anyone run either approach in production for a few years? What breaks first?"}]`,
			[]string{"Go", "Postgres"}, "ahmed", 24, 312, false, false, 12},
		{2, "project", "Sfax Transit — realtime bus tracking for Tunisian cities",
			"Next.js 16 + MapLibre frontend over a Go ingestion service. Open data, MIT licensed, contributors welcome.",
			`[{"type":"p","text":"Sfax has no public realtime transit data, so we built our own: volunteer-run GPS trackers on 12 bus lines, a Go ingestion service, and a MapLibre map that anyone can open on a phone."},{"type":"list","items":["Next.js 16 frontend, MapLibre GL, works offline after first load","Go ingestion service — 40 msgs/sec on a 5€ VPS","All position data published as open data (ODbL)"]},{"type":"p","text":"MIT licensed. We need help with the ETA prediction model and an Arabic UI pass — issues are tagged on GitHub."}]`,
			[]string{"Next.js", "Maps"}, "sarra", 86, 1240, false, true, 120},
		{3, "question", "Best approach for Arabic + French i18n in the App Router?",
			"RTL layout handling, locale routing and Arabic font loading — looking for a setup that survives real content.",
			`[{"type":"p","text":"Building a bilingual product for the Tunisian market: French and Arabic, which means LTR and RTL in one codebase. The App Router examples I find all assume a single direction."},{"type":"list","items":["Locale routing — /fr and /ar segments, or a cookie?","RTL: flip with dir=rtl alone, or logical properties everywhere?","Arabic webfont loading without a flash of fallback"]}]`,
			[]string{"Next.js", "i18n"}, "mehdi", 41, 690, true, false, 300},
		{4, "post", "What I learned shipping my first product from Sousse",
			"Finding the first ten users, pricing for the local market, and the reality of payment rails in Tunisia.",
			`[{"type":"p","text":"A year ago I quit my job to build a scheduling tool for Tunisian clinics. It now pays my rent. Here is everything I wish someone had told me on day one."},{"type":"p","text":"The first ten users came from walking into clinics, not from ads. Every clinic that said no told me why — that feedback was worth more than the yes."},{"type":"list","items":["Price in TND, monthly, no annual contracts — trust is earned in months here","Cash and bank transfer beat cards; card rails came third","WhatsApp is your support channel whether you like it or not"]}]`,
			[]string{"Startup"}, "firas", 152, 3180, false, true, 480},
		{5, "project", "Tunisian tech salary survey — 2026 results",
			"1,200 responses, anonymised dataset, charts by role and region. Now published with the raw data.",
			`[{"type":"p","text":"Third year running the survey, biggest sample yet: 1,200 responses across Tunis, Sfax, Sousse and remote. The anonymised dataset and all charts are now public."},{"type":"list","items":["Median dev salary up 11% year over year","Remote-for-foreign-company pays 2.4× local median","Go and Rust roles command the largest premiums"]}]`,
			[]string{"Data", "Careers"}, "nour", 204, 5420, false, true, 1440},
		{6, "post", "Self-hosting Postgres in Tunisia: latency and backup notes",
			"Provider comparison, backups to object storage, and what it actually costs to run your own database here.",
			`[{"type":"p","text":"Managed Postgres from EU regions adds 40–60ms to every query from Tunisian users. For our workload that was the whole performance budget, so we moved the database onshore. Notes from six months of self-hosting."},{"type":"code","lang":"bash","code":"pgbackrest --stanza=main backup --type=incr\n# nightly, to object storage in a second region"}]`,
			[]string{"DevOps", "Postgres"}, "ahmed", 68, 980, false, false, 4320},
		{7, "question", "Hydration mismatch only in production builds — where to start?",
			"Dev is clean, prod throws hydration errors on the first paint. No Date.now or random in render as far as I can tell.",
			`[{"type":"p","text":"Our app is clean in dev, but the production build logs hydration mismatches on first paint — always on the dashboard route, never reproducible locally. No Date.now(), no Math.random() in render paths that I can find."},{"type":"p","text":"What's a systematic way to find the mismatching subtree in a minified prod build?"}]`,
			[]string{"Next.js", "React"}, "nour", 9, 143, false, false, 60},
		{8, "question", "Payment gateways that actually work for Tunisian startups?",
			"Selling to local customers in TND — what are people using for cards and mobile money without a foreign entity?",
			`[{"type":"p","text":"We're selling a SaaS to local businesses in TND. Stripe still isn't an option without a foreign entity, and the local options all have sharp edges. What are people actually running in production for card payments and mobile money?"}]`,
			[]string{"Payments", "Startup"}, "firas", 33, 820, false, false, 540},
		{9, "question", "pgx pool exhaustion under load — how do you debug it?",
			"Connections spike to the max and requests queue. Metrics look fine until they suddenly don't.",
			`[{"type":"p","text":"Under load the pgx pool hits MaxConns, everything queues, and p99 goes vertical. AcquireCount and AcquireDuration look normal right up until they don't. How do you instrument this properly before it falls over?"}]`,
			[]string{"Go", "Postgres"}, "sarra", 18, 260, false, false, 1500},
		{10, "project", "Derja NLP — open Tunisian Arabic language models",
			"Tokeniser, sentiment model and a 2M-sentence corpus for Tunisian derja, trained in the open.",
			`[{"type":"p","text":"Every NLP model treats Tunisian derja as noisy Modern Standard Arabic and fails. We collected a 2M-sentence corpus from public sources and trained a tokeniser and sentiment model that actually understand it."},{"type":"list","items":["Corpus, weights and training code all Apache-2.0","Sentiment F1 of 0.87 vs 0.61 for MSA models on derja","Runs on CPU — built for local deployment"]}]`,
			[]string{"AI", "NLP"}, "mehdi", 143, 2900, false, true, 5760},
		{11, "project", "Karhba — used-car price checker for the Tunisian market",
			"Scrapes listings, normalises trims, and tells you if a price is fair. 40k listings and counting.",
			`[{"type":"p","text":"Buying a used car here means guessing whether a price is sane. Karhba scrapes the big listing sites nightly, normalises trims and mileage, and shows you the fair-price band for any model."}]`,
			[]string{"Data", "Next.js"}, "nour", 97, 4100, false, true, 8640},
	}

	for _, p := range posts {
		if _, err := tx.Exec(ctx, `
			insert into posts (id, kind, title, excerpt, blocks, tags, author_id,
				votes, views, solved, has_image, created_at)
			values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
				now() - make_interval(mins => $12))`,
			p.id, p.kind, p.title, p.excerpt, p.blocks, p.tags, ids[p.author],
			p.votes, p.views, p.solved, p.hasImage, p.ageMin); err != nil {
			return fmt.Errorf("seed post %d: %w", p.id, err)
		}
	}

	type reply struct {
		post     int64
		author   string
		body     string
		votes    int
		accepted bool
		ageMin   int
	}

	replies := []reply{
		{1, "sarra", "We run RLS on a shared schema for ~400 tenants. The SET per checkout is real but cheap — wrap it in AfterConnect and a pgx middleware. What breaks first is migrations discipline, not RLS: one bad policy and a tenant sees another's rows. Write policy tests from day one.", 11, false, 10},
		{1, "mehdi", "Schema-per-tenant sounds clean until you have 200 schemas × 40 tables and a migration takes an hour. Below ~50 tenants it's fine; at your scale I'd take RLS.", 4, false, 5},
		{2, "firas", "This is exactly the kind of civic tech Tunisia needs. Does the tracker hardware survive summer heat? We tried something similar in Sousse and enclosure temperature killed us.", 9, false, 60},
		{2, "nour", "Happy to take the Arabic UI pass — I did the RTL work on our internal dashboard. Claiming the issue.", 3, false, 40},
		{3, "nour", "We shipped exactly this. (1) Use a [locale] segment, not cookies — shareable URLs matter more than clean paths. (2) Set dir=rtl on <html> and use only logical properties (ps-*, pe-*, ms-*) — Tailwind handles the rest; never write left/right. (3) Load Arabic via next/font with a subset and size-adjust on the fallback. The one trap: icons that imply direction (arrows, chevrons) need a manual rtl:rotate-180.", 18, true, 180},
		{3, "ahmed", "Adding to the accepted answer: test with real Arabic content early. Lorem ipsum hides every line-height and letter-spacing problem Arabic will give you.", 6, false, 120},
		{4, "sarra", "The WhatsApp point is underrated. We resisted it for a year for 'process' reasons and our churn dropped the week we gave in.", 14, false, 360},
		{5, "ahmed", "The remote multiplier matches what I see when hiring — and it's exactly why local companies need to compete on more than salary. Great work publishing the raw data.", 8, false, 1200},
		{8, "mehdi", "We use a local PSP for cards and fall back to bank transfer with automated reconciliation for the larger clients. Honestly the transfer flow converts better than cards for B2B here — invoice habits run deep.", 12, false, 420},
		{10, "sarra", "The tokeniser alone is worth the repo. We swapped it into our support-ticket classifier and accuracy jumped eight points.", 10, false, 4320},
	}

	for _, r := range replies {
		if _, err := tx.Exec(ctx, `
			insert into replies (post_id, author_id, body, votes, accepted, created_at)
			values ($1, $2, $3, $4, $5, now() - make_interval(mins => $6))`,
			r.post, ids[r.author], r.body, r.votes, r.accepted, r.ageMin); err != nil {
			return fmt.Errorf("seed reply on post %d: %w", r.post, err)
		}
	}

	// Seeded posts used explicit ids; realign the identity sequence.
	if _, err := tx.Exec(ctx,
		`select setval(pg_get_serial_sequence('posts', 'id'), (select max(id) from posts))`); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
