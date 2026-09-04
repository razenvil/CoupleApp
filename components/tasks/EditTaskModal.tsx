'use client';

import React, { useState, useEffect } from 'react';
import { ModalDrawer } from '../common/ModalDrawer';
import { useAppStore } from '@/lib/store/app-store';
import { Plus, Trash2, Check, ShoppingCart, CheckSquare, Calendar } from 'lucide-react';
import { TaskAssignee, TaskItem } from '@/lib/types';
import { haptic } from '@/lib/telegram';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, task }) => {
  const { currentUser, partnerUser, updateTask, deleteTask } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isMegaTask, setIsMegaTask] = useState(false);
  const [subtasks, setSubtasks] = useState<{ id: string; text: string; isCompleted: boolean }[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [assignee, setAssignee] = useState<TaskAssignee>('both');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setIsMegaTask(Boolean(task.isMegaTask));
      setSubtasks(task.subtasks || []);
      setAssignee(task.assignee || 'both');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    }
  }, [task]);

  if (!task) return null;

  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    haptic.light();
    setSubtasks((prev) => [
      ...prev,
      { id: `sub_${Date.now()}`, text: subtaskInput.trim(), isCompleted: false },
    ]);
    setSubtaskInput('');
  };

  const handleRemoveSubtask = (id: string) => {
    haptic.light();
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    updateTask(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      isMegaTask,
      subtasks,
      assignee,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });

    haptic.success();
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Удалить задачу «${task.title}»?`)) {
      haptic.warning();
      deleteTask(task.id);
      onClose();
    }
  };

  return (
    <ModalDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Редактирование задачи"
      subtitle="Изменить название, подпункты или исполнителя"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Type Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-[16px] border border-border">
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setIsMegaTask(false);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-[12px] text-xs font-semibold transition-all ${
              !isMegaTask
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckSquare size={14} />
            <span>Обычная задача</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setIsMegaTask(true);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-[12px] text-xs font-semibold transition-all ${
              isMegaTask
                ? 'bg-card text-foreground shadow-sm text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingCart size={14} />
            <span>Список покупок</span>
          </button>
        </div>

        {/* Task Title */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            {isMegaTask ? 'Название списка' : 'Название задачи'}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-[14px] bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Название..."
          />
        </div>

        {/* MegaTask Sub-items (Shopping list) */}
        {isMegaTask && (
          <div className="p-3 rounded-[16px] bg-secondary/60 border border-border space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Пункты списка покупок
            </label>

            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-[10px] bg-card border border-border text-xs text-foreground focus:outline-none"
                placeholder="Новый пункт..."
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-2 rounded-[10px] bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-95"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Added Subtasks */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {subtasks.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-[8px] bg-card text-xs font-medium text-foreground border border-border/60"
                  >
                    <span className={item.isCompleted ? 'line-through text-muted-foreground' : ''}>
                      • {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(item.id)}
                      className="text-muted-foreground hover:text-red-500 p-0.5"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assignee Picker */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Кому поручено дело
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-[14px] bg-secondary border border-border">
            {[
              { id: 'me' as TaskAssignee, label: `Мне (${currentUser.name})` },
              { id: 'partner' as TaskAssignee, label: partnerUser.name },
              { id: 'both' as TaskAssignee, label: 'Вместе' },
            ].map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => {
                  haptic.selection();
                  setAssignee(opt.id);
                }}
                className={`py-1.5 text-xs font-medium rounded-[10px] transition-all ${
                  assignee === opt.id
                    ? 'bg-card text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Description / Notes */}
        {!isMegaTask && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Примечание
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[14px] bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Подробности, адрес или код"
            />
          </div>
        )}

        {/* Due Date */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Срок / Дедлайн
          </label>
          <div className="relative">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-[14px] bg-secondary border border-border text-xs text-foreground focus:outline-none"
            />
            <Calendar
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>

        {/* Buttons: Save & Delete */}
        <div className="pt-2 space-y-2">
          <button
            type="submit"
            className="w-full py-3 rounded-ios-btn bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5"
          >
            <Check size={17} />
            <span>Сохранить изменения</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-2.5 rounded-ios-btn bg-red-500/10 text-red-500 font-medium text-xs hover:bg-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-1"
          >
            <Trash2 size={14} />
            <span>Удалить задачу</span>
          </button>
        </div>
      </form>
    </ModalDrawer>
  );
};
