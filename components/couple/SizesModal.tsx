'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Sparkles, Edit3, Save, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { UserSizes } from '@/lib/types';
import { haptic } from '@/lib/telegram';

interface SizesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SizesModal: React.FC<SizesModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, partnerUser, sizes, updateUserSizes } = useAppStore();
  const [activeTab, setActiveTab] = useState<'mine' | 'partner'>('partner');
  const [isEditing, setIsEditing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const mySizes: UserSizes = sizes[currentUser.id] || {};
  const partnerSizes: UserSizes = sizes[partnerUser.id] || {};

  const [formData, setFormData] = useState<UserSizes>(mySizes);

  if (!isOpen) return null;

  const handleCopy = (key: string, value?: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    haptic.selection();
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSave = () => {
    updateUserSizes(currentUser.id, formData);
    haptic.success();
    setIsEditing(false);
  };

  const currentViewingSizes = activeTab === 'mine' ? mySizes : partnerSizes;

  const sizeFields = [
    { key: 'shoes', label: 'Обувь', value: currentViewingSizes.shoesEu ? `${currentViewingSizes.shoesEu} EU ${currentViewingSizes.shoesCm ? `(${currentViewingSizes.shoesCm} см)` : ''}` : undefined, raw: currentViewingSizes.shoesEu || '' },
    { key: 'top', label: 'Верх (худи, платья, рубашки)', value: currentViewingSizes.clothingTop, raw: currentViewingSizes.clothingTop || '' },
    { key: 'bottom', label: 'Низ (джинсы, брюки)', value: currentViewingSizes.clothingBottom, raw: currentViewingSizes.clothingBottom || '' },
    { key: 'ring', label: 'Размер кольца', value: currentViewingSizes.ringSize ? `${currentViewingSizes.ringSize}` : undefined, raw: currentViewingSizes.ringSize || '' },
    { key: 'underwear', label: 'Белье / Бра', value: currentViewingSizes.underwear, raw: currentViewingSizes.underwear || '' },
    { key: 'height', label: 'Рост', value: currentViewingSizes.heightCm ? `${currentViewingSizes.heightCm} см` : undefined, raw: currentViewingSizes.heightCm || '' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/65 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md max-h-[85vh] rounded-[32px] ios-glass-card p-6 border border-white/20 shadow-2xl overflow-y-auto flex flex-col"
        >
          {/* Close button */}
          <button
            onClick={() => {
              haptic.light();
              onClose();
            }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground ios-press transition-colors"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="mb-4">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-semibold mb-2">
              <Sparkles size={12} />
              <span>Памятка для покупок и подарков</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Карточка размеров
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Больше никаких неловких вопросов перед праздниками и возвратов
            </p>
          </div>

          {/* Segmented Control */}
          <div className="flex p-1 bg-secondary/80 rounded-2xl mb-4">
            <button
              onClick={() => {
                haptic.selection();
                setActiveTab('partner');
                setIsEditing(false);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'partner'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Размеры {partnerUser.name}
            </button>
            <button
              onClick={() => {
                haptic.selection();
                setActiveTab('mine');
                setFormData(mySizes);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'mine'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Мои размеры
            </button>
          </div>

          {/* CONTENT: Editing Mode for My Sizes */}
          {activeTab === 'mine' && isEditing ? (
            <div className="space-y-3 my-2">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Обувь (EU)</label>
                  <input
                    type="text"
                    value={formData.shoesEu || ''}
                    onChange={(e) => setFormData({ ...formData, shoesEu: e.target.value })}
                    placeholder="38"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Длина стельки (см)</label>
                  <input
                    type="text"
                    value={formData.shoesCm || ''}
                    onChange={(e) => setFormData({ ...formData, shoesCm: e.target.value })}
                    placeholder="24.5"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Верх (одежда)</label>
                  <input
                    type="text"
                    value={formData.clothingTop || ''}
                    onChange={(e) => setFormData({ ...formData, clothingTop: e.target.value })}
                    placeholder="S / 42"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Низ (джинсы/брюки)</label>
                  <input
                    type="text"
                    value={formData.clothingBottom || ''}
                    onChange={(e) => setFormData({ ...formData, clothingBottom: e.target.value })}
                    placeholder="W26 L30"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Кольцо</label>
                  <input
                    type="text"
                    value={formData.ringSize || ''}
                    onChange={(e) => setFormData({ ...formData, ringSize: e.target.value })}
                    placeholder="16.5"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Белье</label>
                  <input
                    type="text"
                    value={formData.underwear || ''}
                    onChange={(e) => setFormData({ ...formData, underwear: e.target.value })}
                    placeholder="75B / M"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Рост (см)</label>
                <input
                  type="text"
                  value={formData.heightCm || ''}
                  onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                  placeholder="168"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Особенности и заметки</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Например: люблю оверсайз, обувь на каблуке на полразмера меньше"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-medium resize-none"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-semibold ios-press"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold ios-press shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Save size={14} />
                  <span>Сохранить</span>
                </button>
              </div>
            </div>
          ) : (
            /* VIEW MODE (Apple Inset Grouped List) */
            <div className="space-y-3">
              <div className="rounded-2xl ios-inset-grouped overflow-hidden divide-y divide-border/40">
                {sizeFields.map((field) => (
                  <div
                    key={field.key}
                    className="p-3 flex items-center justify-between hover:bg-secondary/20 transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        {field.label}
                      </span>
                      <span className="text-xs font-bold text-foreground mt-0.5 block truncate">
                        {field.value || 'Не указано'}
                      </span>
                    </div>

                    {field.value && (
                      <button
                        onClick={() => handleCopy(field.key, field.value)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center space-x-1 transition-all ios-press shrink-0 ${
                          copiedKey === field.key
                            ? 'bg-emerald-500 text-white'
                            : 'bg-secondary/70 hover:bg-secondary text-foreground border border-border/40'
                        }`}
                        title="Скопировать"
                      >
                        {copiedKey === field.key ? (
                          <>
                            <Check size={12} />
                            <span>Скопировано!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Копировать</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Notes block */}
              {currentViewingSizes.notes && (
                <div className="p-3 rounded-2xl bg-secondary/40 border border-border/30">
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase block mb-1">
                    Особенности и комментарий:
                  </span>
                  <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                    {currentViewingSizes.notes}
                  </p>
                </div>
              )}

              {/* Action Button for Mine */}
              {activeTab === 'mine' && (
                <button
                  onClick={() => {
                    haptic.light();
                    setFormData(mySizes);
                    setIsEditing(true);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs border border-border/50 ios-press flex items-center justify-center space-x-2 mt-2"
                >
                  <Edit3 size={14} />
                  <span>Редактировать мои размеры</span>
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
