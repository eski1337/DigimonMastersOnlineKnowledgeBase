import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskComment, TaskUser, TaskStatus, TaskPriority, COLUMNS, PRIORITY_CONFIG, getUserDisplay } from '../types';
import { updateTask, deleteTask, fetchComments, createComment } from '../api';

interface TaskDetailProps {
  task: Task;
  users: TaskUser[];
  onClose: () => void;
  onUpdate: (updated: Task) => void;
  onDelete: (id: string) => void;
  canDelete?: boolean;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, users, onClose, onUpdate, onDelete, canDelete = false }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assignee, setAssignee] = useState(typeof task.assignee === 'object' && task.assignee ? task.assignee.id : (task.assignee as string) || '');
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
  const [tags, setTags] = useState(task.tags?.map(t => t.tag).join(', ') || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);

  const loadComments = useCallback(async () => {
    try {
      const data = await fetchComments(task.id);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [task.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => ({ tag }));
      const updated = await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        assignee: assignee || null,
        dueDate: dueDate || null,
        tags: tagArray,
      } as any);
      onUpdate(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task permanently?')) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onDelete(task.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const comment = await createComment(task.id, newComment.trim());
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  return (
    <div className="kanban-modal-overlay" onClick={onClose}>
      <div className="kanban-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kanban-modal__header">
          <h2>Edit Task</h2>
          <button onClick={onClose} className="kanban-modal__close">&times;</button>
        </div>

        {error && <div className="kanban-modal__error">{error}</div>}

        <div className="kanban-modal__body">
          <div className="kanban-modal__main">
            <div className="kanban-field">
              <label>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="kanban-field">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Task details..."
              />
            </div>
            <div className="kanban-field">
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="bug, frontend, urgent"
              />
            </div>

            {/* Comments Section */}
            <div className="kanban-comments">
              <h3>Comments</h3>
              <div className="kanban-comments__add">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                />
                <button onClick={handleAddComment} disabled={!newComment.trim()}>
                  Post
                </button>
              </div>
              {loadingComments ? (
                <p className="kanban-comments__loading">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="kanban-comments__empty">No comments yet.</p>
              ) : (
                <div className="kanban-comments__list">
                  {comments.map((c) => (
                    <div key={c.id} className="kanban-comment">
                      <div className="kanban-comment__meta">
                        <strong>{getUserDisplay(c.author as TaskUser)}</strong>
                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p>{c.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="kanban-modal__sidebar">
            <div className="kanban-field">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>{col.label}</option>
                ))}
              </select>
            </div>
            <div className="kanban-field">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.emoji} {cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="kanban-field">
              <label>Assignee</label>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.username || u.email.split('@')[0]}
                  </option>
                ))}
              </select>
            </div>
            <div className="kanban-field">
              <label>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="kanban-modal__meta">
              <small>Created: {new Date(task.createdAt).toLocaleString()}</small>
              <small>Updated: {new Date(task.updatedAt).toLocaleString()}</small>
              {task.createdBy && <small>By: {getUserDisplay(task.createdBy as TaskUser)}</small>}
            </div>
          </div>
        </div>

        <div className="kanban-modal__footer">
          <div>
            {canDelete && (
              <button onClick={handleDelete} className="kanban-btn kanban-btn--danger" disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
          <div>
            <button onClick={onClose} className="kanban-btn kanban-btn--secondary">Cancel</button>
            <button onClick={handleSave} className="kanban-btn kanban-btn--primary" disabled={saving || !title.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
