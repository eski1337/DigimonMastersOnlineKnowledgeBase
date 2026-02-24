import React, { useState } from 'react';
import { TaskStatus, TaskUser, COLUMNS } from '../types';

interface QuickAddProps {
  users: TaskUser[];
  onAdd: (title: string, status: TaskStatus, assigneeId?: string) => Promise<void>;
}

const QuickAdd: React.FC<QuickAddProps> = ({ users, onAdd }) => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [assignee, setAssignee] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onAdd(title.trim(), status, assignee || undefined);
      setTitle('');
      setAssignee('');
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="kanban-quick-add">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New task title..."
        className="kanban-quick-add__input"
        disabled={loading}
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as TaskStatus)}
        className="kanban-quick-add__select"
        disabled={loading}
      >
        {COLUMNS.map((col) => (
          <option key={col.id} value={col.id}>{col.label}</option>
        ))}
      </select>
      <select
        value={assignee}
        onChange={(e) => setAssignee(e.target.value)}
        className="kanban-quick-add__select"
        disabled={loading}
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name || u.username || u.email.split('@')[0]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="kanban-quick-add__btn"
        disabled={loading || !title.trim()}
      >
        {loading ? 'Adding...' : '+ Add Task'}
      </button>
    </form>
  );
};

export default QuickAdd;
