"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered,
  Code,
  Quote,
  Undo,
  Redo
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  onBlur?: () => void;
}

export function Editor({ 
  value, 
  onChange, 
  placeholder = "Digite aqui...", 
  editable = true,
  className,
  onBlur
}: EditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: "list-disc pl-5 my-2 space-y-1",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal pl-5 my-2 space-y-1",
          },
        },
        blockquote: {
          HTMLAttributes: {
            class:
              "border-l-4 border-gray-200 pl-3 italic text-gray-700 my-2 py-1",
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class:
              "rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs",
          },
        },
        code: {
          HTMLAttributes: {
            class:
              "rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-800",
          },
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "is-editor-empty before:absolute before:top-2.5 before:left-3 before:content-[attr(data-placeholder)] before:text-gray-400 before:text-sm before:pointer-events-none before:select-none before:transition-opacity focus-within:before:hidden",
      }),
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          "relative min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 prose prose-sm max-w-none outline-none",
          className
        ),
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col border border-gray-200 rounded-md overflow-hidden focus-within:ring-0 focus-within:outline-none bg-white">
      {editable && (
        <div className="flex items-center gap-1 p-1 bg-gray-50 border-b border-gray-200 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            icon={<Bold className="h-4 w-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            icon={<Italic className="h-4 w-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            icon={<UnderlineIcon className="h-4 w-4" />}
          />
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            icon={<List className="h-4 w-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            icon={<ListOrdered className="h-4 w-4" />}
          />
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            icon={<Code className="h-4 w-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            icon={<Quote className="h-4 w-4" />}
          />
          <div className="flex-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            icon={<Undo className="h-4 w-4" />}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            icon={<Redo className="h-4 w-4" />}
          />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({ onClick, active, disabled, icon }: any) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", active && "bg-gray-200 text-gray-900")}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </Button>
  );
}

