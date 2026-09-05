'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  ShoppingCart,
  Send,
  Plus,
  CreditCard,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { sendPartnerNotification } from '@/lib/telegram-bot';
import { haptic } from '@/lib/telegram';
import { OzonBarcodeSheet } from '../couple/OzonBarcodeSheet';
import { LoyaltyCard, TaskItem } from '@/lib/types';
import confetti from 'canvas-confetti';

interface GroceryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroceryModeModal: React.FC<GroceryModeModalProps> = ({ isOpen, onClose }) => {
  const {
    tasks,
    couple,
    currentUser,
    loyaltyCards,
    addTask,
    toggleTask,
    toggleSubtask,
    updateTask,
  } = useAppStore();

  const [selectedCardForSheet, setSelectedCardForSheet] = useState<LoyaltyCard | null>(null);
  const [isPingSent, setIsPingSent] = useState<boolean>(false);
  const [newItemText, setNewItemText] = useState<string>('');

  // Find the primary shopping list or tasks with subtasks
  const shoppingTasks = useMemo(() => {
    return tasks.filter((t) => {
      const lower = t.title.toLowerCase();
      return (
        t.isMegaTask ||
        lower.includes('магазин') ||
        lower.includes('покупк') ||
        lower.includes('продукт') ||
        lower.includes('еда') ||
        t.subtasks.length > 0
      );
    });
  }, [tasks]);

  // Primary active shopping task or fallback to the first mega task
  const primaryShoppingTask = useMemo(() => {
    return shoppingTasks.find((t) => !t.isCompleted) || shoppingTasks[0];
  }, [shoppingTasks]);

  // Calculate shopping statistics
  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;

