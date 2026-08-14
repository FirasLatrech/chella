"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  TextBoldIcon,
  TextItalicIcon,
  CodeIcon,
  ListIcon,
} from "@solar-icons/react/bold-duotone";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

/*
 * Minimal rich text editor on Tiptap. Deliberately small: bold, italic,
 * inline code and bullet lists — enough structure for community posts without
 * turning the composer into a word processor. Markdown shortcuts (`**`, `-`,
 * backticks) come free with StarterKit.
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
  initialText,
  className,
}: {
  placeholder?: string;
  /** Fires with the plain-text content on every change. */
  onTextChange?: (text: string) => void;
  /** Prefill (e.g. a restored draft). Plain text; newlines become breaks. */
  initialText?: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder })],
    content: initialText
      ? `<p>${escapeHtml(initialText).replaceAll("\n", "<br>")}</p>`
      : undefined,
    onCreate: ({ editor }) => onTextChange?.(editor.getText()),
    // Rendered inside a client island; SSR rendering would only risk
    // hydration mismatch warnings.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap min-h-20 px-3 py-2.5 text-sm outline-none",
      },
    },
    onUpdate: ({ editor }) => onTextChange?.(editor.getText()),
  });

  // Tiptap v3 opts out of per-transaction re-renders; subscribe explicitly to
  // the marks the toolbar reflects.
  const marks = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            code: e.isActive("code"),
            bullet: e.isActive("bulletList"),
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
      key: "bullet",
      icon: ListIcon,
      label: "Bullet list",
      active: marks?.bullet ?? false,
      run: () => editor.chain().focus().toggleBulletList().run(),
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
