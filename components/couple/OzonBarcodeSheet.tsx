'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Smartphone, Check, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { LoyaltyCard } from '@/lib/types';
import { haptic } from '@/lib/telegram';

interface OzonBarcodeSheetProps {
  card: LoyaltyCard | null;
  onClose: () => void;
}

export const OzonBarcodeSheet: React.FC<OzonBarcodeSheetProps> = ({ card, onClose }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (card && card.barcodeType !== 'qr' && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, card.cardNumber.replace(/\s+/g, ''), {
          format: card.barcodeType === 'ean13' ? 'EAN13' : 'CODE128',
          lineColor: '#000000',
          width: 2.2,
          height: 100,
          displayValue: false,
          margin: 10,
        });
      } catch (err) {
        // Fallback to CODE128 if EAN-13 fails checksum
        try {
          JsBarcode(barcodeRef.current, card.cardNumber, {
            format: 'CODE128',
            lineColor: '#000000',
            width: 2,
            height: 100,
            displayValue: false,
            margin: 10,
          });
        } catch (e) {
          console.error('Barcode render error:', e);
        }
      }
    }
  }, [card]);

  if (!card) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(card.cardNumber);
    haptic.selection();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-start bg-black/75 backdrop-blur-md">
        {/* Backdrop tap to close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* OZON Style Top-Down Sheet */}
        <motion.div
          initial={{ y: '-100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: -200, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.y < -80 || info.velocity.y < -300) {
              onClose();
            }
          }}
          className="relative z-10 w-full max-w-md mx-auto rounded-b-[36px] bg-white text-zinc-950 p-6 shadow-2xl overflow-hidden flex flex-col items-center"
        >
          {/* Header Bar */}
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700">
                <Smartphone size={16} />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-zinc-900">
                  {card.storeName}
                </h3>
                <span className="text-[11px] text-zinc-500 font-medium">
                  Скидочная карта
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                haptic.light();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 ios-press transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* High Contrast White Container for Scanners */}
          <div className="w-full my-3 p-5 rounded-2xl border-2 border-zinc-200 bg-white flex flex-col items-center justify-center shadow-xs">
            {card.imageUri ? (
              <img
                src={card.imageUri}
                alt={card.storeName}
                className="max-h-64 object-contain rounded-lg"
              />
            ) : card.barcodeType === 'qr' ? (
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <QRCodeSVG
                  value={card.cardNumber}
                  size={210}
                  level="H"
                  includeMargin={true}
                />
              </div>
            ) : (
              <div className="w-full flex justify-center py-2 overflow-x-auto">
                <svg ref={barcodeRef} className="max-w-full" />
              </div>
            )}

            {/* Formatted Number under Barcode */}
            <div className="mt-3 flex items-center space-x-2">
              <span className="font-mono text-base font-black tracking-widest text-zinc-900">
                {card.cardNumber}
              </span>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 ios-press"
                title="Скопировать номер"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Hint Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold mb-2">
            <Sun size={13} className="text-amber-600 animate-pulse" />
            <span>Максимальная яркость экрана для кассы</span>
          </div>

          {/* Pull-up Indicator Handle */}
          <div className="mt-2 flex flex-col items-center cursor-pointer" onClick={onClose}>
            <div className="w-10 h-1.5 rounded-full bg-zinc-300 mb-1" />
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Потяните вверх, чтобы закрыть
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