    if (primaryShoppingTask && primaryShoppingTask.subtasks.length > 0) {
      total = primaryShoppingTask.subtasks.length;
      completed = primaryShoppingTask.subtasks.filter((s) => s.isCompleted).length;
    } else {
      total = tasks.filter((t) => !t.isCompleted).length;
      completed = tasks.filter((t) => t.isCompleted).length;
    }

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [primaryShoppingTask, tasks]);

  if (!isOpen) return null;

  // Send "I am in the store" ping to partner
  const handleNotifyPartner = () => {
    haptic.success();
    setIsPingSent(true);

    sendPartnerNotification({
      coupleId: couple.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      action: 'grocery_ping',
      itemTitle: 'Я в магазине!',
    });

    setTimeout(() => {
      setIsPingSent(false);
    }, 5000);
  };

  // Add item quickly on the go
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;

    haptic.medium();

    if (primaryShoppingTask) {
      // Append subtask to current shopping list
      const newSubtask = {
        id: `sub_${Date.now()}`,
        text,
        isCompleted: false,
      };
      const updatedSubtasks = [...primaryShoppingTask.subtasks, newSubtask];
      updateTask(primaryShoppingTask.id, {
        subtasks: updatedSubtasks,
        isMegaTask: true,
      });
    } else {
      // Create new shopping task
      addTask({
        title: '🛒 Покупки в магазине',
        description: 'Список продуктов',
        isMegaTask: true,
        subtasks: [{ id: `sub_${Date.now()}`, text, isCompleted: false }],
        assignee: 'both',
        creatorId: currentUser.id,
      });
    }

    setNewItemText('');
  };

  // Toggle subtask with completion confetti
  const handleToggleSub = (taskId: string, subId: string, currentCompleted: boolean) => {
    haptic.medium();
    toggleSubtask(taskId, subId);

    // If this was the last item completing the list, shoot confetti
    if (!currentCompleted && stats.total > 0 && stats.completed + 1 === stats.total) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background select-none">
      {/* Top Header Bar */}
      <div 
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 24px) + 12px)' }}
        className="pb-3.5 px-5 border-b border-border/80 bg-background/95 backdrop-blur-md flex items-center justify-between shrink-0"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <ShoppingCart size={22} strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-foreground leading-none">
              Я в магазине
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Режим покупок без спешки
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 -mr-1 rounded-full bg-secondary/90 hover:bg-secondary text-foreground active:scale-95 flex items-center justify-center ios-press shadow-xs shrink-0 cursor-pointer"
          aria-label="Закрыть режим магазина"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Progress & Partner Notification Row */}
      <div className="px-5 py-3 bg-secondary/30 border-b border-border/50 space-y-2.5">
        {/* Progress Bar */}
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-foreground">
            В корзине: {stats.completed} из {stats.total}
          </span>
          <span className="text-emerald-600 font-bold">{stats.percentage}%</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>

        {/* Quick Notify Partner Button */}
        <div className="pt-1 flex items-center justify-between">
          <button
            onClick={handleNotifyPartner}
            disabled={isPingSent}
            className={`w-full py-2 px-3 rounded-[14px] text-xs font-bold flex items-center justify-center space-x-2 transition-all ios-press shadow-sm ${
              isPingSent
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            {isPingSent ? (
              <>
                <Check size={15} strokeWidth={2.5} />
                <span>Половинка оповещена! ❤️</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Сообщить половинке: «Я в магазине!»</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loyalty Cards Carousel */}
      {loyaltyCards.length > 0 && (
        <div className="px-5 py-2.5 border-b border-border/40 bg-card/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-1">
              <CreditCard size={12} />
              <span>Дисконтные карты для кассы</span>
            </span>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
            {loyaltyCards.map((card) => (
              <button
                key={card.id}
                onClick={() => {
                  haptic.light();
                  setSelectedCardForSheet(card);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r ${card.cardColor} text-white text-xs font-bold flex items-center space-x-2 shadow-xs ios-press`}
              >
                <span>{card.storeName}</span>
                <span className="text-[10px] opacity-80 font-mono">
                  {card.cardNumber.slice(-4)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Checklist Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
        {primaryShoppingTask && primaryShoppingTask.subtasks.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              {primaryShoppingTask.title}
            </div>

            {primaryShoppingTask.subtasks.map((sub) => (
              <div
                key={sub.id}
                onClick={() => handleToggleSub(primaryShoppingTask.id, sub.id, sub.isCompleted)}
                className={`p-3.5 rounded-[18px] border transition-all flex items-center space-x-3.5 cursor-pointer ios-press ${
                  sub.isCompleted
                    ? 'bg-secondary/40 border-border/40 text-muted-foreground'
                    : 'bg-card border-border/80 text-foreground shadow-xs hover:border-primary/50'
                }`}
              >
                {/* Large Checkbox for easy thumb-tap */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    sub.isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'border-2 border-muted-foreground/50 bg-transparent'
                  }`}
                >
                  {sub.isCompleted && <Check size={16} strokeWidth={3} />}
                </div>

                <span
                  className={`text-base font-semibold leading-tight flex-1 ${
                    sub.isCompleted ? 'line-through opacity-60' : ''
                  }`}
                >
                  {sub.text}
                </span>
              </div>
            ))}
          </div>
        ) : shoppingTasks.length > 0 ? (
          <div className="space-y-2">
            {shoppingTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  haptic.medium();
                  toggleTask(t.id);
                }}
                className={`p-3.5 rounded-[18px] border transition-all flex items-center space-x-3.5 cursor-pointer ios-press ${
                  t.isCompleted
                    ? 'bg-secondary/40 border-border/40 text-muted-foreground'
                    : 'bg-card border-border/80 text-foreground shadow-xs hover:border-primary/50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    t.isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'border-2 border-muted-foreground/50 bg-transparent'
                  }`}
                >
                  {t.isCompleted && <Check size={16} strokeWidth={3} />}
                </div>
                <span
                  className={`text-base font-semibold leading-tight flex-1 ${
                    t.isCompleted ? 'line-through opacity-60' : ''
                  }`}
                >
                  {t.title}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
            <ShoppingBag size={48} className="text-muted/40 mb-3" strokeWidth={1.3} />
            <p className="text-base font-bold text-foreground">Список покупок пуст</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
              Впишите продукты ниже, чтобы быстро вычеркивать их в зале магазина.
            </p>
          </div>
        )}
      </div>

      {/* Quick Add Product Bar at Bottom */}
      <div 
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 12px)' }}
        className="p-4 border-t border-border bg-card/90 backdrop-blur-md shrink-0"
      >
        <form onSubmit={handleAddItem} className="flex items-center space-x-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Добавить продукт (например, Сыр пармезан)..."
            className="flex-1 px-4 py-3 rounded-2xl bg-secondary/80 border-0 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={!newItemText.trim()}
            className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center font-bold disabled:opacity-40 shadow-md ios-press shrink-0"
          >
            <Plus size={22} strokeWidth={2.6} />
          </button>
        </form>
      </div>

      {/* Barcode / QR Code modal sheet for loyalty card */}
      <OzonBarcodeSheet
        card={selectedCardForSheet}
        onClose={() => setSelectedCardForSheet(null)}
      />
    </div>
  );
};
