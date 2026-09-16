"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  MagicWandIcon,
  CheckCircleIcon,
  CloseCircleIcon,
  PlayIcon,
} from "@solar-icons/react/bold-duotone";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, InputField, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/lib/keys";
import {
  ApiError,
  acceptBotSuggestion,
  rejectBotSuggestion,
  runBotNow,
  updateBotConfig,
} from "@/lib/mutations";
import { useBotConfig, useBotSuggestions, useMe } from "@/lib/queries";

export function BotPanel() {
  const { data: me } = useMe();
  const { data: config, isLoading: loadingConfig } = useBotConfig(!!me?.isAdmin);
  const { data: suggestions = [], isLoading: loadingSuggestions } = useBotSuggestions(
    !!me?.isAdmin,
    "pending",
  );
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(false);
  const [context, setContext] = useState("");
  const [runHour, setRunHour] = useState(8);
  const [timezone, setTimezone] = useState("Africa/Tunis");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!config) return;
    setEnabled(config.enabled);
    setContext(config.context);
    setRunHour(config.runHour);
    setTimezone(config.timezone);
  }, [config]);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.botConfig }),
      queryClient.invalidateQueries({ queryKey: queryKeys.botSuggestions("pending") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.feed }),
    ]);
  }

  async function saveConfig() {
    setBusy("save");
    setNotice("");
    try {
      await updateBotConfig({ enabled, context, runHour, timezone });
      await refresh();
      setNotice("Bot settings saved.");
    } catch {
      setNotice("Could not save bot settings.");
    } finally {
      setBusy("");
    }
  }

  async function runNow() {
    setBusy("run");
    setNotice("");
    try {
      await runBotNow();
      await refresh();
      setNotice("Generated new suggestions — review them below.");
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "Bot run failed.");
    } finally {
      setBusy("");
    }
  }

  async function review(id: string, action: "accept" | "reject") {
    setBusy(id);
    setNotice("");
    try {
      if (action === "accept") await acceptBotSuggestion(id);
      else await rejectBotSuggestion(id);
      await refresh();
    } catch {
      setNotice("Could not update that suggestion.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Bot posts</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Chelaa Bot drafts daily posts from your topics. You approve before anything goes live as{" "}
            <span className="font-medium text-foreground">@chelaa_bot</span>.
          </p>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="bg-brand/10 text-brand flex size-10 items-center justify-center rounded-xl">
                  <MagicWandIcon size={20} />
                </span>
                <div>
                  <p className="font-medium">Daily automation</p>
                  <p className="text-muted-foreground text-sm">
                    Runs once at {runHour}:00 ({timezone})
                  </p>
                </div>
              </div>
              <Switch checked={enabled} onChange={setEnabled} aria-label="Enable bot" />
            </div>

            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                Topics &amp; editorial direction
              </label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. Tunisian startups, Go, React, AI tools, dev careers — focus on what launched or trended today."
                rows={4}
                className="resize-y"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label="Run hour (0–23)">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={runHour}
                  onChange={(e) => setRunHour(Number(e.target.value))}
                />
              </InputField>
              <InputField label="Timezone">
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Africa/Tunis"
                />
              </InputField>
            </div>

            {config?.lastRunAt ? (
              <p className="text-muted-foreground text-xs">
                Last run: {new Date(config.lastRunAt).toLocaleString()}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={busy !== "" || loadingConfig}
                onClick={saveConfig}
              >
                Save settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== "" || !context.trim()}
                onClick={runNow}
                className="gap-1.5"
              >
                <PlayIcon size={14} />
                {busy === "run" ? "Running…" : "Run now"}
              </Button>
            </div>
          </CardBody>
        </Card>

        {notice ? <p className="text-sm">{notice}</p> : null}

        <div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h3 className="font-semibold tracking-tight">Suggestions</h3>
              <p className="text-muted-foreground text-sm">Approve to publish as Chelaa Bot.</p>
            </div>
            <span className="bg-muted rounded-full px-3 py-1 text-sm tabular-nums">
              {suggestions.length} pending
            </span>
          </div>

          {loadingSuggestions ? (
            <Card><CardBody className="text-muted-foreground text-sm">Loading…</CardBody></Card>
          ) : suggestions.length === 0 ? (
            <Card>
              <CardBody className="text-muted-foreground text-center text-sm">
                No suggestions yet. Save your topics and tap Run now, or wait for the daily run.
              </CardBody>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {suggestions.map((item) => (
                <Card key={item.id}>
                  <CardBody className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{item.kind}</Badge>
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">#{tag}</Badge>
                      ))}
                      <span className="text-muted-foreground ml-auto text-xs">{item.time}</span>
                    </div>
                    <h4 className="font-semibold tracking-tight">{item.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {item.body}
                    </p>
                    {item.rationale ? (
                      <p className="text-brand-content/90 bg-brand/5 rounded-lg px-3 py-2 text-xs">
                        {item.rationale}
                      </p>
                    ) : null}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busy === item.id}
                        onClick={() => review(item.id, "accept")}
                        className="gap-1.5"
                      >
                        <CheckCircleIcon size={14} />
                        Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === item.id}
                        onClick={() => review(item.id, "reject")}
                        className="gap-1.5"
                      >
                        <CloseCircleIcon size={14} />
                        Dismiss
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
