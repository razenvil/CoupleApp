'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit3,
  Save,
  Footprints,
  Shirt,
  Scissors,
  Gem,
  Heart,
  Ruler,
  Watch,
  Quote,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { UserSizes } from '@/lib/types';
import { getAvatarUrl } from '@/lib/avatars';
import { haptic } from '@/lib/telegram';

interface SizesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHOE_PRESETS = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const CLOTHING_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const RING_PRESETS = ['15.0', '15.5', '16.0', '16.5', '17.0', '17.5', '18.0', '18.5', '19.0'];

export const SizesModal: React.FC<SizesModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, partnerUser, sizes, updateUserSizes } = useAppStore();
  const [activeTab, setActiveTab] = useState<'mine' | 'partner'>('partner');
  const [isEditing, setIsEditing] = useState(false);

  const mySizes: UserSizes = sizes[currentUser.id] || {};
  const partnerSizes: UserSizes = sizes[partnerUser.id] || {};

  const [formData, setFormData] = useState<UserSizes>(mySizes);

  if (!isOpen) return null;

  const currentSizes = activeTab === 'mine' ? mySizes : partnerSizes;
  const activeUser = activeTab === 'mine' ? currentUser : partnerUser;

  // Count filled fields
  const totalFields = 7;
  const filledFieldsCount = [
    currentSizes.shoesEu,
    currentSizes.clothingTop,
    currentSizes.clothingBottom,
    currentSizes.ringSize,
    currentSizes.underwear,
    currentSizes.heightCm,
    currentSizes.wristCm,
  ].filter(Boolean).length;

  const handleSave = () => {
    updateUserSizes(currentUser.id, formData);
    haptic.success();
    setIsEditing(false);
  };

  const handlePresetSelect = (field: keyof UserSizes, val: string) => {
    haptic.selection();
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 25 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md max-h-[88vh] rounded-[32px] bg-card/95 border border-border/80 shadow-2xl overflow-y-auto flex flex-col p-5 sm:p-6 no-scrollbar"
        >
          {/* Top Close Button */}
          <button
            onClick={() => {
              haptic.light();
              onClose();
            }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground ios-press transition-colors z-10"
          >
            <X size={18} />
          </button>

          {/* Modal Header */}
          <div className="mb-4 pr-8">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold mb-1.5">
              <Sparkles size={12} />
              <span>Шпаргалка для подарков и сюрпризов</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground leading-tight">
              Мерки и размеры
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Чтобы заказывать вещи без лишних вопросов и возвратов
            </p>
          </div>

          {/* Apple-Style Avatar Segmented Switcher */}
          <div className="p-1 bg-secondary/80 rounded-2xl mb-4 flex items-center">
            {/* Partner Tab */}
            <button
              onClick={() => {
                haptic.selection();
                setActiveTab('partner');
                setIsEditing(false);
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center space-x-2 transition-all ios-press ${
                activeTab === 'partner'
                  ? 'bg-card text-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              <img
                src={getAvatarUrl(partnerUser.avatar)}
                alt={partnerUser.name}
                className="w-6 h-6 rounded-full object-cover shrink-0 bg-primary/10"
              />
              <span className="text-xs truncate">{partnerUser.name}</span>
            </button>

            {/* My Tab */}
            <button
              onClick={() => {
                haptic.selection();
                setActiveTab('mine');
                setFormData(mySizes);
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center space-x-2 transition-all ios-press ${
                activeTab === 'mine'
                  ? 'bg-card text-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              <img
                src={getAvatarUrl(currentUser.avatar)}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover shrink-0 bg-primary/10"
              />
              <span className="text-xs truncate">Мои размеры</span>
            </button>
          </div>

          {/* Completion Status Pill */}
          {!isEditing && (
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {activeTab === 'mine' ? 'Мой гардероб' : `Мерки ${partnerUser.name}`}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Заполнено {filledFieldsCount} из {totalFields}
              </span>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW MODE: LUXURY APPLE BENTO GRID (NO COPY BUTTONS)              */}
          {/* ================================================================= */}
          {!isEditing ? (
            <div className="space-y-3">
              {/* Bento Grid 2 Columns */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Обувь */}
                <div className="p-3.5 rounded-[22px] bg-secondary/40 border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Обувь
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Footprints size={15} />
                    </div>
                  </div>
                  <div>
                    <span className="text-lg font-black text-foreground block tracking-tight leading-none">
                      {currentSizes.shoesEu ? `${currentSizes.shoesEu} EU` : '—'}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium block mt-1">
                      {currentSizes.shoesCm ? `${currentSizes.shoesCm} см стелька` : 'Размер стопы'}
                    </span>
                  </div>
                </div>

                {/* 2. Кольцо */}
                <div className="p-3.5 rounded-[22px] bg-secondary/40 border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Кольцо
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Gem size={15} />
                    </div>
                  </div>
                  <div>
                    <span className="text-lg font-black text-foreground block tracking-tight leading-none">
                      {currentSizes.ringSize || '—'}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium block mt-1">
                      Размер пальца
                    </span>
                  </div>
                </div>

                {/* 3. Одежда Верх */}
                <div className="p-3.5 rounded-[22px] bg-secondary/40 border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Верх
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Shirt size={15} />
                    </div>
                  </div>
                  <div>
                    <span className="text-lg font-black text-foreground block tracking-tight leading-none">
                      {currentSizes.clothingTop || '—'}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium block mt-1">
                      Худи, платья, футболки
                    </span>
                  </div>
                </div>

                {/* 4. Одежда Низ */}
                <div className="p-3.5 rounded-[22px] bg-secondary/40 border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Низ
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Scissors size={15} />
                    </div>
                  </div>
                  <div>
                    <span className="text-lg font-black text-foreground block tracking-tight leading-none">
                      {currentSizes.clothingBottom || '—'}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium block mt-1">
                      Джинсы и брюки
                    </span>
                  </div>
                </div>

                {/* 5. Белье / Бра */}
                <div className="p-3.5 rounded-[22px] bg-secondary/40 border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Белье
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <Heart size={15} />
                    </div>
                  </div>
                  <div>
                    <span className="text-lg font-black text-foreground block tracking-tight leading-none">
                      {currentSizes.underwear || '—'}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium block mt-1">
                      Бра и комплекты
                    </span>
                  </div>
                </div>

                {/* 6. Рост */}
                <div className="p-3.5 rounded-[22px] bg-secondary/40 border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Рост
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Ruler size={15} />
                    </div>
                  </div>
                  <div>
                    <span className="text-lg font-black text-foreground block tracking-tight leading-none">
                      {currentSizes.heightCm ? `${currentSizes.heightCm} см` : '—'}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium block mt-1">
                      Высота
                    </span>
                  </div>
                </div>
              </div>

              {/* 7. Запястье (Full Width Tile) */}
              <div className="p-3.5 rounded-[22px] bg-secondary/40 border border-border/60 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <Watch size={16} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Запястье (часы и браслеты)
                    </span>
                    <span className="text-base font-black text-foreground tracking-tight leading-tight">
                      {currentSizes.wristCm ? `${currentSizes.wristCm} см` : 'Не указано'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 8. Особенности и заметки */}
              {currentSizes.notes && (
                <div className="p-3.5 rounded-[22px] bg-primary/5 border border-primary/15 flex items-start space-x-3">
                  <Quote size={18} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-0.5">
                      Особенности фасонов:
                    </span>
                    <p className="text-xs text-foreground font-medium leading-relaxed">
                      {currentSizes.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button: Edit my sizes */}
              {activeTab === 'mine' && (
                <button
                  onClick={() => {
                    haptic.light();
                    setFormData(mySizes);
                    setIsEditing(true);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary-hover ios-press flex items-center justify-center space-x-2 mt-3"
                >
                  <Edit3 size={15} />
                  <span>Редактировать мои мерки</span>
                </button>
              )}
            </div>
          ) : (
            /* ================================================================= */
            /* EDIT MODE: QUICK PRESET CHIPS & CLEAN INPUTS                      */
            /* ================================================================= */
            <div className="space-y-4 my-1">
              {/* 1. Обувь */}
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-foreground">
                  <Footprints size={15} className="text-blue-500" />
                  <span>Обувь (EU и стелька)</span>
                </div>

                {/* Preset Chips */}
                <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {SHOE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePresetSelect('shoesEu', p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        formData.shoesEu === p
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    value={formData.shoesEu || ''}
                    onChange={(e) => setFormData({ ...formData, shoesEu: e.target.value })}
                    placeholder="Размер EU (напр. 38)"
                    className="px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <input
                    type="text"
                    value={formData.shoesCm || ''}
                    onChange={(e) => setFormData({ ...formData, shoesCm: e.target.value })}
                    placeholder="Стелька см (напр. 24.5)"
                    className="px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* 2. Одежда Верх */}
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-foreground">
                  <Shirt size={15} className="text-purple-500" />
                  <span>Верх (худи, рубашки, платья)</span>
                </div>

                {/* Clothing Chips */}
                <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {CLOTHING_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePresetSelect('clothingTop', p)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        formData.clothingTop === p
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={formData.clothingTop || ''}
                  onChange={(e) => setFormData({ ...formData, clothingTop: e.target.value })}
                  placeholder="Например: S / 42 или M оверсайз"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* 3. Кольцо & Низ */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Кольцо */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-foreground">
                    <Gem size={14} className="text-amber-500" />
                    <span>Кольцо</span>
                  </div>
                  <input
                    type="text"
                    value={formData.ringSize || ''}
                    onChange={(e) => setFormData({ ...formData, ringSize: e.target.value })}
                    placeholder="16.5"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="flex space-x-1 overflow-x-auto no-scrollbar pt-0.5">
                    {RING_PRESETS.slice(1, 6).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePresetSelect('ringSize', p)}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-secondary text-muted-foreground hover:text-foreground shrink-0"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Низ */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-foreground">
                    <Scissors size={14} className="text-indigo-500" />
                    <span>Низ (джинсы)</span>
                  </div>
                  <input
                    type="text"
                    value={formData.clothingBottom || ''}
                    onChange={(e) => setFormData({ ...formData, clothingBottom: e.target.value })}
                    placeholder="W26 L30 / 42"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* 4. Белье, Рост и Запястье */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Белье / Бра
                  </label>
                  <input
                    type="text"
                    value={formData.underwear || ''}
                    onChange={(e) => setFormData({ ...formData, underwear: e.target.value })}
                    placeholder="75B / M"
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-card border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Рост (см)
                  </label>
                  <input
                    type="text"
                    value={formData.heightCm || ''}
                    onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                    placeholder="168"
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-card border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Запястье (см)
                  </label>
                  <input
                    type="text"
                    value={formData.wristCm || ''}
                    onChange={(e) => setFormData({ ...formData, wristCm: e.target.value })}
                    placeholder="15.5"
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-card border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* 5. Заметки и особенности */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Особенности посадки и комментарии
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Например: люблю оверсайз худи, обувь на каблуке беру на полразмера меньше..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 rounded-2xl bg-secondary text-foreground text-xs font-semibold ios-press"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md ios-press flex items-center justify-center space-x-1.5"
                >
                  <Save size={15} />
                  <span>Сохранить</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
