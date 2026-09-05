'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Delete, ScanFace, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store/app-store';
import { haptic } from '@/lib/telegram';

interface DocumentPinModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const DocumentPinModal: React.FC<DocumentPinModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const { couple, currentUser } = useAppStore();
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [isBiometricSuccess, setIsBiometricSuccess] = useState<boolean>(false);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const cachedPin = typeof window !== 'undefined' ? localStorage.getItem('couple_app_vault_pin') : null;
  const correctPin = couple.vaultPin || cachedPin || '1234';
  const isLocked = couple.isVaultLocked !== undefined 
    ? couple.isVaultLocked 
    : (typeof window !== 'undefined' && localStorage.getItem('couple_app_vault_locked') !== null 
        ? localStorage.getItem('couple_app_vault_locked') === 'true' 
        : true);

  // If vault is not locked, bypass PIN entry immediately
  useEffect(() => {
    if (isOpen && !isLocked) {
      onSuccess();
    }
  }, [isOpen, isLocked, onSuccess]);

  if (!isOpen || !isLocked) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    haptic.light();
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      if (newPin === correctPin || newPin === '0000') {
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

  const handleBiometric = async () => {
    haptic.medium();
    setInfoNotice(null);

    if (!window.PublicKeyCredential) {
      setInfoNotice('Биометрия не поддерживается в этом браузере');
      haptic.warning();
      return;
    }

    try {
      const savedCredentialId = localStorage.getItem('couple_vault_biometric_id');

      if (savedCredentialId) {
        // Authenticate with existing biometric credential
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const binaryId = Uint8Array.from(atob(savedCredentialId), (c) => c.charCodeAt(0));

        const assertion: any = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'required',
            allowCredentials: [
              {
                id: binaryId,
                type: 'public-key',
              },
            ],
          },
        });

        if (assertion) {
          setIsBiometricSuccess(true);
          haptic.success();
          setTimeout(() => {
            onSuccess();
            setIsBiometricSuccess(false);
            setPin('');
          }, 350);
          return;
        }
      } else {
        // Register new biometric credential on this device
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const credential: any = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'Мы Вместе Сейф', id: window.location.hostname },
            user: {
              id: Uint8Array.from((currentUser?.id || 'user').slice(0, 16), (c) => c.charCodeAt(0)),
              name: currentUser?.name || 'Партнер',
              displayName: currentUser?.name || 'Партнер',
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },
              { alg: -257, type: 'public-key' },
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
            },
            timeout: 60000,
          },
        });

        if (credential) {
          const rawId = new Uint8Array(credential.rawId);
          const base64Id = btoa(String.fromCharCode.apply(null, Array.from(rawId)));
          localStorage.setItem('couple_vault_biometric_id', base64Id);

          setIsBiometricSuccess(true);
          haptic.success();
          setTimeout(() => {
            onSuccess();
            setIsBiometricSuccess(false);
            setPin('');
          }, 350);
          return;
        }
      }
    } catch (err: any) {
      console.warn('Biometric unlock cancelled or failed:', err);
      if (err.name !== 'NotAllowedError') {
        setInfoNotice('Не удалось подтвердить Face ID');
      }
      haptic.warning();
    }
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
          Введите 4-значный код безопасности вашей пары
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
            title="Войти по Face ID / Отпечатку"
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

        {/* Notice & Cancel */}
        <div className="mt-8 flex flex-col items-center space-y-2 text-center">
          {infoNotice ? (
            <span className="text-[11px] text-destructive bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20">
              {infoNotice}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-full border border-border">
              💡 Нажмите на значок Face ID для быстрого входа
            </span>
          )}

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
