import type { JSONContent } from "@tiptap/react";
import type { Block } from "@/lib/content";

/*
 * Tiptap document → our stored Block[] shape.
 *
 * Blocks are persisted as jsonb and rendered to every reader, so this is a
 * deliberate whitelist: only the node types below survive, and each carries
 * plain text, never HTML. The API re-validates the same way — this function
 * is a convenience, not a security boundary.
 */

/** Concatenates a node's text content, ignoring marks (bold/italic/etc). */
function textOf(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(textOf).join("");
}

/** Every list item's text, one entry per item. */
function itemsOf(node: JSONContent): string[] {
  return (node.content ?? [])
    .map((item) => textOf(item).trim())
    .filter((text) => text.length > 0);
}

export function docToBlocks(doc: JSONContent | undefined): Block[] {
  const blocks: Block[] = [];

  for (const node of doc?.content ?? []) {
    switch (node.type) {
      case "paragraph": {
        const text = textOf(node).trim();
        if (text) blocks.push({ type: "p", text });
        break;
      }
      case "heading": {
        const text = textOf(node).trim();
        // Only two heading levels — a community post isn't a document.
        const level = node.attrs?.level === 1 ? 1 : 2;
        if (text) blocks.push({ type: "heading", level, text });
        break;
      }
      case "codeBlock": {
        const code = textOf(node);
        if (code.trim()) {
          blocks.push({
            type: "code",
            code,
            lang:
              typeof node.attrs?.language === "string"
                ? node.attrs.language
                : undefined,
          });
        }
        break;
      }
      case "bulletList":
      case "orderedList": {
        const items = itemsOf(node);
        if (items.length) {
          blocks.push({
            type: "list",
            items,
            ordered: node.type === "orderedList" || undefined,
          });
        }
        break;
      }
      case "blockquote": {
        const text = textOf(node).trim();
        if (text) blocks.push({ type: "quote", text });
        break;
      }
      // Anything else (images, tables, unknown nodes) is dropped rather than
      // stored as an unrenderable block.
    }
  }

  return blocks;
}

/** Flattens blocks back to plain text — used for excerpts and drafts. */
export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "p":
        case "quote":
          return block.text;
        case "heading":
          return block.text;
        case "code":
          return block.code;
        case "list":
          return block.items.join("\n");
      }
    })
    .join("\n\n");
}

/** Blocks → a Tiptap document, for prefilling the editor when editing. */
export function blocksToDoc(blocks: Block[]): JSONContent {
  const text = (value: string) =>
    value ? [{ type: "text", text: value }] : undefined;

  return {
    type: "doc",
    content: blocks.map((block): JSONContent => {
      switch (block.type) {
        case "heading":
          return {
            type: "heading",
            attrs: { level: block.level },
            content: text(block.text),
          };
        case "code":
          return {
            type: "codeBlock",
            attrs: { language: block.lang ?? null },
            content: text(block.code),
          };
        case "list":
          return {
            type: block.ordered ? "orderedList" : "bulletList",
            content: block.items.map((item) => ({
              type: "listItem",
              content: [{ type: "paragraph", content: text(item) }],
            })),
          };
        case "quote":
          return {
            type: "blockquote",
            content: [{ type: "paragraph", content: text(block.text) }],
          };
        case "p":
        default:
          return { type: "paragraph", content: text(block.text) };
      }
    }),
  };
}
