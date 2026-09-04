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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CURRENT_USER: 'couple_app_current_user',
  COUPLE_ID: 'couple_app_active_couple_id',
  THEME: 'couple_app_theme',
  HEADER_STYLE: 'couple_app_header_style',
  DARK_MODE: 'couple_app_dark_mode',
  COUPLE: 'couple_app_couple_data',
  DOCUMENTS: 'couple_app_documents',
  WISHLIST: 'couple_app_wishlist',
  TASKS: 'couple_app_tasks',
  SIZES: 'couple_app_sizes',
  LOYALTY_CARDS: 'couple_app_loyalty_cards',
};

function generateCoupleCode(): string {
  return `CP-${Math.floor(1000 + Math.random() * 9000)}`;
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
          },
          partnerB: partner
            ? {
                id: partner.id,
                name: partner.name,
                avatar: partner.avatar || 'memoji_2',
                role: 'partner_b',
              }
            : {
                id: 'waiting',
                name: 'Ожидаем половинку...',
                avatar: 'memoji_2',
                role: 'partner_b',
              },
        }));
      }

      // 2. Fetch tasks for this couple
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false });

      if (tasksData) {
        const mappedTasks: TaskItem[] = tasksData.map((row: any) => ({
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
        setTasks(mappedTasks);
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
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe) {
        tgUser = window.Telegram.WebApp.initDataUnsafe.user;
        startParam = window.Telegram.WebApp.initDataUnsafe.start_param || '';
      }

      if (urlAuthId) {
        // Authenticated via PWA Link!
        activeId = urlAuthId;
        const pwaCoupleId = (urlAuthCouple && urlAuthCouple.startsWith('CP-')) ? urlAuthCouple : null;

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

              let resolvedCoupleId = existingProf?.couple_id;
              if (!resolvedCoupleId || !resolvedCoupleId.startsWith('CP-')) {
                resolvedCoupleId = pwaCoupleId || generateCoupleCode();
                await supabase.from('couples').upsert({
                  id: resolvedCoupleId,
                  name: 'Наша семья',
                }, { onConflict: 'id' });
              }

              await supabase.from('profiles').upsert({
                id: activeId,
                name: urlAuthName || existingProf?.name || 'Пользователь',
                avatar: urlAuthAvatar || existingProf?.avatar || 'memoji_1',
                couple_id: resolvedCoupleId,
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

              // If invited via deep link start_param (e.g. start=CP-1234)
              if (startParam && startParam.startsWith('CP-')) {
                userCoupleId = startParam;
              } else if (isInvalidCoupleId(userCoupleId)) {
                // Discard old default_couple and generate fresh unique couple code!
                userCoupleId = (activeCode && activeCode.startsWith('CP-')) ? activeCode : generateCoupleCode();
                // Ensure couple exists in couples table
                await supabase.from('couples').upsert({
                  id: userCoupleId,
                  name: 'Наша семья',
                }, { onConflict: 'id' });
              }

              // Save profile
              await supabase.from('profiles').upsert({
                id: activeId,
                telegram_id: tgUser.id,
                name: fullName,
                username: tgUser.username || null,
                avatar,
                couple_id: userCoupleId,
                role: existingProfile?.role || 'partner_a',
              }, { onConflict: 'id' });

              localStorage.setItem(STORAGE_KEYS.COUPLE_ID, userCoupleId);
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, activeId);

              // Load data for this couple
              loadCoupleData(userCoupleId, activeId);
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
    setCouple((prev) => ({ ...prev, ...data }));
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
  };

  // Join couple by code
  const joinCoupleByCode = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!supabase) return { success: false, message: 'База данных недоступна' };

    try {
      // Find profiles in target couple
      const { data: foundProfiles, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('couple_id', cleanCode);

      if (fetchErr || !foundProfiles || foundProfiles.length === 0) {
        return { success: false, message: 'Пара с таким кодом не найдена. Проверьте код.' };
      }

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
        return { success: false, message: 'Пара с таким кодом не найдена. Проверьте код.' };
      }

      const cleanName = myName.trim();
      // Check if user is trying to log back into their existing profile
      const existingUser = existingProfiles.find(
        (p: any) => p.name.trim().toLowerCase() === cleanName.toLowerCase()
      );

      let myId: string;

      if (existingUser) {
        // User exists, re-attach them!
        myId = existingUser.id;
        
        // Optionally update their avatar if they selected a new one
        if (avatar && existingUser.avatar !== avatar) {
           await supabase.from('profiles').update({ avatar }).eq('id', myId);
        }
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

  // Logout / Switch
  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.COUPLE_ID);
    setIsAuthenticated(false);
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

    if (supabase) {
      supabase.from('tasks').insert({
        id: newTask.id,
        couple_id: couple.id,
        title: newTask.title,
        description: newTask.description,
        category: 'Общее',
        assigned_to: newTask.assignee || 'both',
        due_date: newTask.dueDate,
        is_completed: false,
        subtasks: newTask.subtasks || [],
        created_by: currentUser.name,
      }).then();
    }

    sendPartnerNotification({
      coupleId: couple.id,
      senderName: currentUser.name,
      action: 'task_created',
      itemTitle: newTask.title,
      details: newTask.description,
    });
  };

  const updateTask = (id: string, data: Partial<TaskItem>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t))
    );

    if (supabase) {
      const updatePayload: any = {};
      if (data.title !== undefined) updatePayload.title = data.title;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.assignee !== undefined) updatePayload.assigned_to = data.assignee;
      if (data.dueDate !== undefined) updatePayload.due_date = data.dueDate;
      if (data.subtasks !== undefined) updatePayload.subtasks = data.subtasks;
      if (data.isCompleted !== undefined) updatePayload.is_completed = data.isCompleted;

      supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', id)
        .then();
    }

    if (data.title) {
      sendPartnerNotification({
        coupleId: couple.id,
        senderName: currentUser.name,
        action: 'task_updated',
        itemTitle: data.title,
      });
    }
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const completed = !t.isCompleted;

          if (completed) {
            sendPartnerNotification({
              coupleId: couple.id,
              senderName: currentUser.name,
              action: 'task_completed',
              itemTitle: t.title,
            });
          }

          if (supabase) {
            supabase
              .from('tasks')
              .update({ is_completed: completed })
              .eq('id', id)
              .then();
          }

          return {
            ...t,
            isCompleted: completed,
            completedAt: completed ? new Date().toISOString() : undefined,
          };
        }
        return t;
      })
    );
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
          );
          const allCompleted =
            updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.isCompleted);

          if (supabase) {
            supabase
              .from('tasks')
              .update({ subtasks: updatedSubtasks, is_completed: allCompleted })
              .eq('id', taskId)
              .then();
          }

          return {
            ...t,
            subtasks: updatedSubtasks,
            isCompleted: allCompleted,
          };
        }
        return t;
      })
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (supabase) {
      supabase.from('tasks').delete().eq('id', id).then();
    }
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
