'use client';

import React, { useState } from 'react';
import { Lock, Delete, ScanFace, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/telegram';

interface DocumentPinModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const CORRECT_PIN = '1234';

export const DocumentPinModal: React.FC<DocumentPinModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [isBiometricSuccess, setIsBiometricSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    haptic.light();
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      if (newPin === CORRECT_PIN || newPin === '0000') {
        haptic.success();
        setTimeout(() => {
          onSuccess();
          setPin('');
        }, 150);
      } else {
        haptic.heavy();
        setIsError(true);
        setTimeout(() => {
          setPin('');
          setIsError(false);
        }, 600);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      haptic.light();
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleBiometric = () => {
    haptic.medium();
    setIsBiometricSuccess(true);
    setTimeout(() => {
      haptic.success();
      onSuccess();
      setIsBiometricSuccess(false);
      setPin('');
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-xl">
      <div className="w-full max-w-xs flex flex-col items-center">
        {/* Lock Icon */}
        <motion.div
          animate={isError ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-inner"
        >
          {isBiometricSuccess ? (
            <CheckCircle2 size={32} className="text-emerald-500 animate-pulse" />
          ) : (
            <Lock size={28} />
          )}
        </motion.div>

        <h3 className="text-lg font-bold tracking-tight text-foreground">
          Сейф документов
        </h3>
        <p className="text-xs text-muted-foreground text-center mt-1 mb-6">
          Введите 4-значный код безопасности пары
        </p>

        {/* 4 PIN Dots */}
        <motion.div
          animate={isError ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center space-x-4 mb-8"
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isError
                    ? 'bg-red-500 ring-4 ring-red-500/20'
                    : isFilled
                    ? 'bg-primary scale-110 shadow-sm'
                    : 'bg-muted/40 border border-muted'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="w-16 h-16 mx-auto rounded-full bg-card hover:bg-secondary border border-border/80 text-xl font-medium text-foreground flex items-center justify-center ios-tap-scale shadow-sm active:bg-primary/20"
            >
              {digit}
            </button>
          ))}

          {/* Biometric Button */}
          <button
            onClick={handleBiometric}
            className="w-16 h-16 mx-auto rounded-full bg-transparent hover:bg-secondary/50 text-primary flex items-center justify-center ios-tap-scale"
            title="Войти по FaceID / Отпечатку"
          >
            <ScanFace size={24} />
          </button>

          {/* Zero Button */}
          <button
            onClick={() => handleDigit('0')}
            className="w-16 h-16 mx-auto rounded-full bg-card hover:bg-secondary border border-border/80 text-xl font-medium text-foreground flex items-center justify-center ios-tap-scale shadow-sm active:bg-primary/20"
          >
            0
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="w-16 h-16 mx-auto rounded-full bg-transparent hover:bg-secondary/50 text-muted-foreground hover:text-foreground flex items-center justify-center ios-tap-scale"
            title="Стереть"
          >
            <Delete size={22} />
          </button>
        </div>

        {/* Demo Hint & Cancel */}
        <div className="mt-8 flex flex-col items-center space-y-2 text-center">
          <span className="text-[11px] text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-full border border-border">
            💡 Демо-код: <strong className="text-foreground">1234</strong> или нажмите FaceID
          </span>

          <button
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground pt-1"
          >
            Назад к разделам
          </button>
        </div>
      </div>
    </div>
  );
};
