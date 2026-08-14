package main

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

/*
 * Launch job listings. Seeded separately from the content seed (which is
 * gated on posts existing) so jobs can arrive on an already-populated
 * database. Idempotent the same way: a no-op once any job row exists.
 *
 * Tags deliberately overlap the tags people contribute under, since that
 * overlap is what drives matching in jobs.go.
 */
func seedJobs(ctx context.Context, pool *pgxpool.Pool) error {
	var count int
	if err := pool.QueryRow(ctx, `select count(*) from jobs`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	jobs := []struct {
		title, company, location, kind, arrangement, description, applyURL string
		salaryMin, salaryMax, minRep                                       int
		tags                                                               []string
	}{
		{
			title: "Senior Go Backend Engineer", company: "Instadeep",
			location: "Tunis", kind: "full-time", arrangement: "hybrid",
			salaryMin: 5000, salaryMax: 7000, minRep: 150,
			tags:        []string{"Go", "Postgres", "Docker"},
			description: "Own the services behind a logistics platform moving freight across North Africa. You'll design APIs, tune Postgres, and mentor two juniors.",
			applyURL:    "https://example.com/apply/go-backend",
		},
		{
			title: "React Developer", company: "Expensya",
			location: "Tunis", kind: "full-time", arrangement: "onsite",
			salaryMin: 3500, salaryMax: 5000, minRep: 60,
			tags:        []string{"React", "TypeScript", "Next.js"},
			description: "Build the expense dashboard used by finance teams in 20 countries. Strong TypeScript and an eye for interface detail matter more than years on a CV.",
			applyURL:    "https://example.com/apply/react-dev",
		},
		{
			title: "Machine Learning Engineer", company: "Clusterlab",
			location: "Sousse", kind: "full-time", arrangement: "remote",
			salaryMin: 4500, salaryMax: 6500, minRep: 120,
			tags:        []string{"Python", "AI"},
			description: "Ship models into production: retrieval pipelines, evaluation harnesses, and the boring glue that makes them reliable.",
			applyURL:    "https://example.com/apply/ml-engineer",
		},
		{
			title: "DevOps Engineer", company: "Vneuron",
			location: "Sfax", kind: "full-time", arrangement: "remote",
			salaryMin: 4000, salaryMax: 6000, minRep: 100,
			tags:        []string{"Docker", "Postgres"},
			description: "Own CI/CD and the Kubernetes estate. You'll cut deploy times and make on-call boring.",
			applyURL:    "https://example.com/apply/devops",
		},
		{
			title: "Junior Frontend Developer", company: "Wevioo",
			location: "Tunis", kind: "full-time", arrangement: "onsite",
			salaryMin: 1800, salaryMax: 2600, minRep: 0,
			tags:        []string{"React", "CSS"},
			description: "A first role for someone who has been building in public. Show us what you've shipped — a portfolio here counts more than a diploma.",
			applyURL:    "https://example.com/apply/junior-frontend",
		},
		{
			title: "Mobile Engineer (Flutter)", company: "Kaoun",
			location: "Tunis", kind: "contract", arrangement: "hybrid",
			salaryMin: 4000, salaryMax: 5500, minRep: 80,
			tags:        []string{"Flutter", "Mobile"},
			description: "Six-month contract to take a fintech app from prototype to store launch, with an option to extend.",
			applyURL:    "https://example.com/apply/flutter",
		},
		{
			title: "Backend Intern", company: "Chelaa",
			location: "Remote", kind: "internship", arrangement: "remote",
			salaryMin: 800, salaryMax: 1200, minRep: 0,
			tags:        []string{"Go", "SQL"},
			description: "Six-month paid internship on the platform you're reading this on. You'll ship real endpoints in week one.",
			applyURL:    "https://example.com/apply/backend-intern",
		},
		{
			title: "Product Designer", company: "Qare",
			location: "Tunis", kind: "part-time", arrangement: "hybrid",
			salaryMin: 3000, salaryMax: 4200, minRep: 40,
			tags:        []string{"Design", "Figma"},
			description: "Design flows for a telehealth product used daily by clinicians. Systems thinking over pixel polish.",
			applyURL:    "https://example.com/apply/product-designer",
		},
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, j := range jobs {
		if _, err := tx.Exec(ctx, `
			insert into jobs (title, company, location, kind, arrangement,
			  salary_min, salary_max, tags, description, apply_url, min_reputation)
			values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			j.title, j.company, j.location, j.kind, j.arrangement,
			j.salaryMin, j.salaryMax, j.tags, j.description, j.applyURL,
			j.minRep); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
