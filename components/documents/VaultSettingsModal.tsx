'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Lock, Unlock, ScanFace, Check, KeyRound, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { haptic } from '@/lib/telegram';

interface VaultSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VaultSettingsModal: React.FC<VaultSettingsModalProps> = ({ isOpen, onClose }) => {
  const { couple, updateVaultSettings, currentUser } = useAppStore();

  const cachedPin = typeof window !== 'undefined' ? localStorage.getItem('couple_app_vault_pin') : null;
  const currentPin = couple.vaultPin || cachedPin || '1234';
  const isLocked = couple.isVaultLocked !== undefined 
    ? couple.isVaultLocked 
    : (typeof window !== 'undefined' && localStorage.getItem('couple_app_vault_locked') !== null 
        ? localStorage.getItem('couple_app_vault_locked') === 'true' 
        : true);

  const [pinEnabled, setPinEnabled] = useState<boolean>(isLocked);
  const [oldPin, setOldPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isBiometricSaved, setIsBiometricSaved] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('couple_vault_biometric_id'));
    }
    return false;
  });

  if (!isOpen) return null;

  const handleTogglePin = (enabled: boolean) => {
    haptic.selection();
    setPinEnabled(enabled);
    updateVaultSettings(undefined, enabled);
    setSuccessMsg(enabled ? 'PIN-код для сейфа активирован' : 'Защита сейфа паролем отключена');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Accept current PIN, or emergency recovery codes 0000 / 1234
    if (oldPin !== currentPin && oldPin !== '0000' && oldPin !== '1234') {
      haptic.warning();
      setErrorMsg('Текущий PIN-код введен неверно');
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      haptic.warning();
      setErrorMsg('Новый PIN должен состоять ровно из 4 цифр');
      return;
    }

    if (newPin !== confirmPin) {
      haptic.warning();
      setErrorMsg('Новые PIN-коды не совпадают');
      return;
    }

    haptic.success();
    updateVaultSettings(newPin, true);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setSuccessMsg('PIN-код успешно изменен!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSetupBiometrics = async () => {
    haptic.medium();
    setErrorMsg(null);

    if (!window.PublicKeyCredential) {
      setErrorMsg('Биометрия (Face ID / Touch ID) не поддерживается этим браузером');
      haptic.warning();
      return;
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential: any = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Мы Вместе Сейф', id: window.location.hostname },
          user: {
            id: Uint8Array.from(currentUser.id.slice(0, 16), (c) => c.charCodeAt(0)),
            name: currentUser.name || 'Партнер',
            displayName: currentUser.name || 'Партнер',
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
        setIsBiometricSaved(true);
        haptic.success();
        setSuccessMsg('Face ID / Touch ID успешно привязан!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      console.warn('Biometric setup error:', err);
      setErrorMsg(err.name === 'NotAllowedError' ? 'Вход по биометрии был отклонен' : 'Не удалось настроить биометрию');
      haptic.warning();
    }
  };

  const handleRemoveBiometrics = () => {
    haptic.light();
    localStorage.removeItem('couple_vault_biometric_id');
    setIsBiometricSaved(false);
    setSuccessMsg('Биометрия отключена');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative w-full max-w-sm rounded-[32px] ios-glass-card p-6 border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={() => {
              haptic.light();
              onClose();
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground ios-press"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Shield size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-foreground">
                Настройки сейфа
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                Безопасность документов и билетов
              </p>
            </div>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-3 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
              <Check size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Option 1: Lock Toggle */}
          <div className="p-4 rounded-2xl bg-secondary/70 border border-border space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {pinEnabled ? (
                  <Lock size={18} className="text-primary" />
                ) : (
                  <Unlock size={18} className="text-muted-foreground" />
                )}
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Защита паролем
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {pinEnabled ? 'PIN-код запрашивается при входе' : 'Сейф открыт без ввода пароля'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTogglePin(!pinEnabled)}
                className={`w-12 h-7 rounded-full transition-colors p-1 relative ios-press ${
                  pinEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    pinEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Option 2: Face ID / Touch ID Biometrics */}
          <div className="p-4 rounded-2xl bg-secondary/70 border border-border space-y-2.5 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ScanFace size={18} className="text-primary" />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Вход по Face ID / Touch ID
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    {isBiometricSaved
                      ? 'Биометрия этого устройства подключена'
                      : 'Открытие сейфа взглядом или пальцем'}
                  </span>
                </div>
              </div>
            </div>

            {isBiometricSaved ? (
              <button
                type="button"
                onClick={handleRemoveBiometrics}
                className="w-full py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-[11px] font-bold transition-all ios-press"
              >
                Отключить Face ID на этом устройстве
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSetupBiometrics}
                className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold shadow-xs hover:bg-primary-hover transition-all flex items-center justify-center gap-1.5 ios-press"
              >
                <ScanFace size={14} />
                <span>Привязать Face ID / Отпечаток</span>
              </button>
            )}
          </div>

          {/* Option 3: Change 4-digit PIN */}
          {pinEnabled && (
            <form onSubmit={handleChangePin} className="p-4 rounded-2xl bg-secondary/70 border border-border space-y-3">
              <div className="flex items-center space-x-2">
                <KeyRound size={16} className="text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Изменить 4-значный PIN
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                  Текущий PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border text-center text-sm font-mono tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                    Новый PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-center text-sm font-mono tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                    Повторите
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-center text-sm font-mono tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary-hover transition-all ios-press"
              >
                Сохранить новый PIN
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
