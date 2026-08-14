"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, InputField } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabItem } from "@/components/ui/tabs";
import { TabGroup } from "@headlessui/react";
import {
  LeaderboardList,
  type LeaderboardEntry,
} from "@/components/leaderboard";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  CupIcon,
  FlagIcon,
  RocketIcon,
  BoltIcon,
  ClockCircleIcon,
  CodeIcon,
  DownloadIcon,
  UsersGroupRoundedIcon,
} from "@solar-icons/react/bold-duotone";

const leaders: LeaderboardEntry[] = [
  {
    rank: 1,
    name: "Ahmed",
    handle: "ahmed",
    tags: ["React", "Next.js", "TypeScript"],
    reputation: 8420,
    change: 2,
  },
  {
    rank: 2,
    name: "Firas",
    handle: "firas",
    tags: ["React", "Node.js", "Go"],
    reputation: 7920,
    change: 1,
  },
  {
    rank: 3,
    name: "Sarra",
    handle: "sarra",
    tags: ["AI", "Python"],
    reputation: 6510,
    change: -1,
  },
  {
    rank: 4,
    name: "Mehdi",
    handle: "mehdi",
    tags: ["DevOps", "Kubernetes"],
    reputation: 5980,
    change: 0,
  },
  {
    rank: 5,
    name: "Nour",
    handle: "nour",
    tags: ["Design", "Frontend"],
    reputation: 5240,
    change: 3,
  },
];

const PERIODS = ["Today", "Week", "Month", "All time"];

const FRAMEWORKS = [
  { value: "react", label: "React" },
  { value: "nextjs", label: "Next.js" },
  { value: "go", label: "Go" },
  { value: "python", label: "Python" },
];

const CITIES = [
  { value: "tunis", label: "Tunis" },
  { value: "sousse", label: "Sousse" },
  { value: "sfax", label: "Sfax" },
  { value: "nabeul", label: "Nabeul" },
];

export default function Home() {
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [framework, setFramework] = useState("react");
  const [city, setCity] = useState<string | null>("sousse");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-12 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">Chelaa design system</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Headless UI primitives styled with Aside-derived tokens.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium">Buttons</h2>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Button shape="pill">
            <DownloadIcon size={16} />
            Download
          </Button>
          <Button shape="pill" variant="brand">
            <UsersGroupRoundedIcon size={16} />
            Join Chelaa
          </Button>
          <Button shape="pill" variant="outline">
            Learn more
          </Button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="brand">Brand</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium">Badges</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="brand">
            <CupIcon size={12} />
            Top Contributor
          </Badge>
          <Badge variant="secondary">React</Badge>
          <Badge variant="outline">Sousse</Badge>
          <Badge variant="destructive">Spam</Badge>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium">Card &amp; leaderboard</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <CardTitle className="flex items-center gap-1.5">
                  <FlagIcon size={16} className="text-brand" />
                  Top contributors
                </CardTitle>
                <CardDescription>Reputation earned</CardDescription>
              </div>
              <TabGroup>
                <Tabs className="bg-surface-primary ring-[0.5px] ring-border-surface">
                  {PERIODS.map((p) => (
                    <TabItem key={p}>{p}</TabItem>
                  ))}
                </Tabs>
              </TabGroup>
            </CardHeader>
            <CardBody className="p-2">
              <LeaderboardList entries={leaders} />
            </CardBody>
            <CardFooter>
              <ClockCircleIcon size={16} />
              Updated hourly · resets in 12 days
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your standing on Chelaa.</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="bg-secondary text-muted-foreground grid size-12 shrink-0 place-items-center rounded-full text-base font-medium">
                  F
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-semibold tracking-tight">
                    Firas
                  </div>
                  <div className="text-muted-foreground text-sm">
                    @firas · Sousse
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-lg font-semibold tabular-nums">
                    7,920
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Reputation
                  </span>
                </div>
                <div className="bg-border-surface h-8 w-px" />
                <div className="flex flex-col">
                  <span className="text-lg font-semibold tabular-nums">7</span>
                  <span className="text-muted-foreground text-xs">Projects</span>
                </div>
                <div className="bg-border-surface h-8 w-px" />
                <div className="flex flex-col">
                  <span className="text-lg font-semibold tabular-nums">184</span>
                  <span className="text-muted-foreground text-xs">Answers</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge variant="brand">
                  <CupIcon size={12} />
                  #20 Tunisia
                </Badge>
                <Badge variant="secondary">
                  <CodeIcon size={12} />
                  #4 React
                </Badge>
                <Badge variant="outline">
                  <RocketIcon size={12} />
                  Builder
                </Badge>
              </div>
            </CardBody>
            <CardFooter>
              <BoltIcon size={16} className="text-brand" />
              +180 reputation this week
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium">Form controls</h2>

        {/* Every control shares one sizing scale, so a mixed row lines up. */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Button>Button</Button>
          <Input placeholder="Input" className="w-32" />
          <div className="w-40">
            <Select
              value={framework}
              onChange={setFramework}
              options={FRAMEWORKS}
            />
          </div>
          <div className="w-44">
            <Combobox value={city} onChange={setCity} items={CITIES} />
          </div>
        </div>

        <div className="flex max-w-sm flex-col gap-5">
          <InputField label="Username" description="Your public @handle.">
            <Input placeholder="firas" />
          </InputField>
          <InputField label="Primary stack">
            <Select
              value={framework}
              onChange={setFramework}
              options={FRAMEWORKS}
            />
          </InputField>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Email notifications</span>
            <Switch checked={notify} onChange={setNotify} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium">Dialog</h2>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open dialog
        </Button>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Publish project"
          description="Your project will be visible to the whole Chelaa community."
        >
          <InputField label="Project name">
            <Input placeholder="chelaa-api" />
          </InputField>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={() => setOpen(false)}>
              Publish
            </Button>
          </DialogFooter>
        </Dialog>
      </section>
    </main>
  );
}
