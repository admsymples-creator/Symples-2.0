/**
 * Tipos compartilhados para TaskDetailModal e subcomponentes.
 * Centralizar aqui evita duplicação e facilita refatoração.
 */

export type TaskStatus = "todo" | "in_progress" | "done" | "review";

export interface SubTask {
    id: string;
    title: string;
    completed: boolean;
    assignee_id?: string | null;
    assignee?: {
        id?: string;
        name: string;
        avatar?: string;
    } | null;
}

export interface Activity {
    id: string;
    type: "created" | "commented" | "updated" | "file_shared" | "audio" | "origin";
    user: string;
    message?: string;
    timestamp: string;
    file?: {
        name: string;
        type: "image" | "pdf" | "other";
        size: string;
    };
    attachedFiles?: Array<{
        name: string;
        type: "image" | "pdf" | "other";
        size: string;
    }>;
    audio?: {
        url?: string;
        duration?: number;
        transcription?: string;
    };
    origin?: {
        source: "whatsapp" | "web";
        content?: string;
    };
    isCurrentUser?: boolean;
    edited?: boolean;
    deleted?: boolean;
    editedAt?: string;
    deletedAt?: string;
}

export interface FileAttachment {
    id: string;
    name: string;
    type: "image" | "pdf" | "other";
    size: string;
    url?: string;
}

export interface TaskPayment {
    id: string;
    amount: number;
    status: "paid" | "pending" | "scheduled" | "cancelled";
    type: "income" | "expense";
    description: string;
    due_date?: string | null;
    created_at?: string | null;
    counterparty_name?: string | null;
    client_name?: string | null;
}

export interface TaskDetailTaskProp {
    id: string;
    title: string;
    description: string;
    status: "todo" | "in_progress" | "done";
    assignee?: { name: string; avatar?: string };
    dueDate?: string;
    tags?: string[];
    breadcrumbs: string[];
    workspaceId?: string | null;
    originContext?: string;
    contextMessage?: {
        type: "audio" | "text";
        content: string;
        timestamp: string;
    };
    subTasks: SubTask[];
    activities: Activity[];
    attachments?: FileAttachment[];
}

export type SaveState = "idle" | "saving" | "saved" | "error";
