/**
 * Telegram WebApp SDK helper & Haptic Feedback wrapper with browser fallback
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
          start_param?: string;
        };
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        isExpanded?: boolean;
        viewportHeight?: number;
        viewportStableHeight?: number;
        headerColor?: string;
        backgroundColor?: string;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        BackButton?: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
      };
    };
  }
}

export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.Telegram?.WebApp?.initData || window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any)?.standalone === true
  );
}

export function initTelegramApp() {
  if (typeof window === 'undefined') return;
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }
}

export const haptic = {
  light: () => {
    if (typeof window === 'undefined') return;
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    } else if (navigator?.vibrate) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if (typeof window === 'undefined') return;
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    } else if (navigator?.vibrate) {
      navigator.vibrate(20);
    }
  },
  heavy: () => {
    if (typeof window === 'undefined') return;
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    } else if (navigator?.vibrate) {
      navigator.vibrate([30, 20, 30]);
    }
  },
  success: () => {
    if (typeof window === 'undefined') return;
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    } else if (navigator?.vibrate) {
      navigator.vibrate([15, 30, 15]);
    }
  },
  warning: () => {
    if (typeof window === 'undefined') return;
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
    } else if (navigator?.vibrate) {
      navigator.vibrate([25, 40, 25]);
    }
  },
  selection: () => {
    if (typeof window === 'undefined') return;
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.selectionChanged();
    } else if (navigator?.vibrate) {
      navigator.vibrate(5);
    }
  },
  impact: (style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' = 'medium') => {
    if (style === 'light' || style === 'soft') {
      haptic.light();
    } else if (style === 'heavy' || style === 'rigid') {
      haptic.heavy();
    } else {
      haptic.medium();
    }
  },
  notification: (type: 'error' | 'success' | 'warning' = 'success') => {
    if (type === 'error' || type === 'warning') {
      haptic.warning();
    } else {
      haptic.success();
    }
  },
};
