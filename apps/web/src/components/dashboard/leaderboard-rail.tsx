import {
  MedalRibbonStarIcon,
  BoltIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ChatRoundDotsIcon,
} from "@solar-icons/react/bold-duotone";
import { formatPoints } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LeaderboardEntry } from "@/components/leaderboard";

const REP_RULES = [
  { icon: CheckCircleIcon, label: "Answer accepted", value: "+20" },
  { icon: ArrowUpIcon, label: "Post upvoted", value: "+3" },
  { icon: ChatRoundDotsIcon, label: "Answer a question", value: "+5" },
];

export function LeaderboardRail({ entries }: { entries: LeaderboardEntry[] }) {
  const you = entries.find((e) => e.handle === "firas");
  const top = entries.slice(0, 3);

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4">
      {you ? (
        <Card>
          <CardHeader className="flex-row items-center gap-1.5">
            <MedalRibbonStarIcon size={15} className="text-brand" />
            <CardTitle className="text-sm">Your rank</CardTitle>
          </CardHeader>
          <CardBody className="flex items-center gap-3">
            <Avatar seed={you.handle} size="lg" className="ring-brand/50 ring-2" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-semibold tabular-nums">
                  #{you.rank}
                </span>
                <span className="text-muted-foreground text-xs">
                  of {entries.length}
                </span>
              </div>
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatPoints(you.reputation)} rep
              </span>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center gap-1.5">
          <MedalRibbonStarIcon size={15} className="text-amber-500" />
          <CardTitle className="text-sm">Top 3</CardTitle>
        </CardHeader>
        <CardBody className="p-1.5">
          {top.map((user) => (
            <div
              key={user.handle}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
            >
              <Avatar seed={user.handle} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {user.name}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatPoints(user.reputation)}
              </span>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-1.5">
          <BoltIcon size={15} className="text-brand" />
          <CardTitle className="text-sm">Earn reputation</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-2.5 p-3">
          {REP_RULES.map((rule) => {
            const Icon = rule.icon;
            return (
              <div key={rule.label} className="flex items-center gap-2">
                <Icon size={14} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground min-w-0 flex-1 text-xs">
                  {rule.label}
                </span>
                <span className="text-xs font-semibold text-emerald-600 tabular-nums dark:text-emerald-500">
                  {rule.value}
                </span>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </aside>
  );
}
