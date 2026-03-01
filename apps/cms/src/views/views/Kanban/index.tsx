import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Task, TaskUser, TaskStatus, COLUMNS } from './types';
import { fetchTasks, fetchUsers, fetchMe, createTask, updateTask } from './api';
import KanbanColumn from './components/KanbanColumn';
import QuickAdd from './components/QuickAdd';
import TaskDetail from './components/TaskDetail';

const KanbanView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [meRole, setMeRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Filters (list view)
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [taskData, userData, me] = await Promise.all([fetchTasks(), fetchUsers(), fetchMe()]);
      setTasks(taskData);
      setUsers(userData as TaskUser[]);
      setMeRole(me?.user?.role || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TaskStatus;
    const taskId = draggableId;

    // Optimistic update
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, sortOrder: destination.index } : t
      );
      return updated;
    });

    // Persist
    try {
      await updateTask(taskId, { status: newStatus, sortOrder: destination.index });
    } catch (err) {
      console.error('Failed to update task status:', err);
      loadData(); // Rollback on error
    }
  }, [loadData]);

  const handleQuickAdd = async (title: string, status: TaskStatus, assigneeId?: string) => {
    const colTasks = tasks.filter((t) => t.status === status);
    const newTask = await createTask({
      title,
      status,
      priority: 'medium',
      assignee: assigneeId || null,
      sortOrder: colTasks.length,
    } as any);
    setTasks((prev) => [...prev, newTask]);
  };

  const handleTaskUpdate = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleTaskDelete = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Group tasks by column
  const tasksByColumn = COLUMNS.reduce<Record<TaskStatus, Task[]>>((acc, col) => {
    acc[col.id] = tasks
      .filter((t) => t.status === col.id)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  // Filtered tasks for list view
  const filteredTasks = tasks.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterAssignee) {
      const aId = typeof t.assignee === 'object' && t.assignee ? t.assignee.id : t.assignee;
      if (aId !== filterAssignee) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="kanban-page">
        <div className="kanban-loading">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="kanban-page">
      <div className="kanban-toolbar">
        <h1 className="kanban-toolbar__title">Tasks Board</h1>
        <div className="kanban-toolbar__actions">
          <button
            className={`kanban-btn ${viewMode === 'board' ? 'kanban-btn--primary' : 'kanban-btn--secondary'}`}
            onClick={() => setViewMode('board')}
          >
            Board
          </button>
          <button
            className={`kanban-btn ${viewMode === 'list' ? 'kanban-btn--primary' : 'kanban-btn--secondary'}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
          <button className="kanban-btn kanban-btn--secondary" onClick={loadData}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && <div className="kanban-error">{error}</div>}

      <QuickAdd users={users} onAdd={handleQuickAdd} />

      {viewMode === 'board' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kanban-board">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasksByColumn[col.id] || []}
                onCardClick={setSelectedTask}
              />
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="kanban-list">
          <div className="kanban-list__filters">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="kanban-list__search"
            />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>{col.label}</option>
              ))}
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
              <option value="">All Assignees</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email.split('@')[0]}</option>
              ))}
            </select>
          </div>
          <table className="kanban-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due Date</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const assigneeUser = typeof task.assignee === 'object' ? task.assignee : null;
                return (
                  <tr key={task.id} onClick={() => setSelectedTask(task)} className="kanban-table__row">
                    <td className="kanban-table__title">{task.title}</td>
                    <td>
                      <span
                        className="kanban-status-badge"
                        style={{ borderColor: COLUMNS.find((c) => c.id === task.status)?.color }}
                      >
                        {COLUMNS.find((c) => c.id === task.status)?.label}
                      </span>
                    </td>
                    <td>{task.priority}</td>
                    <td>{assigneeUser ? (assigneeUser as TaskUser).name || (assigneeUser as TaskUser).email : '—'}</td>
                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</td>
                    <td>{new Date(task.updatedAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr><td colSpan={6} className="kanban-table__empty">No tasks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }}
          onDelete={(id) => {
            setTasks((prev) => prev.filter((t) => t.id !== id));
          }}
          canDelete={meRole === 'owner'}
        />
      )}
    </div>
  );
};

export default KanbanView;
