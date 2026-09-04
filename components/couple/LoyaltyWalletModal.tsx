'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, CreditCard, Sparkles, Trash2, QrCode, Barcode, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { LoyaltyCard } from '@/lib/types';
import { OzonBarcodeSheet } from './OzonBarcodeSheet';
import { QRCodeSVG } from 'qrcode.react';
import { haptic } from '@/lib/telegram';

interface LoyaltyWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORE_PRESETS = [
  { name: 'ВкусВилл', color: 'from-emerald-600 to-teal-800', type: 'ean13' as const },
  { name: 'Золотое Яблоко', color: 'from-lime-400 via-lime-500 to-emerald-600', type: 'code128' as const },
  { name: 'Перекресток', color: 'from-blue-600 to-indigo-800', type: 'code128' as const },
  { name: 'Леруа Мерлен', color: 'from-green-600 to-emerald-800', type: 'code128' as const },
  { name: 'Магнит', color: 'from-red-600 to-rose-700', type: 'code128' as const },
  { name: 'Спортмастер', color: 'from-blue-500 to-sky-600', type: 'code128' as const },
  { name: 'OZON Штрихкод', color: 'from-sky-500 via-blue-600 to-blue-800', type: 'qr' as const },
];

export const LoyaltyWalletModal: React.FC<LoyaltyWalletModalProps> = ({ isOpen, onClose }) => {
  const { loyaltyCards, addLoyaltyCard, deleteLoyaltyCard, currentUser } = useAppStore();
  const [selectedCardForSheet, setSelectedCardForSheet] = useState<LoyaltyCard | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [storeName, setStoreName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [barcodeType, setBarcodeType] = useState<'code128' | 'qr' | 'ean13'>('code128');
  const [cardColor, setCardColor] = useState('from-indigo-600 to-purple-700');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof STORE_PRESETS[0]) => {
    haptic.selection();
    setStoreName(preset.name);
    setCardColor(preset.color);
    setBarcodeType(preset.type);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !cardNumber.trim()) return;

    haptic.success();
    addLoyaltyCard({
      storeName: storeName.trim(),
      cardNumber: cardNumber.trim(),
      barcodeType,
      cardColor,
      addedById: currentUser.id,
    });

    // Reset
    setStoreName('');
    setCardNumber('');
    setIsAddOpen(false);
  };

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
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 text-xs font-semibold mb-2">
              <CreditCard size={12} />
              <span>Apple Wallet для двоих</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">
              Карты лояльности
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Нажмите на мини-код, чтобы развернуть его на кассе (в стиле OZON)
            </p>
          </div>

          {/* Action: Add Button */}
          {!isAddOpen && (
            <button
              onClick={() => {
                haptic.light();
                setIsAddOpen(true);
              }}
              className="w-full mb-4 py-3 px-4 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/50 text-foreground font-bold text-xs flex items-center justify-center space-x-2 ios-press"
            >
              <Plus size={15} />
              <span>Добавить карту магазина</span>
            </button>
          )}

          {/* ADD CARD FORM */}
          {isAddOpen && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="mb-5 p-4 rounded-2xl bg-secondary/50 border border-border/60 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Новая карта</span>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Отмена
                </button>
              </div>

              {/* Presets */}
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                  Популярные магазины:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STORE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`px-2.5 py-1 text-[11px] rounded-full font-semibold border transition-all ios-press ${
                        storeName === p.name
                          ? 'bg-primary text-white border-primary'
                          : 'bg-secondary/80 text-foreground border-border/40 hover:bg-secondary'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Store Name */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Название магазина</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Например: Золотое Яблоко"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-background border border-border/60 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Card Number */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Номер карты или штрихкода</label>
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="290123847592"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-background border border-border/60 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                />
              </div>

              {/* Code Format */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Формат кода</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setBarcodeType('code128')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 ${
                      barcodeType === 'code128' || barcodeType === 'ean13'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background border-border/50 text-muted-foreground'
                    }`}
                  >
                    <Barcode size={14} />
                    <span>Штрих-код</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeType('qr')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 ${
                      barcodeType === 'qr'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background border-border/50 text-muted-foreground'
                    }`}
                  >
                    <QrCode size={14} />
                    <span>QR-код</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md ios-press"
              >
                Сохранить карту в кошелек
              </button>
            </motion.form>
          )}

          {/* LIST OF LOYALTY CARDS */}
          {loyaltyCards.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-secondary/30 border border-border/30 my-4">
              <CreditCard size={32} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs font-semibold text-foreground">Кошелек пуст</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Добавьте карты любимых магазинов, чтобы не искать их на кассе
              </p>
            </div>
          ) : (
            <div className="space-y-3 my-1">
              {loyaltyCards.map((card) => (
                <motion.div
                  key={card.id}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-4 rounded-[22px] bg-gradient-to-r ${card.cardColor} text-white shadow-lg overflow-hidden flex flex-col justify-between`}
                >
                  {/* Card Specular Light */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />

                  {/* Top Row: Store Name + Delete */}
                  <div className="flex items-center justify-between z-10">
                    <span className="text-base font-black tracking-tight drop-shadow-sm">
                      {card.storeName}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        haptic.selection();
                        deleteLoyaltyCard(card.id);
                      }}
                      className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                      title="Удалить карту"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Card Number */}
                  <div className="mt-3 mb-2 z-10">
                    <span className="font-mono text-xs tracking-widest text-white/90">
                      {card.cardNumber}
                    </span>
                  </div>

                  {/* Bottom Row: Mini QR/Barcode Trigger (Tap to open OZON sheet) */}
                  <div
                    onClick={() => {
                      haptic.medium();
                      setSelectedCardForSheet(card);
                    }}
                    className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between cursor-pointer group z-10"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-9 h-9 p-1 rounded-lg bg-white flex items-center justify-center shadow-xs">
                        {card.barcodeType === 'qr' ? (
                          <QRCodeSVG value={card.cardNumber} size={28} />
                        ) : (
                          <Barcode size={24} className="text-zinc-900" />
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] font-bold block text-white group-hover:underline">
                          Показать код на кассе
                        </span>
                        <span className="text-[9px] text-white/70 block">
                          Нажмите, чтобы развернуть во весь экран
                        </span>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white">
                      <ExternalLink size={13} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* OZON Style Barcode Sheet */}
        <OzonBarcodeSheet
          card={selectedCardForSheet}
          onClose={() => setSelectedCardForSheet(null)}
        />
      </div>
    </AnimatePresence>
  );
};
