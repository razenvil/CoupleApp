'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Trash2, Calendar, ShoppingCart, User, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskItem as TaskItemType } from '@/lib/types';
import { useAppStore } from '@/lib/store/app-store';
import { AvatarImage } from '@/components/common/AvatarImage';
import { haptic } from '@/lib/telegram';
import { EditTaskModal } from './EditTaskModal';

interface TaskItemProps {
  task: TaskItemType;
  onToggle: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onDelete: (id: string) => void;
  isLast?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onToggleSubtask,
  onDelete,
  isLast = false,
}) => {
  const { currentUser, partnerUser } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(task.isMegaTask && !task.isCompleted);
  const [isEditing, setIsEditing] = useState(false);

  const completedSubtasksCount = task.subtasks.filter((s) => s.isCompleted).length;
  const totalSubtasksCount = task.subtasks.length;

  const handleToggleTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.medium();
    onToggle(task.id);
  };

  const handleToggleSub = (e: React.MouseEvent, subId: string) => {
    e.stopPropagation();
    haptic.light();
    onToggleSubtask(task.id, subId);
  };

  const getAssigneeInfo = () => {
    if (task.assignee === 'both') {
      return { label: 'Вместе', avatar: null };
    }
    if (task.assignee === 'me') {
      return { label: currentUser.name, avatar: currentUser.avatar };
    }
    return { label: partnerUser.name, avatar: partnerUser.avatar };
  };

  const assigneeInfo = getAssigneeInfo();

  return (
    <>
      <div className="relative group">
        {/* Task Row */}
        <div
          onClick={() => setIsEditing(true)}
          className="px-4 py-3.5 flex items-start space-x-3.5 ios-press cursor-pointer hover:bg-secondary/40 transition-colors"
        >
          {/* Apple Reminders Hollow Ring Checkbox */}
          <button
            type="button"
            onClick={handleToggleTask}
            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ios-press ${
              task.isCompleted
                ? 'bg-primary border-0 text-white shadow-xs'
                : 'border-[1.8px] border-zinc-400 dark:border-zinc-500 hover:border-primary bg-transparent'
            }`}
          >
            {task.isCompleted && <Check size={13} strokeWidth={3} />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span
                className={`text-[15px] leading-snug tracking-tight font-medium transition-colors ${
                  task.isCompleted
                    ? 'line-through text-muted-foreground'
                    : 'text-foreground'
                }`}
              >
                {task.title}
              </span>

              {task.isMegaTask && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
                  <ShoppingCart size={10} />
                  <span>{completedSubtasksCount}/{totalSubtasksCount}</span>
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {task.description}
              </p>
            )}

            {/* Meta Info: Assignee & Date */}
            <div className="flex items-center gap-2.5 mt-1.5 text-[12px] text-muted-foreground">
              <div className="flex items-center space-x-1">
                {assigneeInfo.avatar ? (
                  <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0 bg-secondary">
                    <AvatarImage
                      src={assigneeInfo.avatar}
                      alt={assigneeInfo.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <User size={11} className="text-primary" />
                )}
                <span className="font-medium text-[11px]">{assigneeInfo.label}</span>
              </div>

              {task.dueDate && (
                <div className="flex items-center space-x-1 text-[11px]">
                  <Calendar size={11} />
                  <span>{new Date(task.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
            {task.isMegaTask && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-full"
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-muted-foreground hover:text-primary rounded-full transition-colors"
              title="Редактировать"
            >
              <Pencil size={14} />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => {
                if (confirm(`Удалить «${task.title}»?`)) {
                  haptic.warning();
                  onDelete(task.id);
                }
              }}
              className="p-1.5 text-muted-foreground hover:text-red-500 rounded-full transition-colors"
              title="Удалить"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Checklist / Subtasks (Shopping List) */}
        <AnimatePresence>
          {task.isMegaTask && isExpanded && task.subtasks.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pl-11 pr-4 pb-3 space-y-1.5 overflow-hidden"
            >
              {task.subtasks.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={(e) => handleToggleSub(e, sub.id)}
                  className="w-full flex items-center space-x-2.5 py-1 text-left ios-press"
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      sub.isCompleted
                        ? 'bg-primary text-white'
                        : 'border-[1.5px] border-zinc-400 dark:border-zinc-500'
                    }`}
                  >
                    {sub.isCompleted && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span
                    className={`text-xs font-medium tracking-tight ${
                      sub.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {sub.text}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Apple Hairline Inset Separator */}
        {!isLast && (
          <div className="ml-12 border-b border-border/60" />
        )}
      </div>

      {/* Edit Modal Drawer */}
      <EditTaskModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        task={task}
      />
    </>
  );
};
