'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  CoupleInfo,
  DocumentItem,
  HeaderStyle,
  TaskItem,
  ThemeId,
  UserProfile,
  WishlistItem,
  UserSizes,
  LoyaltyCard,
} from '../types';
import {
  INITIAL_COUPLE,
  INITIAL_DOCUMENTS,
  INITIAL_TASKS,
  INITIAL_WISHLIST,
  INITIAL_SIZES,
  INITIAL_LOYALTY_CARDS,
} from './mock-data';
import { sendPartnerNotification } from '../telegram-bot';
import { supabase } from '../supabase';
import {
  enqueueTaskMutation,
  getPendingTaskMutations,
  processTaskQueue,
} from '../offline-sync';

interface AppContextType {
  currentUser: UserProfile;
  partnerUser: UserProfile;
  couple: CoupleInfo;
  documents: DocumentItem[];
  wishlist: WishlistItem[];
  tasks: TaskItem[];
  sizes: Record<string, UserSizes>;
  loyaltyCards: LoyaltyCard[];
  theme: ThemeId;
  headerStyle: HeaderStyle;
  isDocumentsUnlocked: boolean;
  isDarkMode: boolean;
  isLoaded: boolean;
  isAuthenticated: boolean;

  // Actions
  switchUser: (userId: string) => void;
  setTheme: (theme: ThemeId) => void;
  setHeaderStyle: (style: HeaderStyle) => void;
  toggleDarkMode: () => void;
  unlockDocuments: () => void;
  lockDocuments: () => void;
  updateCoupleInfo: (data: Partial<CoupleInfo>) => void;
  updateUserProfile: (userId: string, data: Partial<UserProfile>) => void;
  updateUserSizes: (userId: string, data: Partial<UserSizes>) => void;

