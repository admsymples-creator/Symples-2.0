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
  DONE: 'done',
  ARCHIVED: 'archived',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

export interface TaskStatusConfig {
  label: string;
  color: string; // Cor da barra lateral/borda
  lightColor: string; // Cor do Badge/Fundo
  icon?: string; // Ícone opcional
}

export const TASK_CONFIG: Record<string, TaskStatusConfig> = {
  [TASK_STATUS.TODO]: { 
    label: 'Backlog', 
    color: 'bg-slate-500', // Cor da barra lateral
    lightColor: 'bg-slate-100 text-slate-600' // Cor do Badge/Fundo
  },
  [TASK_STATUS.IN_PROGRESS]: { 
    label: 'Execução', 
    color: 'bg-blue-500', 
    lightColor: 'bg-blue-50 text-blue-700' 
  },
  [TASK_STATUS.DONE]: { 
    label: 'Revisão', 
    color: 'bg-green-500', 
    lightColor: 'bg-green-50 text-green-700' 
  },
  [TASK_STATUS.ARCHIVED]: { 
    label: 'Arquivado', 
    color: 'bg-gray-500', 
    lightColor: 'bg-gray-50 text-gray-700' 
  },
};

// Helper para pegar array de status na ordem correta (para o Kanban)
export const ORDERED_STATUSES: TaskStatus[] = [
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.DONE,
  TASK_STATUS.ARCHIVED,
];

// Mapeamento reverso: Label da UI -> Status do banco
export const LABEL_TO_STATUS: Record<string, TaskStatus> = {
  'Backlog': TASK_STATUS.TODO,
  'Execução': TASK_STATUS.IN_PROGRESS,
  'Revisão': TASK_STATUS.DONE,
  'Arquivado': TASK_STATUS.ARCHIVED,
  // Aliases
  'Triagem': TASK_STATUS.IN_PROGRESS,
  'Finalizado': TASK_STATUS.DONE,
  'Não iniciado': TASK_STATUS.TODO,
};

// Mapeamento: Status do banco -> Label da UI
export const STATUS_TO_LABEL: Record<TaskStatus, string> = {
  [TASK_STATUS.TODO]: 'Backlog',
  [TASK_STATUS.IN_PROGRESS]: 'Execução',
  [TASK_STATUS.DONE]: 'Revisão',
  [TASK_STATUS.ARCHIVED]: 'Arquivado',
};

// Helper para obter configuração de um status
export function getTaskStatusConfig(status: string): TaskStatusConfig {
  const dbStatus = LABEL_TO_STATUS[status] || status as TaskStatus;
  return TASK_CONFIG[dbStatus] || TASK_CONFIG[TASK_STATUS.TODO];
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

