'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, Palette, Calendar, UserCheck } from 'lucide-react';
import { ThemePicker } from '@/components/settings/ThemePicker';
import { AvatarPicker } from '@/components/settings/AvatarPicker';
import { useAppStore } from '@/lib/store/app-store';
import { haptic } from '@/lib/telegram';

interface AppearanceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppearanceSettingsModal: React.FC<AppearanceSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { couple, updateCoupleInfo, updateUserProfile } = useAppStore();

  if (!isOpen) return null;

  const handleDateChange = (val: string) => {
    updateCoupleInfo({ startDate: new Date(val).toISOString() });
    haptic.light();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/65 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md max-h-[85vh] rounded-[32px] ios-glass-card p-6 border border-white/20 shadow-2xl overflow-y-auto flex flex-col space-y-5"
        >
          {/* Close button */}
          <button
            onClick={() => {
              haptic.light();
              onClose();
            }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground ios-press transition-colors z-10"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-semibold mb-2">
              <Sliders size={12} />
              <span>Персонализация и стиль</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Настройки
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Оформление приложения, 3D Memoji аватарки и дата пары
            </p>
          </div>

          {/* Date of relationship */}
          <div className="p-4 rounded-2xl ios-inset-grouped space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-primary" />
              <span className="text-xs font-bold text-foreground">Начало отношений</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Дата используется для расчета дней вместе в шапке Dynamic Island
            </p>
            <input
              type="date"
              value={couple.startDate.split('T')[0]}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Partner Names */}
          <div className="p-4 rounded-2xl ios-inset-grouped space-y-3">
            <div className="flex items-center space-x-2">
              <UserCheck size={16} className="text-primary" />
              <span className="text-xs font-bold text-foreground">Имена двоих</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Партнер 1
                </label>
                <input
                  type="text"
                  value={couple.partnerA.name}
                  onChange={(e) => updateUserProfile(couple.partnerA.id, { name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Партнер 2
                </label>
                <input
                  type="text"
                  value={couple.partnerB.name}
                  onChange={(e) => updateUserProfile(couple.partnerB.id, { name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          </div>

          {/* Themes */}
          <ThemePicker />

          {/* Avatars */}
          <AvatarPicker />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
