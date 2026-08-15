import Link from "next/link";
import {
  CaseMinimalisticIcon,
  UsersGroupRoundedIcon,
  SpeakerIcon,
  LetterIcon,
  CheckCircleIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

/*
 * Sponsorship. Deliberately no checkout: sponsorships at this stage are a
 * conversation, not a self-serve purchase, so every tier ends in an email
 * rather than a payment form we'd have to build, secure and refund.
 */

const CONTACT = "sponsor@chelaa.tech";

const TIERS = [
  {
    name: "Supporter",
    price: "300 TND",
    cadence: "per month",
    summary: "For companies who want the community to keep running.",
    perks: [
      "Logo in the sidebar rotation",
      "Sponsor badge on your team's profiles",
      "Monthly community report",
    ],
  },
  {
    name: "Hiring partner",
    price: "800 TND",
    cadence: "per month",
    summary: "For teams recruiting engineers in Tunisia.",
    featured: true,
    perks: [
      "Everything in Supporter",
      "Unlimited job listings, matched to contributors by tag",
      "Reach out to contributors ranked in your stack",
      "Company page with your open roles",
    ],
  },
  {
    name: "Founding partner",
    price: "Let's talk",
    cadence: "annual",
    summary: "For organisations backing the platform long term.",
    perks: [
      "Everything in Hiring partner",
      "Named support of a tag or a leaderboard season",
      "Input on the public roadmap",
    ],
  },
];

const REACH = [
  {
    icon: UsersGroupRoundedIcon,
    label: "Engineers, not CVs",
    body: "Every profile is built from real contributions — answers, projects and accepted solutions. You see how someone works before you talk to them.",
  },
  {
    icon: CaseMinimalisticIcon,
    label: "Matched by contribution",
    body: "Roles surface to the people who actually contribute in that stack, ranked by their standing on those tags rather than by keywords on a CV.",
  },
  {
    icon: SpeakerIcon,
    label: "One sponsor at a time",
    body: "The sidebar shows a single sponsor slot in rotation. No ad network, no tracking pixels, nothing sold to third parties.",
  },
];

export default async function SponsorPage() {
  await requireAuth("/sponsor");

  return (
    <Shell>
      <PageHeader title="Become a sponsor" />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
          <div className="w-full px-3 pb-16 md:px-5">
            <main className="mt-1 min-w-0">
              {/* Intro */}
              <div className="bg-muted/60 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]">
                <div className="bg-surface-primary ring-border-surface-strong rounded-xl p-6 ring-[0.5px] md:p-8">
                  <h2 className="max-w-lg text-xl font-semibold tracking-tight text-balance md:text-2xl">
                    Back the place Tunisian engineers build their reputation
                  </h2>
                  <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed text-pretty">
                    Chelaa is free for the people who contribute to it, and it
                    stays that way. Sponsors cover the hosting and the work, and
                    in return reach engineers through what they&rsquo;ve
                    actually built — not an ad network.
                  </p>
                  <a
                    href={`mailto:${CONTACT}?subject=Sponsoring%20Chelaa`}
                    className="bg-brand text-brand-foreground hover:bg-brand-content mt-5 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
                  >
                    <LetterIcon size={16} />
                    Talk to us
                  </a>
                </div>
              </div>

              {/* What sponsors get */}
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {REACH.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="bg-muted/60 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]"
                    >
                      <div className="bg-surface-primary ring-border-surface-strong h-full rounded-xl p-4 ring-[0.5px]">
                        <div className="bg-brand/10 text-brand-content grid size-9 place-items-center rounded-lg">
                          <Icon size={18} />
                        </div>
                        <h3 className="mt-3 text-sm font-semibold tracking-tight">
                          {item.label}
                        </h3>
                        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed text-pretty">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tiers */}
              <h2 className="text-muted-foreground mt-8 mb-2 px-1 text-xs font-medium tracking-wide uppercase">
                Tiers
              </h2>
              <div className="grid gap-3 lg:grid-cols-3">
                {TIERS.map((tier) => (
                  <div
                    key={tier.name}
                    className={cn(
                      "bg-muted/60 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]",
                      tier.featured && "ring-brand/30",
                    )}
                  >
                    <div className="bg-surface-primary ring-border-surface-strong flex h-full flex-col rounded-xl p-5 ring-[0.5px]">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold tracking-tight">
                          {tier.name}
                        </h3>
                        {tier.featured ? (
                          <span className="bg-brand/10 text-brand-content ring-brand/20 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-[0.5px]">
                            Most chosen
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-xl font-semibold tracking-tight tabular-nums">
                          {tier.price}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {tier.cadence}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs leading-relaxed text-pretty">
                        {tier.summary}
                      </p>

                      <ul className="mt-4 flex flex-1 flex-col gap-2">
                        {tier.perks.map((perk) => (
                          <li
                            key={perk}
                            className="flex items-start gap-2 text-xs leading-relaxed"
                          >
                            <CheckCircleIcon
                              size={14}
                              className="text-brand-content mt-px shrink-0"
                            />
                            <span className="text-foreground/90">{perk}</span>
                          </li>
                        ))}
                      </ul>

                      <a
                        href={`mailto:${CONTACT}?subject=${encodeURIComponent(
                          `Chelaa sponsorship — ${tier.name}`,
                        )}`}
                        className={cn(
                          "mt-5 rounded-lg px-3 py-2 text-center text-xs font-medium transition-colors",
                          tier.featured
                            ? "bg-brand text-brand-foreground hover:bg-brand-content"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                        )}
                      >
                        Get in touch
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-muted-foreground mt-6 px-1 text-xs leading-relaxed">
                Prices are indicative and exclude VAT. Sponsorship never
                affects reputation, ranking or moderation — the leaderboard is
                computed from contributions alone. Questions?{" "}
                <a
                  href={`mailto:${CONTACT}`}
                  className="text-brand-content hover:underline"
                >
                  {CONTACT}
                </a>{" "}
                or read more about{" "}
                <Link href="/leaderboard" className="text-brand-content hover:underline">
                  how reputation works
                </Link>
                .
              </p>
            </main>
          </div>
        </div>
      </div>
    </Shell>
  );
}
