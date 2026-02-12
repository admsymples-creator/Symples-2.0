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
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getWorkspaceMembers } from "@/lib/actions/members";
import { Avatar } from "@/components/tasks/Avatar";

export interface MentionMember {
  id: string;
  name: string;
  email: string | null;
  avatar?: string;
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  onBlur?: () => void;
  /** Workspace ID para buscar membros e mostrar sugestões ao digitar @ */
  workspaceId?: string | null;
  /** Lista de membros para menções (opcional; se não passar, busca por workspaceId) */
  mentionMembers?: MentionMember[];
}

export function Editor({ 
  value, 
  onChange, 
  placeholder = "Digite aqui...", 
  editable = true,
  className,
  onBlur,
  workspaceId,
  mentionMembers: mentionMembersProp,
}: EditorProps) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionRange, setMentionRange] = useState<{ from: number; to: number } | null>(null);
  const [mentionCoords, setMentionCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [membersForMentions, setMembersForMentions] = useState<MentionMember[]>([]);
  const skipNextUpdateRef = useRef(false);
  const filteredMentionsRef = useRef<MentionMember[]>([]);
  const selectedMentionIndexRef = useRef(0);
  const mentionRangeRef = useRef<{ from: number; to: number } | null>(null);
  const mentionOpenRef = useRef(false);
  mentionRangeRef.current = mentionRange;
  mentionOpenRef.current = mentionOpen;

  const canShowMentions = editable && (mentionMembersProp !== undefined ? mentionMembersProp.length > 0 : Boolean(workspaceId));

  useEffect(() => {
    if (!workspaceId || mentionMembersProp != null) return;
    getWorkspaceMembers(workspaceId).then((data) => {
      const list: MentionMember[] = (data || []).map((m) => ({
        id: m.user_id,
        name: m.profiles?.full_name ?? "",
        email: m.profiles?.email ?? null,
        avatar: m.profiles?.avatar_url ?? undefined,
      }));
      setMembersForMentions(list);
    });
  }, [workspaceId, mentionMembersProp]);

  const mentionList = mentionMembersProp ?? membersForMentions;
  const filteredMentions = mentionQuery.trim()
    ? mentionList.filter((m) => {
        const q = mentionQuery.toLowerCase();
        const nameMatch = m.name.toLowerCase().includes(q);
        const emailPrefix = m.email ? m.email.split("@")[0]?.toLowerCase() : "";
        const emailMatch = emailPrefix.startsWith(q) || emailPrefix.includes(q);
        return nameMatch || emailMatch;
      })
    : mentionList;
  const clampedIndex = Math.min(Math.max(0, selectedMentionIndex), Math.max(0, filteredMentions.length - 1));
  filteredMentionsRef.current = filteredMentions;
  selectedMentionIndexRef.current = clampedIndex;

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
      setMentionOpen(false);
    },
    editorProps: {
      attributes: {
        class: cn(
          "relative min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 prose prose-sm max-w-none outline-none",
          className
        ),
      },
      handleKeyDown: (view, event) => {
        if (!mentionOpenRef.current) return false;
        const list = filteredMentionsRef.current;
        const idx = selectedMentionIndexRef.current;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedMentionIndex((i) => Math.min(i + 1, list.length - 1));
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedMentionIndex((i) => Math.max(i - 1, 0));
          return true;
        }
        const range = mentionRangeRef.current;
        if (event.key === "Enter" && list.length > 0 && range) {
          event.preventDefault();
          const member = list[idx];
          if (member) {
            const emailPrefix = member.email ? member.email.split("@")[0] : member.name.replace(/\s+/g, ".").toLowerCase();
            skipNextUpdateRef.current = true;
            view.dispatch(
              view.state.tr
                .delete(range.from, range.to)
                .insertText("@" + emailPrefix + " ", range.from)
            );
          }
          setMentionOpen(false);
          setMentionRange(null);
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setMentionOpen(false);
          setMentionRange(null);
          return true;
        }
        return false;
      },
    },
  });

  const insertMention = useCallback(
    (member: MentionMember) => {
      if (!editor || !mentionRange) return;
      const emailPrefix = member.email ? member.email.split("@")[0] : member.name.replace(/\s+/g, ".").toLowerCase();
      skipNextUpdateRef.current = true;
      editor
        .chain()
        .focus()
        .deleteRange({ from: mentionRange.from, to: mentionRange.to })
        .insertContentAt(mentionRange.from, "@" + emailPrefix + " ")
        .run();
      setMentionOpen(false);
      setMentionRange(null);
    },
    [editor, mentionRange]
  );

  useEffect(() => {
    if (!editor || !canShowMentions) return;
    const checkMention = () => {
      queueMicrotask(() => {
        if (skipNextUpdateRef.current) {
          skipNextUpdateRef.current = false;
          return;
        }
        const { state } = editor;
        const { from } = state.selection;
        const doc = state.doc;
        if (from === 0) {
          setMentionOpen(false);
          return;
        }
        let pos = from;
        let mentionFrom = -1;
        while (pos > 0) {
          const char = doc.textBetween(pos - 1, pos);
          if (char === "@") {
            mentionFrom = pos - 1;
            break;
          }
          if (/[\s\n]/.test(char)) break;
          pos--;
        }
        if (mentionFrom === -1) {
          setMentionOpen(false);
          return;
        }
        const query = doc.textBetween(mentionFrom + 1, from);
        setMentionRange({ from: mentionFrom, to: from });
        setMentionQuery(query);
        setSelectedMentionIndex(0);
        try {
          const coords = editor.view.coordsAtPos(mentionFrom);
          setMentionCoords({ top: coords.bottom, left: coords.left });
        } catch {
          setMentionCoords({ top: 0, left: 0 });
        }
        setMentionOpen(true);
      });
    };
    editor.on("update", checkMention);
    editor.on("selectionUpdate", checkMention);
    return () => {
      editor.off("update", checkMention);
      editor.off("selectionUpdate", checkMention);
    };
  }, [editor, canShowMentions]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col border border-gray-200 rounded-md overflow-visible focus-within:ring-0 focus-within:outline-none bg-white relative">
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
      {mentionOpen && canShowMentions && typeof document !== "undefined" && createPortal(
        <div
          className="z-[9999] min-w-[200px] max-w-[280px] max-h-[220px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1"
          style={{
            position: "fixed",
            top: mentionCoords.top + 4,
            left: mentionCoords.left,
          }}
          role="listbox"
        >
          {filteredMentions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              {mentionList.length === 0 ? "Carregando membros..." : "Nenhum membro encontrado"}
            </div>
          ) : (
            filteredMentions.map((member, i) => {
              const emailPrefix = member.email ? member.email.split("@")[0] : member.name.replace(/\s+/g, ".").toLowerCase();
              return (
                <button
                  key={member.id}
                  type="button"
                  role="option"
                  aria-selected={i === clampedIndex}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    i === clampedIndex ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(member);
                  }}
                >
                  <Avatar name={member.name} avatar={member.avatar} size="sm" className="size-6 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{member.name || member.email || "Sem nome"}</span>
                    {member.email && (
                      <span className="text-xs text-gray-500 truncate">@{emailPrefix}</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>,
        document.body
      )}
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

