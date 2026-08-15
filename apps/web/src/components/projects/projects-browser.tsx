"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { ProjectCard, type ProjectCardModel } from "./project-card";
import { useFeed, useInfinitePosts } from "@/lib/queries";

type Sort = "top" | "new" | "views";

const SORTS = [
  { value: "top" as Sort, label: "Top voted" },
  { value: "new" as Sort, label: "Newest" },
  { value: "views" as Sort, label: "Most viewed" },
];

/** The params for a given browse state — shared with the page's prefetch. */
export function projectSearchParams(q: string, tag: string, sort: Sort) {
  return {
    kind: "project",
    q,
    tag: tag === "all" ? "" : tag,
    sort,
  };
}

/*
 * Server-driven browse: search, tag filter and sort all execute in the API
 * (SQL), debounced — the client only renders what comes back.
 */
export function ProjectsBrowser() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<Sort>("top");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const params = useMemo(
    () => projectSearchParams(debounced, tag, sort),
    [debounced, tag, sort],
  );
  const { data, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfinitePosts(params);

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  // The grid loads more when the sentinel below it scrolls into view. Cards
  // are a wrapping grid rather than a uniform list, so this pages without
  // virtualizing — the DOM stays bounded by how far the user scrolls.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const visible: ProjectCardModel[] = useMemo(
    () =>
      entries.map((e) => ({
        id: e.id,
        title: e.title,
        excerpt: e.excerpt,
        author: e.author,
        tags: e.tags,
        votes: e.votes,
        views: e.views,
        comments: e.replies,
        myVote: e.myVote ?? 0,
      })),
    [entries],
  );

  // Tag options come from the cached full feed, so the dropdown doesn't
  // shrink to only the tags matching the current search.
  const { data: feed } = useFeed();
  const tagOptions = useMemo(() => {
    const unique = [
      ...new Set(
        (feed ?? [])
          .filter((e) => e.kind === "project")
          .flatMap((e) => e.tags),
      ),
    ].sort();
    return [
      { value: "all", label: "All tags" },
      ...unique.map((t) => ({ value: t, label: t })),
    ];
  }, [feed]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 pt-1 pb-4 md:px-5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search projects…"
          size="sm"
          className="w-full max-w-xs"
        />
        {/* Quiet in-flight signal while the API searches. */}
        <span
          aria-hidden="true"
          className={`bg-brand size-1.5 rounded-full transition-opacity duration-200 ${
            isFetching ? "animate-pulse opacity-100" : "opacity-0"
          }`}
        />

        <div className="ml-auto flex items-center gap-2">
          <div className="w-36">
            <Select value={tag} onChange={setTag} options={tagOptions} size="sm" />
          </div>
          <div className="w-36">
            <Select value={sort} onChange={setSort} options={SORTS} size="sm" />
          </div>
        </div>
      </div>

      <div className="grid w-full gap-3 px-3 pb-10 md:px-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((project) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div ref={sentinelRef} className="h-px w-full" />
      {isFetchingNextPage ? (
        <p className="text-muted-foreground pb-8 text-center text-xs">
          Loading more…
        </p>
      ) : null}

      {visible.length === 0 && !isFetching ? (
        <p className="text-muted-foreground px-3 pb-10 md:px-5 text-center text-sm">
          No projects match — try a different search or tag.
        </p>
      ) : null}
    </>
  );
}
