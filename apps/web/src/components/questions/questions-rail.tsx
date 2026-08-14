import {
  MedalRibbonStarIcon,
  BoltIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ChatRoundDotsIcon,
} from "@solar-icons/react/bold-duotone";
import { Avatar } from "@/components/ui/avatar";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ANSWERERS = [
  { handle: "sarra", name: "Sarra", accepted: 31 },
  { handle: "ahmed", name: "Ahmed", accepted: 24 },
  { handle: "mehdi", name: "Mehdi", accepted: 17 },
];

const REP_RULES = [
  { icon: CheckCircleIcon, label: "Answer accepted", value: "+20" },
  { icon: ArrowUpIcon, label: "Answer upvoted", value: "+3" },
  { icon: ChatRoundDotsIcon, label: "Answer a question", value: "+5" },
];

export function QuestionsRail() {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center gap-1.5">
          <MedalRibbonStarIcon size={15} className="text-amber-500" />
          <CardTitle className="text-sm">Top answerers</CardTitle>
        </CardHeader>
        <CardBody className="p-1.5">
          {ANSWERERS.map((user) => (
            <div
              key={user.handle}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
            >
              <Avatar seed={user.handle} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {user.name}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {user.accepted} accepted
              </span>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Why answering matters — the reputation contract, stated plainly. */}
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