  // Couple Code Pairing & Auth
  joinCoupleByCode: (code: string) => Promise<{ success: boolean; message: string }>;
  loginWithCoupleCode: (code: string, myName: string, avatar?: string) => Promise<{ success: boolean; message?: string }>;
  loginAsNewCouple: (myName: string, avatar?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateVaultSettings: (pin?: string, isLocked?: boolean) => void;

  // Loyalty Cards
  addLoyaltyCard: (card: Omit<LoyaltyCard, 'id' | 'createdAt' | 'coupleId'>) => void;
  deleteLoyaltyCard: (id: string) => void;

  // Documents
  addDocument: (doc: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt' | 'coupleId'>) => void;
  deleteDocument: (id: string) => void;

  // Wishlist
  addWishlistItem: (item: Omit<WishlistItem, 'id' | 'createdAt' | 'coupleId' | 'isGifted'>) => void;
  deleteWishlistItem: (id: string) => void;
  toggleReserveWishlist: (id: string) => void;
  markAsGifted: (id: string) => void;
  deleteArchivedItem: (id: string) => void;

  // Tasks
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'coupleId' | 'isCompleted'>) => void;
  updateTask: (id: string, data: Partial<TaskItem>) => void;
  toggleTask: (id: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteTask: (id: string) => void;

  // Bot Info
  botUsername: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CURRENT_USER: 'couple_app_current_user',
  COUPLE_ID: 'couple_app_active_couple_id',
  THEME: 'couple_app_theme',
  HEADER_STYLE: 'couple_app_header_style',
  DARK_MODE: 'couple_app_dark_mode',
  COUPLE: 'couple_app_couple_data',
  VAULT_PIN: 'couple_app_vault_pin',
  VAULT_LOCKED: 'couple_app_vault_locked',
  DOCUMENTS: 'couple_app_documents',
  WISHLIST: 'couple_app_wishlist',
  TASKS: 'couple_app_tasks',
  SIZES: 'couple_app_sizes',
  LOYALTY_CARDS: 'couple_app_loyalty_cards',
};

function generateCoupleCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CP-${part1}-${part2}`;
}

const BRUTEFORCE_KEYS = {
  ATTEMPTS: 'couple_app_failed_attempts',
  LOCKOUT_UNTIL: 'couple_app_lockout_until',
};

function checkBruteforceLockout(): { isLocked: boolean; remainingMinutes: number } {
  if (typeof window === 'undefined') return { isLocked: false, remainingMinutes: 0 };
  const lockoutUntil = localStorage.getItem(BRUTEFORCE_KEYS.LOCKOUT_UNTIL);
  if (lockoutUntil) {
    const remainingMs = Number(lockoutUntil) - Date.now();
    if (remainingMs > 0) {
      return { isLocked: true, remainingMinutes: Math.ceil(remainingMs / 60000) };
    } else {
      localStorage.removeItem(BRUTEFORCE_KEYS.LOCKOUT_UNTIL);
      localStorage.removeItem(BRUTEFORCE_KEYS.ATTEMPTS);
    }
  }
  return { isLocked: false, remainingMinutes: 0 };
}

function recordFailedAttempt(): { isLocked: boolean; remainingMinutes: number } {
  if (typeof window === 'undefined') return { isLocked: false, remainingMinutes: 0 };
  const currentAttempts = Number(localStorage.getItem(BRUTEFORCE_KEYS.ATTEMPTS) || '0') + 1;
  localStorage.setItem(BRUTEFORCE_KEYS.ATTEMPTS, String(currentAttempts));

  if (currentAttempts >= 5) {
    const lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
    localStorage.setItem(BRUTEFORCE_KEYS.LOCKOUT_UNTIL, String(lockUntil));
    return { isLocked: true, remainingMinutes: 15 };
  }
  return { isLocked: false, remainingMinutes: 0 };
}

function clearBruteforceAttempts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BRUTEFORCE_KEYS.ATTEMPTS);
  localStorage.removeItem(BRUTEFORCE_KEYS.LOCKOUT_UNTIL);
}

function getClientDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('couple_app_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem('couple_app_device_id', id);
  }
  return id;
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string>('user_alex');
  const [couple, setCouple] = useState<CoupleInfo>(INITIAL_COUPLE);
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [wishlist, setWishlist] = useState<WishlistItem[]>(INITIAL_WISHLIST);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [sizes, setSizes] = useState<Record<string, UserSizes>>(INITIAL_SIZES);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>(INITIAL_LOYALTY_CARDS);
  const [theme, setThemeState] = useState<ThemeId>('rose-gold');
  const [headerStyle, setHeaderStyleState] = useState<HeaderStyle>('widget');
  const [isDocumentsUnlocked, setIsDocumentsUnlocked] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [botUsername, setBotUsername] = useState<string>(
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || ''
  );

  // Fetch data belonging specifically to the active couple
  const loadCoupleData = useCallback(async (coupleId: string, currentId: string) => {
    if (!supabase || !coupleId || coupleId === 'default_couple' || coupleId === 'couple_main') return;

    try {
      // 1. Fetch pair profiles
      const { data: pairProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('couple_id', coupleId);

      if (pairProfiles && pairProfiles.length > 0) {
        const me = pairProfiles.find((p: any) => p.id === currentId) || pairProfiles[0];
        const partner = pairProfiles.find((p: any) => p.id !== currentId);

        setCouple((prev) => ({
          ...prev,
          id: coupleId,
          inviteCode: coupleId,
          partnerA: {
            id: me.id,
            name: me.name,
            avatar: me.avatar || 'memoji_1',
            role: 'partner_a',
            notificationsEnabled: me.notifications_enabled !== undefined ? Boolean(me.notifications_enabled) : true,
          },
          partnerB: partner
            ? {
                id: partner.id,
                name: partner.name,
                avatar: partner.avatar || 'memoji_2',
                role: 'partner_b',
                notificationsEnabled: partner.notifications_enabled !== undefined ? Boolean(partner.notifications_enabled) : true,
              }
            : {
                id: 'waiting',
                name: 'Ожидаем половинку...',
                avatar: 'memoji_2',
                role: 'partner_b',
              },
        }));
      }

      // Fetch couple row for vault settings and anniversary
      const { data: coupleRow } = await supabase
        .from('couples')
        .select('*')
        .eq('id', coupleId)
        .maybeSingle();

      if (coupleRow) {
        setCouple((prev) => {
          const cachedPin =
            (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.VAULT_PIN) : null) ||
            prev.vaultPin;
          const cachedLocked =
            typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEYS.VAULT_LOCKED) !== null
              ? localStorage.getItem(STORAGE_KEYS.VAULT_LOCKED) === 'true'
              : prev.isVaultLocked;

          const resolvedPin = coupleRow.vault_pin || cachedPin || '1234';
          if (coupleRow.vault_pin && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.VAULT_PIN, coupleRow.vault_pin);
          }

          const resolvedLocked =
            coupleRow.is_vault_locked !== undefined && coupleRow.is_vault_locked !== null
              ? Boolean(coupleRow.is_vault_locked)
              : cachedLocked !== undefined
              ? cachedLocked
              : true;

          return {
            ...prev,
            startDate: coupleRow.start_date || prev.startDate,
            anniversaryTitle: coupleRow.anniversary_title || coupleRow.name || prev.anniversaryTitle,
            vaultPin: resolvedPin,
            isVaultLocked: resolvedLocked,
          };
        });
      }

      // 2. Fetch tasks for this couple
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false });

      if (tasksData) {
        const pendingMutations = getPendingTaskMutations();
        const pendingCreated = pendingMutations
          .filter((m) => m.type === 'CREATE_TASK' && m.payload?.id)
          .map((m) => m.payload as TaskItem);
        const pendingDeletedIds = new Set(
          pendingMutations.filter((m) => m.type === 'DELETE_TASK').map((m) => m.payload.id)
        );

        const mappedTasks: TaskItem[] = tasksData
          .filter((row: any) => !pendingDeletedIds.has(row.id))
          .map((row: any) => ({
            id: row.id,
            coupleId,
            title: row.title,
            description: row.description || undefined,
            assignee: row.assigned_to || 'both',
            dueDate: row.due_date,
            isCompleted: Boolean(row.is_completed),
            isMegaTask: Array.isArray(row.subtasks) && row.subtasks.length > 0,
            subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
            creatorId: row.created_by,
            createdAt: row.created_at,
          }));

        // Merge: keep local tasks created offline that haven't landed in Supabase yet
        const serverIds = new Set(mappedTasks.map((t) => t.id));
        const unsyncedToKeep = pendingCreated.filter((t) => !serverIds.has(t.id));
        setTasks([...unsyncedToKeep, ...mappedTasks]);
      }

      // 3. Fetch wishlist for this couple
      const { data: wishData } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false });

      if (wishData) {
        const mappedWishlist: WishlistItem[] = wishData.map((row: any) => ({
          id: row.id,
          coupleId,
          authorId: row.author_id || currentId,
          authorName: row.created_by || 'Партнер',
          title: row.title,
          price: row.price ? Number(row.price) : undefined,
          currency: row.currency || '₽',
          link: row.url || undefined,
          imageUrl: row.image_url || undefined,
          priority: row.priority || 'medium',
          isReservedByPartner: false,
          isGifted: Boolean(row.is_purchased),
          notes: row.description || undefined,
          createdAt: row.created_at,
        }));
        setWishlist(mappedWishlist);
      }

      // 4. Fetch documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('couple_id', coupleId);

      if (docsData && docsData.length > 0) {
        const mappedDocs: DocumentItem[] = docsData.map((d: any) => ({
          id: d.id,
          coupleId,
          title: d.title,
          category: d.category || 'other',
          ownerId: currentId,
          ownerName: 'Я',
          fields: [{ label: 'Номер', value: d.notes || 'Защищено', copyable: true }],
          fileUrl: d.file_url,
          createdAt: d.created_at,
          updatedAt: d.created_at,
        }));
        setDocuments(mappedDocs);
      }

      // 5. Fetch loyalty cards
      const { data: cardsData } = await supabase
        .from('loyalty_cards')
        .select('*')
        .eq('couple_id', coupleId);

      if (cardsData && cardsData.length > 0) {
        const mappedCards: LoyaltyCard[] = cardsData.map((c: any) => ({
          id: c.id,
          coupleId,
          storeName: c.store_name,
          cardNumber: c.barcode,
          barcodeType: 'code128',
          cardColor: c.color || 'from-blue-600 to-indigo-700',
          addedById: currentId,
          createdAt: c.created_at,
        }));
        setLoyaltyCards(mappedCards);
      }
    } catch (e) {
      console.warn('loadCoupleData error:', e);
    }
  }, []);

  // Initialize and check user profile / couple
  useEffect(() => {
    let activeId = 'user_alex';
    let activeCode = '';

    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (savedUser) activeId = savedUser;

      const savedCode = localStorage.getItem(STORAGE_KEYS.COUPLE_ID);
      if (savedCode && savedCode !== 'default_couple' && savedCode !== 'couple_main' && savedCode !== 'LOVE2024' && savedCode.startsWith('CP-')) {
        activeCode = savedCode;
      } else {
        localStorage.removeItem(STORAGE_KEYS.COUPLE_ID);
        activeCode = '';
      }

      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeId | null;
      if (savedTheme) setThemeState(savedTheme);

      const savedHeader = localStorage.getItem(STORAGE_KEYS.HEADER_STYLE) as HeaderStyle | null;
      if (savedHeader) setHeaderStyleState(savedHeader);

      const savedDark = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
      if (savedDark !== null) {
        setIsDarkMode(savedDark === 'true');
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
      }

      // Offline-First Hydration: restore cached data immediately so safe and tasks work with zero internet
      const savedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (savedDocs) {
        try { setDocuments(JSON.parse(savedDocs)); } catch (e) {}
      }
      const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (savedTasks) {
        try { setTasks(JSON.parse(savedTasks)); } catch (e) {}
      }
      const savedWishlist = localStorage.getItem(STORAGE_KEYS.WISHLIST);
      if (savedWishlist) {
        try { setWishlist(JSON.parse(savedWishlist)); } catch (e) {}
      }
      const savedCouple = localStorage.getItem(STORAGE_KEYS.COUPLE);
      const savedPin = localStorage.getItem(STORAGE_KEYS.VAULT_PIN);
      const savedLocked = localStorage.getItem(STORAGE_KEYS.VAULT_LOCKED);

      if (savedCouple) {
        try {
          const parsed = JSON.parse(savedCouple);
          if (savedPin) parsed.vaultPin = savedPin;
          if (savedLocked !== null) parsed.isVaultLocked = savedLocked === 'true';
          setCouple(parsed);
        } catch (e) {}
      } else if (savedPin || savedLocked !== null) {
        setCouple((prev) => ({
          ...prev,
          vaultPin: savedPin || prev.vaultPin,
          isVaultLocked: savedLocked !== null ? savedLocked === 'true' : prev.isVaultLocked,
        }));
      }
      const savedCards = localStorage.getItem(STORAGE_KEYS.LOYALTY_CARDS);
      if (savedCards) {
        try { setLoyaltyCards(JSON.parse(savedCards)); } catch (e) {}
      }
      const savedSizes = localStorage.getItem(STORAGE_KEYS.SIZES);
      if (savedSizes) {
        try { setSizes(JSON.parse(savedSizes)); } catch (e) {}
      }

      // Fetch dynamic bot username from server API
      fetch('/api/telegram/bot-info')
        .then((res) => res.json())
        .then((data) => {
          if (data?.username) setBotUsername(data.username);
        })
        .catch(() => {});

      // Read Cookie (For PWA Home Screen Sync)
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        const pwaAuthCookie = cookies.find(c => c.trim().startsWith('couple_pwa_auth='));
        if (pwaAuthCookie && (!savedUser || savedUser === 'user_alex')) {
          try {
            const val = decodeURIComponent(pwaAuthCookie.split('=')[1]);
            const parsed = JSON.parse(val);
            if (parsed.id) {
              activeId = parsed.id;
              activeCode = parsed.couple_id || activeCode;
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, activeId);
              if (activeCode && activeCode.startsWith('CP-')) {
                localStorage.setItem(STORAGE_KEYS.COUPLE_ID, activeCode);
              }
            }
          } catch (e) {
            console.warn('Failed to parse cookie:', e);
          }
        }
      }

      // Check URL parameters for seamless PWA link authentication
      let urlAuthId: string | null = null;
      let urlAuthName: string | null = null;
      let urlAuthCouple: string | null = null;
      let urlAuthAvatar: string | null = null;
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        urlAuthId = searchParams.get('auth_id');
        urlAuthName = searchParams.get('name');
        urlAuthCouple = searchParams.get('couple');
        urlAuthAvatar = searchParams.get('avatar');
      }

      // Telegram User detection
      let tgUser = null;
      let startParam = '';
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        try {
          window.Telegram.WebApp.ready?.();
          window.Telegram.WebApp.expand?.();
        } catch {}
        tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
        startParam = window.Telegram.WebApp.initDataUnsafe?.start_param || '';
      }

      const incomingCoupleCode =
        (urlAuthCouple && urlAuthCouple.startsWith('CP-'))
          ? urlAuthCouple
          : (startParam && startParam.startsWith('CP-'))
            ? startParam
            : null;

      if (urlAuthId) {
        // Authenticated via PWA / WebApp Link!
        activeId = urlAuthId;
        const pwaCoupleId = incomingCoupleCode;

        setCurrentUserId(activeId);
        setIsAuthenticated(true);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, activeId);
        
        // Save to cookie for PWA handover
        if (typeof document !== 'undefined') {
          const pwaAuthData = JSON.stringify({
            id: activeId,
            name: urlAuthName || 'Пользователь',
            avatar: urlAuthAvatar || 'memoji_1',
            couple_id: pwaCoupleId || ''
          });
          document.cookie = `couple_pwa_auth=${encodeURIComponent(pwaAuthData)}; path=/; max-age=31536000; SameSite=Lax`;
        }

        // Clean query parameters from URL without reloading
        window.history.replaceState({}, '', window.location.pathname);

        if (supabase) {
          (async () => {
            try {
              // Fetch profile from Supabase to resolve real couple
              const { data: existingProf } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', activeId)
                .maybeSingle();

              let resolvedCoupleId = pwaCoupleId || existingProf?.couple_id;
              if (!resolvedCoupleId || !resolvedCoupleId.startsWith('CP-')) {
                resolvedCoupleId = generateCoupleCode();
                await supabase.from('couples').upsert({
                  id: resolvedCoupleId,
                  name: 'Наша семья',
                }, { onConflict: 'id' });
              }

              const role = pwaCoupleId ? 'partner_b' : (existingProf?.role || 'partner_a');

              await supabase.from('profiles').upsert({
                id: activeId,
                telegram_id: Number(activeId) || undefined,
                name: urlAuthName || existingProf?.name || 'Пользователь',
                avatar: urlAuthAvatar || existingProf?.avatar || 'memoji_1',
                couple_id: resolvedCoupleId,
                role,
              }, { onConflict: 'id' });

              localStorage.setItem(STORAGE_KEYS.COUPLE_ID, resolvedCoupleId);
              await loadCoupleData(resolvedCoupleId, activeId);
            } catch (err) {
              console.warn('PWA url auth sync error:', err);
            }
          })();
        }
      } else if (tgUser) {
        activeId = String(tgUser.id);
        const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Пользователь';
        const avatar = tgUser.photo_url || 'memoji_1';

        setCurrentUserId(activeId);
        setIsAuthenticated(true);

        // Supabase Profile & Couple Resolution
        if (supabase) {
          (async () => {
            try {
              // 1. Check existing profile
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', activeId)
                .maybeSingle();

              let userCoupleId = existingProfile?.couple_id;

              const isInvalidCoupleId = (cid?: string | null) =>
                !cid || cid === 'default_couple' || cid === 'couple_main' || cid === 'LOVE2024' || !cid.startsWith('CP-');

              // If invited via deep link start_param or URL query param
              if (incomingCoupleCode) {
                userCoupleId = incomingCoupleCode;
              } else if (isInvalidCoupleId(userCoupleId)) {
                // Discard old default_couple and generate fresh unique couple code!
                userCoupleId = (activeCode && activeCode.startsWith('CP-')) ? activeCode : generateCoupleCode();
                // Ensure couple exists in couples table
                await supabase.from('couples').upsert({
                  id: userCoupleId,
                  name: 'Наша семья',
                }, { onConflict: 'id' });
              }

              const role = incomingCoupleCode ? 'partner_b' : (existingProfile?.role || 'partner_a');

              // Save profile
              await supabase.from('profiles').upsert({
                id: activeId,
                telegram_id: tgUser.id,
                name: fullName,
                username: tgUser.username || null,
                avatar,
                couple_id: userCoupleId,
                role,
              }, { onConflict: 'id' });

              localStorage.setItem(STORAGE_KEYS.COUPLE_ID, userCoupleId);
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, activeId);

              // Load data for this couple
              loadCoupleData(userCoupleId, activeId);

              // Send PWA installation guide to user's Telegram chat once
              const pwaGuideKey = `pwa_guide_sent_${tgUser.id}`;
              if (typeof window !== 'undefined' && !localStorage.getItem(pwaGuideKey)) {
                localStorage.setItem(pwaGuideKey, 'true');
                fetch('/api/telegram/pwa-guide', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    telegramId: tgUser.id,
                    coupleId: userCoupleId,
                    userName: fullName,
                  }),
                }).catch(() => {});
              }
            } catch (err) {
              console.warn('Profile init error:', err);
            }
          })();
        }
      } else if (savedUser && savedUser !== 'user_alex') {
        // Logged in previously in browser/PWA
        setCurrentUserId(savedUser);
        setIsAuthenticated(true);
        if (supabase) {
          (async () => {
            try {
              const { data: existingProf } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', savedUser)
                .maybeSingle();

              let cId = existingProf?.couple_id || savedCode;
              if (!cId || !cId.startsWith('CP-')) {
                cId = generateCoupleCode();
                await supabase.from('couples').upsert({ id: cId, name: 'Наша семья' }, { onConflict: 'id' });
                await supabase.from('profiles').update({ couple_id: cId }).eq('id', savedUser);
              }

              localStorage.setItem(STORAGE_KEYS.COUPLE_ID, cId);
              await loadCoupleData(cId, savedUser);
            } catch (err) {
              console.warn('Resume session error:', err);
            }
          })();
        }
      } else {
        // Not authenticated yet in PWA
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.warn('Init error:', e);
    } finally {
      setIsLoaded(true);
    }
  }, [loadCoupleData]);

  // Realtime Supabase Subscription & Visibility Sync for cross-device updates
  useEffect(() => {
    if (!supabase || !isLoaded || !isAuthenticated || !couple.id || !couple.id.startsWith('CP-')) return;

    let debounceTimer: NodeJS.Timeout;
    const triggerReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadCoupleData(couple.id, currentUserId);
      }, 300);
    };

    const channel = supabase.channel(`couple_sync_${couple.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `couple_id=eq.${couple.id}` },
        () => triggerReload()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishlist_items', filter: `couple_id=eq.${couple.id}` },
        () => triggerReload()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` },
        () => triggerReload()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `couple_id=eq.${couple.id}` },
        () => triggerReload()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `couple_id=eq.${couple.id}` },
        () => triggerReload()
      )
      .subscribe();

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerReload();
      }
    };

    // Background polling reconciliation every 8 seconds while active to guarantee sync
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadCoupleData(couple.id, currentUserId);
      }
    }, 8000);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('focus', handleVisibility);
    }

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(pollInterval);
      if (supabase) {
        supabase.removeChannel(channel);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('focus', handleVisibility);
      }
    };
  }, [isLoaded, isAuthenticated, couple.id, currentUserId, loadCoupleData]);

  // Sync theme and dark mode to document DOM
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, isDarkMode]);

  // Sync to LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, currentUserId);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    localStorage.setItem(STORAGE_KEYS.HEADER_STYLE, headerStyle);
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(isDarkMode));
    localStorage.setItem(STORAGE_KEYS.COUPLE, JSON.stringify(couple));
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEYS.SIZES, JSON.stringify(sizes));
    localStorage.setItem(STORAGE_KEYS.LOYALTY_CARDS, JSON.stringify(loyaltyCards));
  }, [currentUserId, theme, headerStyle, isDarkMode, couple, documents, wishlist, tasks, sizes, loyaltyCards, isLoaded]);

  const currentUser = currentUserId === couple.partnerA.id ? couple.partnerA : couple.partnerB;
  const partnerUser = currentUserId === couple.partnerA.id ? couple.partnerB : couple.partnerA;

  const switchUser = (userId: string) => {
    setCurrentUserId(userId);
  };

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
  };

  const setHeaderStyle = (style: HeaderStyle) => {
    setHeaderStyleState(style);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const unlockDocuments = () => setIsDocumentsUnlocked(true);
  const lockDocuments = () => setIsDocumentsUnlocked(false);

  const updateCoupleInfo = (data: Partial<CoupleInfo>) => {
    if (data.vaultPin !== undefined && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.VAULT_PIN, data.vaultPin);
    }
    if (data.isVaultLocked !== undefined && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.VAULT_LOCKED, String(data.isVaultLocked));
    }

    setCouple((prev) => ({ ...prev, ...data }));

    const activeCoupleId =
      couple.id ||
      (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.COUPLE_ID) : null) ||
      '';

    if (activeCoupleId) {
      // 1. Call server API endpoint to guarantee update & notify partner
      fetch('/api/couple/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: activeCoupleId,
          startDate: data.startDate,
          anniversaryTitle: data.anniversaryTitle,
          vaultPin: data.vaultPin,
          isVaultLocked: data.isVaultLocked,
          senderName: currentUser.name,
        }),
        keepalive: true,
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.ok) console.warn('[updateCoupleInfo] API error:', res.error);
        })
        .catch((err) => console.warn('[updateCoupleInfo] API fetch error:', err));

      // 2. Direct Supabase update as client-side fallback
      const sb = supabase;
      if (sb) {
        const updateData: any = {};
        if (data.startDate !== undefined) updateData.start_date = data.startDate;
        if (data.anniversaryTitle !== undefined) {
          updateData.anniversary_title = data.anniversaryTitle;
          updateData.name = data.anniversaryTitle;
        }
        if (Object.keys(updateData).length > 0) {
          sb.from('couples')
            .update(updateData)
            .eq('id', activeCoupleId)
            .then(({ error }) => {
              if (error && data.startDate !== undefined) {
                sb.from('couples')
                  .update({ start_date: data.startDate })
                  .eq('id', activeCoupleId)
                  .then();
              }
            });
        }
      }
    }
  };

  const updateUserProfile = (userId: string, data: Partial<UserProfile>) => {
    setCouple((prev) => {
      if (prev.partnerA.id === userId) {
        return { ...prev, partnerA: { ...prev.partnerA, ...data } };
      } else if (prev.partnerB.id === userId) {
        return { ...prev, partnerB: { ...prev.partnerB, ...data } };
      }
      return prev;
    });

    if (supabase && userId) {
      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.avatar !== undefined) updates.avatar = data.avatar;
      if (data.notificationsEnabled !== undefined) updates.notifications_enabled = data.notificationsEnabled;
      if (Object.keys(updates).length > 0) {
        supabase.from('profiles').update(updates).eq('id', userId).then();
      }
    }
  };

  // Join couple by code
  const joinCoupleByCode = async (code: string) => {
    const lockout = checkBruteforceLockout();
    if (lockout.isLocked) {
      return {
        success: false,
        message: `⛔ Слишком много неверных попыток. Ввод заблокирован на ${lockout.remainingMinutes} мин. для защиты данных.`,
      };
    }

    const cleanCode = code.trim().toUpperCase();
    if (!supabase) return { success: false, message: 'База данных недоступна' };

    try {
      // Find profiles in target couple
      const { data: foundProfiles, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('couple_id', cleanCode);

      if (fetchErr || !foundProfiles || foundProfiles.length === 0) {
        const failed = recordFailedAttempt();
        if (failed.isLocked) {
          return {
            success: false,
            message: '⛔ 5 неверных попыток. Ввод заблокирован на 15 минут для защиты данных.',
          };
        }
        return { success: false, message: 'Пара с таким кодом не найдена. Проверьте код.' };
      }

      clearBruteforceAttempts();

      if (foundProfiles.length >= 2) {
        return { success: false, message: 'В этой паре уже состоят 2 человека.' };
      }

      // Update current user's profile to this couple_id
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ couple_id: cleanCode, role: 'partner_b' })
        .eq('id', currentUserId);

      if (updateErr) {
        return { success: false, message: updateErr.message };
      }

      // Update localStorage
      localStorage.setItem(STORAGE_KEYS.COUPLE_ID, cleanCode);

      // Notify partner
      const partner = foundProfiles[0];
      if (partner?.telegram_id) {
        sendPartnerNotification({
          senderName: currentUser.name,
          recipientChatId: partner.telegram_id,
          action: 'task_created',
          itemTitle: `🎉 ${currentUser.name} присоединился(-лась) к вашей паре!`,
        });
      }

      // Reload data for the new couple!
      await loadCoupleData(cleanCode, currentUserId);

      return { success: true, message: 'Успешно' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Ошибка соединения' };
    }
  };

  // Login with existing couple code (PWA / Browser)
  const loginWithCoupleCode = async (code: string, myName: string, avatar: string = 'memoji_2') => {
    const lockout = checkBruteforceLockout();
    if (lockout.isLocked) {
      return {
        success: false,
        message: `⛔ Слишком много неверных попыток. Ввод заблокирован на ${lockout.remainingMinutes} мин. для защиты данных.`,
      };
    }

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return { success: false, message: 'Введите код пары' };
    if (!myName.trim()) return { success: false, message: 'Введите ваше имя' };
    if (!supabase) return { success: false, message: 'База данных недоступна' };

    try {
      const { data: existingProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('couple_id', cleanCode);

      if (error || !existingProfiles || existingProfiles.length === 0) {
        const failed = recordFailedAttempt();
        if (failed.isLocked) {
          return {
            success: false,
            message: '⛔ 5 неверных попыток. Ввод заблокирован на 15 минут для защиты данных.',
          };
        }
        return { success: false, message: 'Пара с таким кодом не найдена. Проверьте код.' };
      }

      clearBruteforceAttempts();

      const cleanName = myName.trim();
      const currentDeviceId = getClientDeviceId();

      // Check if user is trying to log back into their existing profile
      const existingUser = existingProfiles.find(
        (p: any) => p.name.trim().toLowerCase() === cleanName.toLowerCase()
      );

      let myId: string;

      if (existingUser) {
        // ENFORCE SINGLE SESSION ON PWA:
        if (existingUser.active_device_id && existingUser.active_device_id !== currentDeviceId) {
          return {
            success: false,
            message: `⚠️ Профиль «${existingUser.name}» уже активен на другом телефоне! Сначала нажмите «Выйти» на основном устройстве или отправьте команду /logout в нашем Telegram-боте.`,
          };
        }

        myId = existingUser.id;

        // Optionally update their avatar and bind active device id
        const updates: any = { active_device_id: currentDeviceId };
        if (avatar && existingUser.avatar !== avatar) updates.avatar = avatar;
        await supabase.from('profiles').update(updates).eq('id', myId);
      } else {
        // Trying to join as a new partner
        if (existingProfiles.length >= 2) {
          return { success: false, message: 'В этой паре уже зарегистрировано 2 партнера. Убедитесь, что вы вводите своё имя точно так же, как при регистрации.' };
        }

        myId = `user_${Date.now()}`;
        await supabase.from('profiles').insert({
          id: myId,
          couple_id: cleanCode,
          name: cleanName,
          avatar,
          role: 'partner_b',
          active_device_id: currentDeviceId,
        });
      }

      setCurrentUserId(myId);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, myId);
      localStorage.setItem(STORAGE_KEYS.COUPLE_ID, cleanCode);
      
      // Also set a cookie so standalone PWA can inherit the session from Safari
      if (typeof document !== 'undefined') {
        const pwaAuthData = JSON.stringify({
          id: myId,
          name: cleanName,
          avatar: avatar || existingUser?.avatar || 'memoji_1',
          couple_id: cleanCode
        });
        document.cookie = `couple_pwa_auth=${encodeURIComponent(pwaAuthData)}; path=/; max-age=31536000; SameSite=Lax`;
      }
      
      setIsAuthenticated(true);

      // Notify partner
      const partner = existingProfiles[0];
      if (partner?.telegram_id) {
        sendPartnerNotification({
          coupleId: cleanCode,
          senderName: cleanName,
          recipientChatId: partner.telegram_id,
          action: 'task_created',
          itemTitle: `🎉 ${cleanName} подключился(-лась) к вашей паре!`,
        });
      }

      await loadCoupleData(cleanCode, myId);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Ошибка соединения' };
    }
  };

  // Login as a brand new couple (PWA / Browser)
  const loginAsNewCouple = async (myName: string, avatar: string = 'memoji_1') => {
    const cleanName = myName.trim();
    if (!cleanName) return { success: false, message: 'Введите ваше имя' };
    const newCode = generateCoupleCode();
    const myId = `user_${Date.now()}`;
    const currentDeviceId = getClientDeviceId();

    if (supabase) {
      try {
        await supabase.from('couples').upsert(
          {
            id: newCode,
            name: 'Наша семья',
          },
          { onConflict: 'id' }
        );

        await supabase.from('profiles').insert({
          id: myId,
          couple_id: newCode,
          name: cleanName,
          avatar,
          role: 'partner_a',
          active_device_id: currentDeviceId,
        });
      } catch (err) {
        console.warn('Supabase create couple error:', err);
      }
    }

    setCurrentUserId(myId);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, myId);
    localStorage.setItem(STORAGE_KEYS.COUPLE_ID, newCode);
    setCouple((prev) => ({
      ...prev,
      id: newCode,
      inviteCode: newCode,
      partnerA: {
        id: myId,
        name: cleanName,
        avatar,
        role: 'partner_a',
      },
      partnerB: {
        id: 'waiting',
        name: 'Ожидаем половинку...',
        avatar: 'memoji_2',
        role: 'partner_b',
      },
    }));
    setIsAuthenticated(true);
    if (supabase) await loadCoupleData(newCode, myId);
    return { success: true };
  };

  // Logout / Disconnect Device
  const logout = async () => {
    try {
      if (supabase && currentUserId) {
        await supabase.from('profiles').update({ active_device_id: null }).eq('id', currentUserId);
      }
    } catch (err) {
      console.warn('Logout active_device_id clear error:', err);
    }

    if (typeof document !== 'undefined') {
      document.cookie = 'couple_pwa_auth=; path=/; max-age=0';
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.COUPLE_ID);
    setIsAuthenticated(false);
    setCurrentUserId('user_alex');
    setCouple(INITIAL_COUPLE);
  };

  // Update Vault Security Settings (PIN code, lock state)
  const updateVaultSettings = async (pin?: string, isLocked?: boolean) => {
    if (typeof window !== 'undefined') {
      if (pin !== undefined) localStorage.setItem(STORAGE_KEYS.VAULT_PIN, pin);
      if (isLocked !== undefined) localStorage.setItem(STORAGE_KEYS.VAULT_LOCKED, String(isLocked));
    }

    setCouple((prev) => ({
      ...prev,
      vaultPin: pin !== undefined ? pin : prev.vaultPin,
      isVaultLocked: isLocked !== undefined ? isLocked : prev.isVaultLocked,
    }));

    const activeCoupleId =
      couple.id ||
      (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.COUPLE_ID) : null) ||
      '';

    if (activeCoupleId) {
      // 1. Update via server API (handles retry and partner notify)
      fetch('/api/couple/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId: activeCoupleId,
          vaultPin: pin,
          isVaultLocked: isLocked,
          senderName: currentUser.name,
        }),
        keepalive: true,
      }).catch((err) => console.warn('[updateVaultSettings] API error:', err));

      // 2. Direct Supabase update as fallback
      if (supabase) {
        const updateData: any = {};
        if (pin !== undefined) updateData.vault_pin = pin;
        if (isLocked !== undefined) updateData.is_vault_locked = isLocked;
        try {
          await supabase.from('couples').update(updateData).eq('id', activeCoupleId);
        } catch (err) {
          console.warn('Could not update vault settings in supabase:', err);
        }
      }
    }
  };

  // Documents
  const addDocument = (doc: Omit<DocumentItem, 'id' | 'createdAt' | 'updatedAt' | 'coupleId'>) => {
    const newDoc: DocumentItem = {
      ...doc,
      id: `doc_${Date.now()}`,
      coupleId: couple.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDocuments((prev) => [newDoc, ...prev]);

    if (supabase) {
      supabase.from('documents').insert({
        id: newDoc.id,
        couple_id: couple.id,
        title: newDoc.title,
        category: newDoc.category,
        notes: newDoc.notes,
        file_url: newDoc.fileUrl,
      }).then();
    }

    sendPartnerNotification({
      coupleId: couple.id,
      senderName: currentUser.name,
      action: 'doc_added',
      itemTitle: newDoc.title,
    });
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (supabase) {
      supabase.from('documents').delete().eq('id', id).then();
    }
  };

  // Wishlist
  const addWishlistItem = (
    item: Omit<WishlistItem, 'id' | 'createdAt' | 'coupleId' | 'isGifted'>
  ) => {
    const newItem: WishlistItem = {
      ...item,
      id: `wish_${Date.now()}`,
      coupleId: couple.id,
      isGifted: false,
      createdAt: new Date().toISOString(),
    };
    setWishlist((prev) => [newItem, ...prev]);

    if (supabase) {
      supabase.from('wishlist_items').insert({
        id: newItem.id,
        couple_id: couple.id,
        title: newItem.title,
        description: newItem.notes,
        price: newItem.price,
        currency: newItem.currency,
        url: newItem.link,
        image_url: newItem.imageUrl,
        is_purchased: false,
        priority: newItem.priority,
        created_by: currentUser.name,
      }).then();
    }

    sendPartnerNotification({
      coupleId: couple.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      action: 'wish_added',
      itemTitle: newItem.title,
    });
  };

  const deleteWishlistItem = (id: string) => {
    setWishlist((prev) => prev.filter((w) => w.id !== id));
    if (supabase) {
      supabase.from('wishlist_items').delete().eq('id', id).then();
    }
  };

  const toggleReserveWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isNowReserved = !item.isReservedByPartner;
          return {
            ...item,
            isReservedByPartner: isNowReserved,
            reservedAt: isNowReserved ? new Date().toISOString() : undefined,
          };
        }
        return item;
      })
    );
  };

  const markAsGifted = (id: string) => {
    setWishlist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            isGifted: true,
            giftedAt: new Date().toISOString(),
          };
        }
        return item;
      })
    );
    if (supabase) {
      supabase
        .from('wishlist_items')
        .update({ is_purchased: true })
        .eq('id', id)
        .then();
    }
  };

  const deleteArchivedItem = (id: string) => {
    setWishlist((prev) => prev.filter((w) => w.id !== id));
    if (supabase) {
      supabase.from('wishlist_items').delete().eq('id', id).then();
    }
  };

  // Tasks
  const addTask = (task: Omit<TaskItem, 'id' | 'createdAt' | 'coupleId' | 'isCompleted'>) => {
    const newTask: TaskItem = {
      ...task,
      id: `task_${Date.now()}`,
      coupleId: couple.id,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);

    enqueueTaskMutation({
      type: 'CREATE_TASK',
      payload: newTask,
      coupleId: couple.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
    });
  };

  const updateTask = (id: string, data: Partial<TaskItem>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t))
    );

    enqueueTaskMutation({
      type: 'UPDATE_TASK',
      payload: { id, data },
      coupleId: couple.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
    });
  };

  const toggleTask = (id: string) => {
    let toggledTitle = '';
    let isNowCompleted = false;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          isNowCompleted = !t.isCompleted;
          toggledTitle = t.title;
          return {
            ...t,
            isCompleted: isNowCompleted,
            completedAt: isNowCompleted ? new Date().toISOString() : undefined,
          };
        }
        return t;
      })
    );

    enqueueTaskMutation({
      type: 'TOGGLE_TASK',
      payload: { id, completed: isNowCompleted, title: toggledTitle },
      coupleId: couple.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
    });
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    let updatedSubtasks: any[] = [];
    let allCompleted = false;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          updatedSubtasks = t.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
          );
          allCompleted =
            updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.isCompleted);

          return {
            ...t,
            subtasks: updatedSubtasks,
            isCompleted: allCompleted,
          };
        }
        return t;
      })
    );

    enqueueTaskMutation({
      type: 'TOGGLE_SUBTASK',
      payload: { taskId, subtasks: updatedSubtasks, allCompleted },
      coupleId: couple.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
    });
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));

    enqueueTaskMutation({
      type: 'DELETE_TASK',
      payload: { id },
      coupleId: couple.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
    });
  };

  // Sizes
  const updateUserSizes = (userId: string, data: Partial<UserSizes>) => {
    setSizes((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        ...data,
      },
    }));
  };

  // Loyalty Cards
  const addLoyaltyCard = (card: Omit<LoyaltyCard, 'id' | 'createdAt' | 'coupleId'>) => {
    const newCard: LoyaltyCard = {
      ...card,
      id: `card_${Date.now()}`,
      coupleId: couple.id,
      createdAt: new Date().toISOString(),
    };
    setLoyaltyCards((prev) => [newCard, ...prev]);
    if (supabase) {
      supabase.from('loyalty_cards').insert({
        id: newCard.id,
        couple_id: couple.id,
        store_name: newCard.storeName,
        barcode: newCard.cardNumber,
        color: newCard.cardColor,
      }).then();
    }
  };

  const deleteLoyaltyCard = (id: string) => {
    setLoyaltyCards((prev) => prev.filter((c) => c.id !== id));
    if (supabase) {
      supabase.from('loyalty_cards').delete().eq('id', id).then();
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        partnerUser,
        couple,
        documents,
        wishlist,
        tasks,
        sizes,
        loyaltyCards,
        theme,
        headerStyle,
        isDocumentsUnlocked,
        isDarkMode,
        isLoaded,
        isAuthenticated,
        switchUser,
        setTheme,
        setHeaderStyle,
        toggleDarkMode,
        unlockDocuments,
        lockDocuments,
        updateCoupleInfo,
        updateUserProfile,
        updateUserSizes,
        joinCoupleByCode,
        loginWithCoupleCode,
        loginAsNewCouple,
        logout,
        updateVaultSettings,
        addLoyaltyCard,
        deleteLoyaltyCard,
        addDocument,
        deleteDocument,
        addWishlistItem,
        deleteWishlistItem,
        toggleReserveWishlist,
        markAsGifted,
        deleteArchivedItem,
        addTask,
        updateTask,
        toggleTask,
        toggleSubtask,
        deleteTask,
        botUsername,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return context;
}
