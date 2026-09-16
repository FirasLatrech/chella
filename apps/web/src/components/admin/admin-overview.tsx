"use client";

import Link from "next/link";
import {
  AltArrowRightIcon,
  CheckCircleIcon,
  SpeakerIcon,
  UsersGroupRoundedIcon,
} from "@solar-icons/react/bold-duotone";
import { Card, CardBody } from "@/components/ui/card";
import { useMe, usePendingPosts, usePriorityPosters, useSponsor } from "@/lib/queries";

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
] as const;

export function AdminOverview() {
  const { data: me } = useMe();
  const { data: pending = [] } = usePendingPosts(!!me?.isAdmin);
  const { data: posters = [] } = usePriorityPosters(!!me?.isAdmin);
  const { data: sponsor } = useSponsor();

  const status = {
    review: pending.length === 0 ? "Queue clear" : `${pending.length} waiting`,
    access: `${posters.length} with access`,
    sponsors: sponsor?.active ? "Custom sponsor live" : "2 sponsors live",
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
        <div className="grid gap-4 md:grid-cols-3">
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
