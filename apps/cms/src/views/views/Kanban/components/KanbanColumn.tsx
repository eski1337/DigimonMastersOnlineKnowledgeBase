import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Task, Column } from '../types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onCardClick: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, tasks, onCardClick }) => {
  return (
    <div className="kanban-column">
      <div className="kanban-column__header">
        <span className="kanban-column__dot" style={{ backgroundColor: column.color }} />
        <span className="kanban-column__title">{column.label}</span>
        <span className="kanban-column__count">{tasks.length}</span>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`kanban-column__body ${snapshot.isDraggingOver ? 'kanban-column__body--over' : ''}`}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onClick={onCardClick} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
