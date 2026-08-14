"use client";

import {
  EditorContent,
  useEditor,
  useEditorState,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  TextBoldIcon,
  TextItalicIcon,
  TextFormatIcon,
  CodeIcon,
  CodeSquareIcon,
  ListIcon,
  ListArrowDownIcon,
} from "@solar-icons/react/bold-duotone";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { docToBlocks } from "@/lib/blocks";
import type { Block } from "@/lib/content";

/*
 * Minimal rich text editor on Tiptap. Deliberately small: headings, bold,
 * italic, code (inline and block) and lists — enough structure for community
 * posts without turning the composer into a word processor. Markdown
 * shortcuts (`##`, `**`, `-`, ```) come free with StarterKit.
 *
 * The editor reports BOTH plain text (drafts, validation) and structured
 * blocks (what gets stored) — see lib/blocks.ts for the whitelist.
 */
function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function RichEditor({
  placeholder = "Write…",
  onTextChange,
  onBlocksChange,
  initialText,
  initialDoc,
  className,
}: {
  placeholder?: string;
  /** Fires with the plain-text content on every change. */
  onTextChange?: (text: string) => void;
  /** Fires with the structured blocks that will be stored. */
  onBlocksChange?: (blocks: Block[]) => void;
  /** Prefill (e.g. a restored draft). Plain text; newlines become breaks. */
  initialText?: string;
  /** Prefill with structured content (editing an existing post). Wins over
   *  initialText when both are given. */
  initialDoc?: JSONContent;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder })],
    content:
      initialDoc ??
      (initialText
        ? `<p>${escapeHtml(initialText).replaceAll("\n", "<br>")}</p>`
        : undefined),
    onCreate: ({ editor }) => {
      onTextChange?.(editor.getText());
      onBlocksChange?.(docToBlocks(editor.getJSON()));
    },
    // Rendered inside a client island; SSR rendering would only risk
    // hydration mismatch warnings.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap min-h-20 px-3 py-2.5 text-sm outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onTextChange?.(editor.getText());
      onBlocksChange?.(docToBlocks(editor.getJSON()));
    },
  });

  // Tiptap v3 opts out of per-transaction re-renders; subscribe explicitly to
  // the marks the toolbar reflects.
  const marks = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            heading: e.isActive("heading", { level: 2 }),
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            code: e.isActive("code"),
            codeBlock: e.isActive("codeBlock"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
          }
        : null,
  });

  if (!editor) return <div className={cn("min-h-20", className)} />;

  const actions: {
    key: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    label: string;
    active: boolean;
    run: () => void;
  }[] = [
    {
      key: "heading",
      icon: TextFormatIcon,
      label: "Heading",
      active: marks?.heading ?? false,
      run: () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: "bold",
      icon: TextBoldIcon,
      label: "Bold",
      active: marks?.bold ?? false,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      key: "italic",
      icon: TextItalicIcon,
      label: "Italic",
      active: marks?.italic ?? false,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      key: "code",
      icon: CodeIcon,
      label: "Inline code",
      active: marks?.code ?? false,
      run: () => editor.chain().focus().toggleCode().run(),
    },
    {
      key: "codeBlock",
      icon: CodeSquareIcon,
      label: "Code block",
      active: marks?.codeBlock ?? false,
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      key: "bullet",
      icon: ListIcon,
      label: "Bullet list",
      active: marks?.bullet ?? false,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: "ordered",
      icon: ListArrowDownIcon,
      label: "Numbered list",
      active: marks?.ordered ?? false,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className={className}>
      <div className="flex items-center gap-0.5 px-2 pt-1.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              aria-label={action.label}
              aria-pressed={action.active}
              // Preserve the text selection — a mousedown would blur the editor.
              onMouseDown={(e) => e.preventDefault()}
              onClick={action.run}
              className={cn(
                "grid size-7 cursor-pointer place-items-center rounded-md transition-colors",
                action.active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
              )}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
