"use client";

import { Dialog, DialogPanel } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MagnifierIcon,
  QuestionCircleIcon,
  FolderWithFilesIcon,
  DocumentTextIcon,
  HashtagIcon,
} from "@solar-icons/react/bold-duotone";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/format";
import { queryKeys } from "@/lib/keys";
import type { FeedEntry } from "@/components/dashboard/feed-item";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4120";

interface SearchResults {
  posts: FeedEntry[];
  people: { handle: string; name: string; tags: string[]; reputation: number }[];
  tags: { name: string; posts: number }[];
}

const KIND_ICON = {
  question: QuestionCircleIcon,
  project: FolderWithFilesIcon,
  post: DocumentTextIcon,
};

/*
 * Jump-to search across posts, people and tags.
 *
 * Opens with ⌘K / Ctrl+K or the header button. Results are flattened into a
 * single keyboard-navigable list — arrow keys move through everything, so a
 * person and a tag are reachable with the same muscle memory as a post.
 */
export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data } = useQuery({
    queryKey: queryKeys.universalSearch(debounced),
    queryFn: async (): Promise<SearchResults> => {
      const res = await fetch(
        `${API_URL}/api/search?q=${encodeURIComponent(debounced)}`,
        { credentials: "include" },
      );
      if (!res.ok) return { posts: [], people: [], tags: [] };
      return res.json();
    },
    enabled: open && debounced.length > 0,
  });

  // One flat list so arrow keys cross section boundaries naturally.
  const items = [
    ...(data?.people ?? []).map((p) => ({
      key: `person-${p.handle}`,
      href: `/people/${p.handle}`,
      section: "People",
      node: (
        <>
          <Avatar seed={p.handle} size="xs" />
          <span className="min-w-0 flex-1 truncate">
            {p.name}
            <span className="text-muted-foreground"> @{p.handle}</span>
          </span>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatPoints(p.reputation)}
          </span>
        </>
      ),
    })),
    ...(data?.posts ?? []).map((post) => {
      const Icon = KIND_ICON[post.kind] ?? DocumentTextIcon;
      return {
        key: `post-${post.id}`,
        href: `/post/${post.id}`,
        section: "Posts",
        node: (
          <>
            <Icon size={15} className="text-muted-foreground shrink-0" />
            <span className="min-w-0 flex-1 truncate">{post.title}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              @{post.author}
            </span>
          </>
        ),
      };
    }),
    ...(data?.tags ?? []).map((t) => ({
      key: `tag-${t.name}`,
      href: `/projects?tag=${encodeURIComponent(t.name)}`,
      section: "Tags",
      node: (
        <>
          <HashtagIcon size={15} className="text-muted-foreground shrink-0" />
          <span className="min-w-0 flex-1 truncate">{t.name}</span>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {t.posts} {t.posts === 1 ? "post" : "posts"}
          </span>
        </>
      ),
    })),
  ];

  const clampedActive = Math.min(active, Math.max(0, items.length - 1));

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setActive(0);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className={cn(
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          "flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 transition-colors",
        )}
      >
        <MagnifierIcon size={17} />
        <span className="hidden text-xs lg:inline">Search</span>
        <kbd className="ring-border-surface-strong hidden rounded px-1 py-px font-mono text-[10px] ring-[0.5px] lg:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
        <div className="fixed inset-0 flex items-start justify-center p-4 pt-[12vh]">
          <DialogPanel
            className={cn(
              "bg-muted/80 ring-border-surface-strong w-full max-w-lg rounded-2xl p-1.5 shadow-xl shadow-black/10 ring-[0.5px]",
              "supports-[backdrop-filter:blur(1px)]:backdrop-blur-xl",
            )}
          >
            <div className="bg-popover ring-border-surface-strong overflow-hidden rounded-xl ring-[0.5px]">
              <div className="flex items-center gap-2.5 px-3.5 py-3">
                <MagnifierIcon size={17} className="text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActive((a) => Math.min(a + 1, items.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActive((a) => Math.max(a - 1, 0));
                    } else if (e.key === "Enter" && items[clampedActive]) {
                      e.preventDefault();
                      go(items[clampedActive].href);
                    }
                  }}
                  placeholder="Search posts, people and tags…"
                  className="placeholder:text-muted-foreground/70 min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>

              {debounced ? (
                <div className="border-border-surface scroll-slim max-h-[52vh] overflow-y-auto border-t-[0.5px] p-1">
                  {items.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-8 text-center text-sm">
                      Nothing matches “{debounced}”.
                    </p>
                  ) : (
                    items.map((item, i) => {
                      const first =
                        i === 0 || items[i - 1].section !== item.section;
                      return (
                        <div key={item.key}>
                          {first ? (
                            <div className="text-muted-foreground px-2.5 pt-2 pb-1 text-[10px] font-medium tracking-wide uppercase">
                              {item.section}
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onMouseEnter={() => setActive(i)}
                            onClick={() => go(item.href)}
                            className={cn(
                              "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                              i === clampedActive
                                ? "bg-accent text-foreground"
                                : "hover:bg-accent/60",
                            )}
                          >
                            {item.node}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground border-border-surface border-t-[0.5px] px-3.5 py-6 text-center text-xs">
                  Search across posts, people and tags.
                </p>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
