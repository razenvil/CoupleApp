'use client';

import { supabase } from './supabase';
import { sendPartnerNotification } from './telegram-bot';

export interface OfflineTaskMutation {
  id: string;
  type: 'CREATE_TASK' | 'UPDATE_TASK' | 'TOGGLE_TASK' | 'TOGGLE_SUBTASK' | 'DELETE_TASK';
  payload: any;
  coupleId: string;
  senderId?: string;
  senderName: string;
  createdAt: number;
}

const MUTATION_QUEUE_KEY = 'couple_offline_tasks_queue';

export function getPendingTaskMutations(): OfflineTaskMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MUTATION_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to read offline task queue:', e);
    return [];
  }
}

export function savePendingTaskMutations(queue: OfflineTaskMutation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('couple_sync_queue_changed', { detail: queue.length }));
  } catch (e) {
    console.warn('Failed to save offline task queue:', e);
  }
}

export function enqueueTaskMutation(
  mutation: Omit<OfflineTaskMutation, 'id' | 'createdAt'>
): OfflineTaskMutation {
  const newMutation: OfflineTaskMutation = {
    ...mutation,
    id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
  };

  const queue = getPendingTaskMutations();
  queue.push(newMutation);
  savePendingTaskMutations(queue);

  // Try processing immediately if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    processTaskQueue();
  }

  return newMutation;
}

let isProcessingQueue = false;

export async function processTaskQueue(): Promise<void> {
  if (isProcessingQueue) return;
  if (typeof window === 'undefined') return;
  if (!navigator.onLine || !supabase) return;

  const queue = getPendingTaskMutations();
  if (queue.length === 0) return;

  isProcessingQueue = true;
  window.dispatchEvent(new CustomEvent('couple_sync_status_changed', { detail: { isSyncing: true } }));

  try {
    const processedIds = new Set<string>();

    for (const item of queue) {
      try {
        let success = false;

        switch (item.type) {
          case 'CREATE_TASK': {
            const task = item.payload;
            const { error } = await supabase.from('tasks').upsert(
              {
                id: task.id,
                couple_id: item.coupleId,
                title: task.title,
                description: task.description,
                category: 'Общее',
                assigned_to: task.assignee || 'both',
                due_date: task.dueDate,
                is_completed: Boolean(task.isCompleted),
                subtasks: task.subtasks || [],
                created_by: item.senderName,
              },
              { onConflict: 'id' }
            );

            if (!error) {
              success = true;
              sendPartnerNotification({
                coupleId: item.coupleId,
                senderId: item.senderId,
                senderName: item.senderName,
                action: 'task_created',
                itemTitle: task.title,
                details: task.description,
              });
            }
            break;
          }

          case 'UPDATE_TASK': {
            const { id, data } = item.payload;
            const updatePayload: any = {};
            if (data.title !== undefined) updatePayload.title = data.title;
            if (data.description !== undefined) updatePayload.description = data.description;
            if (data.assignee !== undefined) updatePayload.assigned_to = data.assignee;
            if (data.dueDate !== undefined) updatePayload.due_date = data.dueDate;
            if (data.subtasks !== undefined) updatePayload.subtasks = data.subtasks;
            if (data.isCompleted !== undefined) updatePayload.is_completed = data.isCompleted;

            const { error } = await supabase.from('tasks').update(updatePayload).eq('id', id);
            if (!error) {
              success = true;
              if (data.title) {
                sendPartnerNotification({
                  coupleId: item.coupleId,
                  senderId: item.senderId,
                  senderName: item.senderName,
                  action: 'task_updated',
                  itemTitle: data.title,
                });
              }
            }
            break;
          }

          case 'TOGGLE_TASK': {
            const { id, completed, title } = item.payload;
            const { error } = await supabase.from('tasks').update({ is_completed: completed }).eq('id', id);
            if (!error) {
              success = true;
              if (completed) {
                sendPartnerNotification({
                  coupleId: item.coupleId,
                  senderId: item.senderId,
                  senderName: item.senderName,
                  action: 'task_completed',
                  itemTitle: title || 'Задача выполнена',
                });
              }
            }
            break;
          }

          case 'TOGGLE_SUBTASK': {
            const { taskId, subtasks, allCompleted } = item.payload;
            const { error } = await supabase
              .from('tasks')
              .update({ subtasks, is_completed: allCompleted })
              .eq('id', taskId);
            if (!error) {
              success = true;
            }
            break;
          }

          case 'DELETE_TASK': {
            const { id } = item.payload;
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (!error) {
              success = true;
            }
            break;
          }
        }

        if (success) {
          processedIds.add(item.id);
        }
      } catch (mutationErr) {
        console.warn('Error processing task mutation:', mutationErr);
      }
    }

    // Safely remove only successfully processed mutations from current storage
    const currentQueue = getPendingTaskMutations();
    const updatedQueue = currentQueue.filter((item) => !processedIds.has(item.id));
    savePendingTaskMutations(updatedQueue);
  } finally {
    isProcessingQueue = false;
    const remaining = getPendingTaskMutations().length;
    window.dispatchEvent(
      new CustomEvent('couple_sync_status_changed', {
        detail: { isSyncing: false, remaining },
      })
    );

    // If more tasks were enqueued during processing, run another pass
    if (remaining > 0 && navigator.onLine) {
      setTimeout(() => processTaskQueue(), 50);
    }
  }
}

// Global network listener registration
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processTaskQueue();
  });

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      processTaskQueue();
    }
  });

  // Background interval check
  setInterval(() => {
    if (navigator.onLine && getPendingTaskMutations().length > 0) {
      processTaskQueue();
    }
  }, 15000);
}
