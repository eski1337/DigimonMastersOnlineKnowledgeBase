import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task, PRIORITY_CONFIG, getUserDisplay, TaskUser } from '../types';

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, onClick }) => {
  const priority = PRIORITY_CONFIG[task.priority];
  const assigneeName = getUserDisplay(task.assignee as TaskUser | null);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`kanban-card ${snapshot.isDragging ? 'kanban-card--dragging' : ''}`}
          onClick={() => onClick(task)}
        >
          <div className="kanban-card__header">
            <span
              className="kanban-card__priority"
              style={{ color: priority.color }}
              title={priority.label}
            >
              {priority.emoji}
            </span>
            {task.dueDate && (
              <span className={`kanban-card__due ${isOverdue ? 'kanban-card__due--overdue' : ''}`}>
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <div className="kanban-card__title">{task.title}</div>
          {task.description && (
            <div className="kanban-card__desc">
              {task.description.length > 80 ? task.description.slice(0, 80) + '...' : task.description}
            </div>
          )}
          <div className="kanban-card__footer">
            {task.tags && task.tags.length > 0 && (
              <div className="kanban-card__tags">
                {task.tags.slice(0, 3).map((t, i) => (
                  <span key={i} className="kanban-card__tag">{t.tag}</span>
                ))}
              </div>
            )}
            <span className="kanban-card__assignee" title={assigneeName}>
              {assigneeName !== 'Unassigned' ? assigneeName.slice(0, 2).toUpperCase() : '—'}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
