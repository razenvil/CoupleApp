'use client';

import React, { useState } from 'react';
import { ModalDrawer } from '../common/ModalDrawer';
import { useAppStore } from '@/lib/store/app-store';
import { Sparkles, Check, Link as LinkIcon, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { haptic } from '@/lib/telegram';

interface AddWishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddWishModal: React.FC<AddWishModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, addWishlistItem } = useAppStore();

  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [isSuccessStatus, setIsSuccessStatus] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const handleParse = async () => {
    if (!link.trim()) return;
    setIsParsing(true);
    setParseStatus('Опрашиваем каталог магазина...');
    setIsSuccessStatus(false);
    haptic.light();

    try {
      const res = await fetch('/api/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link.trim() }),
      });

      const data = await res.json();

      if (data.success && data.title) {
        haptic.success();
        setTitle(data.title);
        setTitleError(false);
        if (data.price) setPrice(String(data.price));
        if (data.imageUrl) setImageUrl(data.imageUrl);

        const sourceLabel =
          data.source === 'wildberries'
            ? 'Wildberries'
            : data.source === 'ozon'
            ? 'Ozon'
            : 'магазина';
        setParseStatus(`✨ Успешно найдено на ${sourceLabel}: «${data.title.slice(0, 32)}...»`);
        setIsSuccessStatus(true);
      } else {
        haptic.warning();
        setIsSuccessStatus(false);
        setParseStatus(data.error || 'Магазин ограничил автопарсинг. Введите название вручную');
      }
    } catch {
      haptic.warning();
      setIsSuccessStatus(false);
      setParseStatus('Не удалось подключиться к парсеру. Введите данные вручную');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(true);
      haptic.warning();
      return;
    }

    addWishlistItem({
      authorId: currentUser.id,
      authorName: currentUser.name,
      title: title.trim(),
      price: price ? parseInt(price.replace(/\D/g, ''), 10) : undefined,
      currency: '₽',
      link: link.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      priority,
      notes: notes.trim() || undefined,
    });

    haptic.success();
    // Reset
    setLink('');
    setTitle('');
    setPrice('');
    setImageUrl('');
    setNotes('');
    setParseStatus(null);
    setTitleError(false);
    onClose();
  };

  return (
    <ModalDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Добавить в «Хотелки»"
      subtitle="Вставьте ссылку на Wildberries, Ozon или любой магазин"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL Link Input with Quick Paste and Auto-Parse */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Ссылка на товар (WB, Ozon, магазин)
          </label>
          <div className="flex items-center space-x-1.5">
            <div className="relative flex-1">
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-[14px] bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="https://wildberries.ru/catalog/..."
              />
              <LinkIcon
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>

            <button
              type="button"
              onClick={handleParse}
              disabled={isParsing || !link.trim()}
              className="px-3.5 py-2.5 rounded-[14px] bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-95 disabled:opacity-50 transition-all flex items-center space-x-1.5 shadow-sm whitespace-nowrap"
            >
              {isParsing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Парсинг...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Распарсить</span>
                </>
              )}
            </button>
          </div>

          {/* Parse Status message */}
          {parseStatus && (
            <p
              className={`text-xs mt-1.5 px-2.5 py-1 rounded-[8px] flex items-center gap-1.5 ${
                isSuccessStatus
                  ? 'bg-emerald-500/10 text-emerald-600 font-medium'
                  : 'bg-amber-500/10 text-amber-700'
              }`}
            >
              {isSuccessStatus ? (
                <Check size={13} className="shrink-0" />
              ) : (
                <AlertCircle size={13} className="shrink-0" />
              )}
              <span className="line-clamp-1">{parseStatus}</span>
            </p>
          )}
        </div>

        {/* Live Image Preview (if available) */}
        {imageUrl && (
          <div className="flex items-center space-x-3 p-2.5 rounded-[14px] bg-secondary/70 border border-border">
            <div className="w-16 h-16 rounded-[10px] overflow-hidden bg-background shrink-0 border border-border">
              <img
                src={imageUrl}
                alt="Предпросмотр"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-foreground block">Фото загружено</span>
              <span className="text-muted-foreground text-[11px]">
                Будет красиво отображаться в карточке
              </span>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Название желания <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setTitleError(false);
            }}
            className={`w-full px-3.5 py-2.5 rounded-[14px] bg-secondary border text-sm text-foreground focus:outline-none transition-colors ${
              titleError
                ? 'border-red-500 ring-2 ring-red-500/30'
                : 'border-border focus:ring-2 focus:ring-primary/40'
            }`}
            placeholder="Например: Уютный вязаный плед"
          />
          {titleError && (
            <p className="text-[11px] text-red-500 mt-1 font-medium">
              Пожалуйста, укажите название желания
            </p>
          )}
        </div>

        {/* Price and Priority */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Стоимость (₽)
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[14px] bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="3 500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Приоритет
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-[14px] bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="high">❤️ Очень хочу</option>
              <option value="medium">✨ В приоритете</option>
              <option value="low">💡 Просто идея</option>
            </select>
          </div>
        </div>

        {/* Image URL Manual override */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Ссылка на фото (если нет в ссылке)
          </label>
          <div className="relative">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-[12px] bg-secondary border border-border text-xs text-foreground focus:outline-none"
              placeholder="https://images.unsplash.com/..."
            />
            <ImageIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Комментарий к желанию
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-[14px] bg-secondary border border-border text-xs text-foreground focus:outline-none"
            placeholder="Цвет, размер или по какому поводу хотите"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full mt-2 py-3 rounded-ios-btn bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5"
        >
          <Check size={17} />
          <span>Добавить желание</span>
        </button>
      </form>
    </ModalDrawer>
  );
};
