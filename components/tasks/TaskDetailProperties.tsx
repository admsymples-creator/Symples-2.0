"use client";

import { memo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { TaskMembersPicker } from "@/components/tasks/pickers/TaskMembersPicker";
import { TaskDatePicker } from "@/components/tasks/pickers/TaskDatePicker";
import {
    mapStatusToLabel,
    STATUS_TO_LABEL,
    ORDERED_STATUSES,
    TASK_CONFIG,
    TASK_STATUS,
    TaskStatus,
} from "@/lib/config/tasks";
import { cn } from "@/lib/utils";

interface Member {
    id: string;
    name: string;
    avatar?: string;
}

interface TaskDetailPropertiesProps {
    status: TaskStatus;
    onStatusChange: (status: string) => void;
    tags: string[];
    availableTags: string[];
    onTagsChange: (newTags: string[]) => void;
    localMembers: Member[];
    onMembersChange: (memberIds: string[]) => void;
    availableUsers: Member[];
    workspaceId: string | null;
    dueDate: Date | null;
    onDueDateChange: (date: Date | null) => void;
}

function TaskDetailPropertiesComponent({
    status,
    onStatusChange,
    tags,
    availableTags,
    onTagsChange,
    localMembers,
    onMembersChange,
    availableUsers,
    workspaceId,
    dueDate,
    onDueDateChange,
}: TaskDetailPropertiesProps) {
    return (
        <div className="grid grid-cols-4 gap-4 mb-8 items-start">
            {/* Status */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Status</label>
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 text-sm hover:bg-gray-100 p-1.5 -ml-1.5 rounded transition-colors w-fit">
                            <Badge
                                variant="secondary"
                                className={cn("pointer-events-none font-normal px-2 py-0.5", TASK_CONFIG[status]?.lightColor)}
                            >
                                {mapStatusToLabel(status)}
                            </Badge>
                            <ChevronDown className="h-3 w-3 text-gray-400" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="start">
                        <div className="flex flex-col gap-0.5">
                            {ORDERED_STATUSES.map((s) => (
                                <button
                                    key={s}
                                    className={cn(
                                        "text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors flex items-center justify-between",
                                        status === s && "bg-gray-50 font-medium"
                                    )}
                                    onClick={() => onStatusChange(s)}
                                >
                                    <span>{STATUS_TO_LABEL[s]}</span>
                                    {status === s && <Check className="h-3 w-3 text-green-600" />}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Projeto */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Projeto</label>
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 text-sm hover:bg-gray-100 p-1.5 -ml-1.5 rounded transition-colors w-fit">
                            <Badge
                                variant="outline"
                                className="pointer-events-none font-normal px-2 py-0.5 text-gray-600"
                            >
                                {tags.length > 0 ? tags[0] : "Sem projeto"}
                            </Badge>
                            <ChevronDown className="h-3 w-3 text-gray-400" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="start">
                        <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
                            <button
                                className={cn(
                                    "text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors flex items-center justify-between",
                                    tags.length === 0 && "bg-gray-50 font-medium"
                                )}
                                onClick={() => onTagsChange([])}
                            >
                                <span className="text-gray-400">Sem projeto</span>
                                {tags.length === 0 && <Check className="h-3 w-3 text-green-600" />}
                            </button>
                            {availableTags.map((tag) => {
                                const isSelected = tags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        className={cn(
                                            "text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors flex items-center justify-between",
                                            isSelected && "bg-gray-50 font-medium"
                                        )}
                                        onClick={() => onTagsChange(isSelected ? [] : [tag])}
                                    >
                                        <span>{tag}</span>
                                        {isSelected && <Check className="h-3 w-3 text-green-600" />}
                                    </button>
                                );
                            })}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Assignee */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Responsável</label>
                <TaskMembersPicker
                    memberIds={localMembers.map((m) => m.id)}
                    onChange={onMembersChange}
                    members={availableUsers}
                    workspaceId={workspaceId || undefined}
                />
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Entrega</label>
                <TaskDatePicker
                    date={dueDate}
                    onSelect={onDueDateChange}
                    align="start"
                    isCompleted={status === TASK_STATUS.DONE}
                />
            </div>
        </div>
    );
}

export const TaskDetailProperties = memo(TaskDetailPropertiesComponent);
