import { cn } from "@/lib/utils";
import type { Block } from "@/lib/content";

/*
 * Renders one stored body block. The block set is a closed whitelist (see
 * lib/content.ts) and every field is plain text, so nothing here interpolates
 * markup — structure comes from the block type, never from the content.
 */
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-foreground/90 text-sm leading-relaxed text-pretty">
          {block.text}
        </p>
      );

    case "heading":
      return block.level === 1 ? (
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-balance">
          {block.text}
        </h2>
      ) : (
        <h3 className="mt-1 text-sm font-semibold tracking-tight text-balance">
          {block.text}
        </h3>
      );

    case "code":
      return (
        <pre className="bg-muted/60 ring-border-surface overflow-x-auto rounded-xl p-3.5 ring-[0.5px]">
          <code className="font-mono text-xs leading-relaxed">{block.code}</code>
        </pre>
      );

    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag
          className={cn(
            "text-foreground/90 flex flex-col gap-1.5 pl-5 text-sm leading-relaxed",
            block.ordered ? "list-decimal" : "list-disc",
          )}
        >
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ListTag>
      );
    }

    case "quote":
      return (
        <blockquote className="border-brand/40 text-muted-foreground border-l-2 pl-3 text-sm leading-relaxed italic">
          {block.text}
        </blockquote>
      );
  }
}
