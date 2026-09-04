'use client';

import React, { useState } from 'react';
import { Copy, Check, Eye, EyeOff, FileText, Download, Trash2, Shield, Plane, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentItem } from '@/lib/types';
import { haptic } from '@/lib/telegram';

interface DocumentCardProps {
  document: DocumentItem;
  onDelete: (id: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onDelete }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleCopy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(label);
    haptic.success();
    setTimeout(() => {
      setCopiedField(null);
    }, 1800);
  };

  const toggleReveal = (label: string) => {
    haptic.light();
    setRevealedFields((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const getCategoryIcon = () => {
    switch (document.category) {
      case 'passport':
      case 'international_passport':
        return <Shield className="text-primary" size={18} />;
      case 'tickets':
        return <Plane className="text-accent" size={18} />;
      default:
        return <FileText className="text-primary" size={18} />;
    }
  };

  const handleDownload = () => {
    haptic.medium();
    if (document.fileUrl) {
      const a = window.document.createElement('a');
      a.href = document.fileUrl;
      a.download = document.fileName || `${document.title}.png`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    } else {
      alert(`Скачивание файла: ${document.fileName || document.title}`);
    }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="ios-card overflow-hidden transition-shadow duration-200"
      >
        {/* Wallet Header Strip */}
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-border/40 bg-secondary/30">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-light dark:bg-primary/20 flex items-center justify-center shrink-0">
              {getCategoryIcon()}
            </div>
            <div>
              <h4 className="text-[14px] font-bold tracking-tight text-foreground">
                {document.title}
              </h4>
              <span className="text-[11px] font-semibold text-primary">
                {document.ownerName}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm(`Удалить документ «${document.title}»?`)) {
                haptic.warning();
                onDelete(document.id);
              }
            }}
            className="w-7 h-7 rounded-full bg-secondary/80 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors ios-press"
            title="Удалить документ"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>

        {/* Fields List */}
        <div className="p-3 space-y-1.5">
          {document.fields.map((field) => {
            const isRevealed = revealedFields[field.label];
            const displayValue =
              field.masked && !isRevealed
                ? field.value.replace(/.(?=.{4})/g, '•')
                : field.value;
            const isCopied = copiedField === field.label;

            return (
              <div
                key={field.label}
                className="flex items-center justify-between p-2.5 rounded-[14px] bg-secondary/40 hover:bg-secondary/70 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    {field.label}
                  </span>
                  <span className="text-[13px] font-mono font-medium text-foreground tracking-wide truncate block select-all">
                    {displayValue}
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  {field.masked && (
                    <button
                      onClick={() => toggleReveal(field.label)}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                      title={isRevealed ? 'Скрыть номер' : 'Показать номер'}
                    >
                      {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}

                  {field.copyable !== false && (
                    <button
                      onClick={() => handleCopy(field.label, field.value)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ios-press ${
                        isCopied
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-card text-foreground hover:bg-primary hover:text-white border border-border/50'
                      }`}
                      title="Скопировать"
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} strokeWidth={3} />
                          <span>Готово</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Копия</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Attached Scan & Download Section */}
        {(document.fileName || document.fileUrl) && (
          <div className="px-4 py-2.5 border-t border-border/40 bg-secondary/20 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 min-w-0 flex-1 pr-2">
              {document.fileUrl && document.fileType !== 'pdf' ? (
                <div
                  onClick={() => setIsPreviewOpen(true)}
                  className="w-7 h-7 rounded-[6px] overflow-hidden bg-background shrink-0 border border-border/60 cursor-pointer hover:scale-105 transition-transform"
                  title="Нажмите, чтобы просмотреть скан"
                >
                  <img src={document.fileUrl} alt="Скан" className="w-full h-full object-cover" />
                </div>
              ) : (
                <FileText size={14} className="text-primary shrink-0" />
              )}
              <span className="font-medium text-muted-foreground truncate">
                {document.fileName || 'Прикрепленный скан'}
              </span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {document.fileUrl && document.fileType !== 'pdf' && (
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="font-bold text-primary hover:underline"
                >
                  Смотреть
                </button>
              )}

              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center space-x-1 font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-full bg-secondary/80"
                title="Скачать файл на устройство"
              >
                <Download size={12} />
                <span>Скачать</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Fullscreen Photo Lightbox Modal */}
      <AnimatePresence>
        {isPreviewOpen && document.fileUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full bg-card rounded-[28px] overflow-hidden shadow-2xl border border-border flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b border-border/50">
                <span className="font-bold text-sm truncate">{document.title}</span>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground ios-press"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 max-h-[70vh] overflow-auto flex items-center justify-center bg-black/40">
                <img
                  src={document.fileUrl}
                  alt={document.title}
                  className="max-h-full max-w-full object-contain rounded-[14px]"
                />
              </div>

              <div className="p-3 bg-secondary/50 flex justify-end">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold shadow-md flex items-center space-x-1.5 ios-press"
                >
                  <Download size={13} />
                  <span>Скачать оригинал</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
