'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Trash2, Calendar, ShoppingCart, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskItem as TaskItemType } from '@/lib/types';
import { useAppStore } from '@/lib/store/app-store';
import { getAvatarUrl } from '@/lib/avatars';
import { haptic } from '@/lib/telegram';

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

  const completedSubtasksCount = task.subtasks.filter((s) => s.isCompleted).length;
  const totalSubtasksCount = task.subtasks.length;

  const handleToggleTask = () => {
    haptic.medium();
    onToggle(task.id);
  };

  const handleToggleSub = (subId: string) => {
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
    <div className="relative group">
      {/* Task Row */}
      <div className="px-4 py-3.5 flex items-start space-x-3.5 ios-press">
        {/* Apple Reminders Hollow Ring Checkbox */}
        <button
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
        <div
          className="flex-1 min-w-0"
          onClick={() => task.isMegaTask && setIsExpanded(!isExpanded)}
        >
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
                  <img
                    src={getAvatarUrl(assigneeInfo.avatar)}
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
        <div className="flex items-center space-x-1">
          {task.isMegaTask && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-full"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}

          <button
            onClick={() => {
              if (confirm(`Удалить «${task.title}»?`)) {
                haptic.warning();
                onDelete(task.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-muted-foreground hover:text-red-500 rounded-full transition-opacity"
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
                onClick={() => handleToggleSub(sub.id)}
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

      {/* Apple Hairline Inset Separator (stops at text indent) */}
      {!isLast && (
        <div className="ml-12 border-b border-border/60" />
      )}
    </div>
  );
};
