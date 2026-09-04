'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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

const DEFAULT_COUPLE_ID = 'default_couple';

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

  // Load saved state from LocalStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (savedUser) setCurrentUserId(savedUser);

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

      const savedCouple = localStorage.getItem(STORAGE_KEYS.COUPLE);
      if (savedCouple) setCouple(JSON.parse(savedCouple));

      const savedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (savedDocs) setDocuments(JSON.parse(savedDocs));

      const savedWish = localStorage.getItem(STORAGE_KEYS.WISHLIST);
      if (savedWish) setWishlist(JSON.parse(savedWish));

      const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (savedTasks) setTasks(JSON.parse(savedTasks));

      const savedSizes = localStorage.getItem(STORAGE_KEYS.SIZES);
      if (savedSizes) setSizes(JSON.parse(savedSizes));

      const savedCards = localStorage.getItem(STORAGE_KEYS.LOYALTY_CARDS);
      if (savedCards) setLoyaltyCards(JSON.parse(savedCards));

      // Auto-detect Telegram WebApp User
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
        const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
        const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
        const tgId = String(tgUser.id);
        const avatar = tgUser.photo_url || 'memoji_1';

        setCurrentUserId(tgId);
        setCouple((prev) => ({
          ...prev,
          partnerA: {
            ...prev.partnerA,
            id: tgId,
            name: fullName || prev.partnerA.name,
            avatar,
          },
        }));

        // Upsert user profile to Supabase
        if (supabase) {
          supabase
            .from('profiles')
            .upsert(
              {
                id: tgId,
                telegram_id: tgUser.id,
                name: fullName || 'Пользователь',
                username: tgUser.username || null,
                avatar,
                couple_id: DEFAULT_COUPLE_ID,
              },
              { onConflict: 'id' }
            )
            .then(({ error }) => {
              if (error) console.warn('Supabase upsert profile error:', error);
            });
        }
      }
    } catch (e) {
      console.warn('LocalStorage init error:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Fetch data from Supabase if configured
  useEffect(() => {
    if (!supabase) return;

    // Fetch tasks
    supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mappedTasks: TaskItem[] = data.map((row: any) => ({
            id: row.id,
            coupleId: row.couple_id || DEFAULT_COUPLE_ID,
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
      });

    // Fetch wishlist
    supabase
      .from('wishlist_items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mappedWishlist: WishlistItem[] = data.map((row: any) => ({
            id: row.id,
            coupleId: row.couple_id || DEFAULT_COUPLE_ID,
            authorId: row.created_by === currentUser.name ? currentUser.id : partnerUser.id,
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
      });

    // Fetch profiles to sync partner details
    supabase
      .from('profiles')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const userA = data.find((p: any) => p.id === currentUserId) || data[0];
          const userB = data.find((p: any) => p.id !== currentUserId) || data[1];

          if (userA || userB) {
            setCouple((prev) => ({
              ...prev,
              partnerA: userA
                ? {
                    ...prev.partnerA,
                    id: userA.id,
                    name: userA.name,
                    avatar: userA.avatar || prev.partnerA.avatar,
                  }
                : prev.partnerA,
              partnerB: userB
                ? {
                    ...prev.partnerB,
                    id: userB.id,
                    name: userB.name,
                    avatar: userB.avatar || prev.partnerB.avatar,
                  }
                : prev.partnerB,
            }));
          }
        }
      });
  }, [currentUserId]);

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
        couple_id: DEFAULT_COUPLE_ID,
        title: newDoc.title,
        category: newDoc.category,
        notes: newDoc.notes,
        file_url: newDoc.fileUrl,
      }).then();
    }

    sendPartnerNotification({
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
        couple_id: DEFAULT_COUPLE_ID,
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
        couple_id: DEFAULT_COUPLE_ID,
        title: newTask.title,
        description: newTask.description,
        category: 'Общее',
        assigned_to: newTask.assignee || 'both',
        due_date: newTask.dueDate,
        is_completed: false,
        subtasks: newTask.subtasks || [],
        created_by: currentUser.name,
      }).then(({ error }) => {
        if (error) console.warn('Supabase insert task error:', error);
      });
    }

    sendPartnerNotification({
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
        .then(({ error }) => {
          if (error) console.warn('Supabase update task error:', error);
        });
    }

    if (data.title) {
      sendPartnerNotification({
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
        couple_id: DEFAULT_COUPLE_ID,
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
        switchUser,
        setTheme,
        setHeaderStyle,
        toggleDarkMode,
        unlockDocuments,
        lockDocuments,
        updateCoupleInfo,
        updateUserProfile,
        updateUserSizes,
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
