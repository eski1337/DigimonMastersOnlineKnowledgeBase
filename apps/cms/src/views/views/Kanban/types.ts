export interface TaskUser {
  id: string;
  name?: string;
  email: string;
  username?: string;
}

export interface TaskComment {
  id: string;
  body: string;
  author: TaskUser | string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: TaskUser | string | null;
  dueDate?: string | null;
  tags?: { tag: string; id?: string }[];
  sortOrder: number;
  createdBy?: TaskUser | string | null;
  updatedBy?: TaskUser | string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Column {
  id: TaskStatus;
  label: string;
  color: string;
}

export const COLUMNS: Column[] = [
  { id: 'backlog', label: 'Backlog', color: '#6b7280' },
  { id: 'todo', label: 'Todo', color: '#3b82f6' },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'review', label: 'Review', color: '#a855f7' },
  { id: 'done', label: 'Done', color: '#22c55e' },
];

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; emoji: string }> = {
  critical: { label: 'Critical', color: '#ef4444', emoji: '🔴' },
  high: { label: 'High', color: '#f97316', emoji: '🟠' },
  medium: { label: 'Medium', color: '#3b82f6', emoji: '🔵' },
  low: { label: 'Low', color: '#6b7280', emoji: '⚪' },
};

export function getUserDisplay(user: TaskUser | string | null | undefined): string {
  if (!user) return 'Unassigned';
  if (typeof user === 'string') return user;
  return user.name || user.username || user.email.split('@')[0];
}
