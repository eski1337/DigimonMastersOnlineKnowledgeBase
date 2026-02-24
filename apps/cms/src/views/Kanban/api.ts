import { Task, TaskComment } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function fetchTasks(): Promise<Task[]> {
  const data = await request<{ docs: Task[] }>(
    `${API_BASE}/tasks?limit=500&sort=sortOrder&depth=1`
  );
  return data.docs;
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const data = await request<{ doc: Task }>(`${API_BASE}/tasks`, {
    method: 'POST',
    body: JSON.stringify(task),
  });
  return data.doc;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const data = await request<{ doc: Task }>(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.doc;
}

export async function deleteTask(id: string): Promise<void> {
  await request(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
}

export async function fetchComments(taskId: string): Promise<TaskComment[]> {
  const data = await request<{ docs: TaskComment[] }>(
    `${API_BASE}/task-comments?where[task][equals]=${taskId}&sort=-createdAt&depth=1&limit=100`
  );
  return data.docs;
}

export async function createComment(taskId: string, body: string): Promise<TaskComment> {
  const data = await request<{ doc: TaskComment }>(`${API_BASE}/task-comments`, {
    method: 'POST',
    body: JSON.stringify({ task: taskId, body }),
  });
  return data.doc;
}

export async function fetchUsers(): Promise<{ id: string; name?: string; email: string; username?: string; role: string }[]> {
  const data = await request<{ docs: any[] }>(
    `${API_BASE}/users?where[role][in]=editor,admin,owner&limit=100&depth=0`
  );
  return data.docs;
}
