"use client";

import Link from "next/link";
import {
  AltArrowRightIcon,
  MagicWandIcon,
  CheckCircleIcon,
  SpeakerIcon,
  UsersGroupRoundedIcon,
} from "@solar-icons/react/bold-duotone";
import { Card, CardBody } from "@/components/ui/card";
import {
  useAdminSponsors,
  useBotSuggestions,
  useMe,
  usePendingPosts,
  usePriorityPosters,
} from "@/lib/queries";

const tiles = [
  {
    href: "/admin/review",
    title: "Review posts",
    description: "Approve or reject posts waiting for review.",
    icon: CheckCircleIcon,
    value: "review",
  },
  {
    href: "/admin/access",
    title: "Posting access",
    description: "Choose who can publish without review.",
    icon: UsersGroupRoundedIcon,
    value: "access",
  },
  {
    href: "/admin/sponsors",
    title: "Sponsors",
    description: "See live sponsors and manage the custom slot.",
    icon: SpeakerIcon,
    value: "sponsors",
  },
  {
    href: "/admin/bot",
    title: "Bot posts",
    description: "Daily AI drafts from Chelaa Bot — you approve before publish.",
    icon: MagicWandIcon,
    value: "bot",
  },
] as const;

export function AdminOverview() {
  const { data: me } = useMe();
  const { data: pending = [] } = usePendingPosts(!!me?.isAdmin);
  const { data: posters = [] } = usePriorityPosters(!!me?.isAdmin);
  const { data: sponsors = [] } = useAdminSponsors(!!me?.isAdmin);
  const { data: botSuggestions = [] } = useBotSuggestions(!!me?.isAdmin, "pending");

  const status = {
    review: pending.length === 0 ? "Queue clear" : `${pending.length} waiting`,
    access: `${posters.length} with access`,
    sponsors: `${sponsors.filter((sponsor) => sponsor.active).length} live`,
    bot: botSuggestions.length === 0 ? "No drafts" : `${botSuggestions.length} to review`,
  };

  return (
    <main className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight">Admin overview</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Each admin tool has its own focused page.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.href} href={tile.href} className="group">
                <Card className="h-full transition-transform duration-200 group-hover:-translate-y-0.5">
                  <CardBody className="flex h-full min-h-48 flex-col">
                    <span className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-xl">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-5 font-semibold tracking-tight">{tile.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">{tile.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-6 text-sm">
                      <span className="text-muted-foreground">{status[tile.value]}</span>
                      <AltArrowRightIcon className="text-brand transition-transform group-hover:translate-x-0.5" size={18} />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
