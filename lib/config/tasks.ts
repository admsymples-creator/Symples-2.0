/**
 * Configuração centralizada de Status e Cores das Tarefas
 * 
 * Este arquivo centraliza toda a lógica de mapeamento entre:
 * - Status do banco de dados (todo, in_progress, done, archived)
 * - Labels da UI (Backlog, Execução, Revisão, etc.)
 * - Cores e estilos visuais
 */

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  CORRECTION: 'correction',
  BLOCKED: 'blocked',
  DONE: 'done',
  ARCHIVED: 'archived',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

export interface TaskStatusConfig {
  label: string;
  color: string; // Cor do dot/ícone (fill-*, text-*, bg-*)
  lightColor: string; // Cor do fundo do badge (bg-* text-*)
  icon?: string; // Ícone opcional
}

export const TASK_CONFIG: Record<string, TaskStatusConfig> = {
  [TASK_STATUS.TODO]: { 
    label: 'Não iniciado',
    color: 'fill-gray-500',
    lightColor: 'bg-gray-100 text-gray-600',
  },
  [TASK_STATUS.IN_PROGRESS]: { 
    label: 'Em progresso',
    color: 'fill-amber-500',
    lightColor: 'bg-amber-100 text-amber-700',
  },
  [TASK_STATUS.REVIEW]: { 
    label: 'Revisão',
    color: 'fill-blue-500',
    lightColor: 'bg-blue-100 text-blue-700',
  },
  [TASK_STATUS.CORRECTION]: { 
    label: 'Correção',
    color: 'fill-orange-500',
    lightColor: 'bg-orange-100 text-orange-700',
  },
  [TASK_STATUS.BLOCKED]: { 
    label: 'Bloqueado',
    color: 'fill-red-500',
    lightColor: 'bg-red-100 text-red-700',
  },
  [TASK_STATUS.DONE]: { 
    label: 'Concluido',
    color: 'fill-green-500',
    lightColor: 'bg-green-100 text-green-700',
  },
  [TASK_STATUS.ARCHIVED]: { 
    label: 'Arquivado',
    color: 'fill-gray-400',
    lightColor: 'bg-gray-100 text-gray-500',
  },
};

// Helper para pegar array de status na ordem correta (para o Kanban)
export const ORDERED_STATUSES: TaskStatus[] = [
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.REVIEW,
  TASK_STATUS.BLOCKED,
  TASK_STATUS.DONE,
];

// Mapeamento reverso: Label da UI -> Status do banco
export const LABEL_TO_STATUS: Record<string, TaskStatus> = {
  'Não iniciado': TASK_STATUS.TODO,
  'Em progresso': TASK_STATUS.IN_PROGRESS,
  'Revisão': TASK_STATUS.REVIEW,
  'Correção': TASK_STATUS.CORRECTION,
  'Bloqueado': TASK_STATUS.BLOCKED,
  'Concluido': TASK_STATUS.DONE,
  'Arquivado': TASK_STATUS.ARCHIVED,
  // Aliases para compatibilidade
  'Backlog': TASK_STATUS.TODO,
  'Não iniciada': TASK_STATUS.TODO,
  'Execução': TASK_STATUS.IN_PROGRESS,
  'Finalizado': TASK_STATUS.DONE,
};

// Mapeamento: Status do banco -> Label da UI
export const STATUS_TO_LABEL: Record<TaskStatus, string> = {
  [TASK_STATUS.TODO]: 'Não iniciado',
  [TASK_STATUS.IN_PROGRESS]: 'Em progresso',
  [TASK_STATUS.REVIEW]: 'Revisão',
  [TASK_STATUS.CORRECTION]: 'Correção',
  [TASK_STATUS.BLOCKED]: 'Bloqueado',
  [TASK_STATUS.DONE]: 'Concluido',
  [TASK_STATUS.ARCHIVED]: 'Arquivado',
};

// Helper para obter configuração de um status
export function getTaskStatusConfig(status: string): TaskStatusConfig {
  const dbStatus = LABEL_TO_STATUS[status] || status as TaskStatus;
  return TASK_CONFIG[dbStatus] || TASK_CONFIG[TASK_STATUS.TODO];
}

// Helper para obter apenas o label do status (sem cores)
export function getTaskStatusLabel(status: string): string {
  const config = getTaskStatusConfig(status);
  return config.label;
}

// Helper para mapear status do banco para label da UI
export function mapStatusToLabel(status: TaskStatus | string): string {
  if (status in STATUS_TO_LABEL) {
    return STATUS_TO_LABEL[status as TaskStatus];
  }
  // Se for um label customizado, retornar como está
  return status;
}

// Helper para mapear label da UI para status do banco
export function mapLabelToStatus(label: string): TaskStatus {
  return LABEL_TO_STATUS[label] || TASK_STATUS.TODO;
}
