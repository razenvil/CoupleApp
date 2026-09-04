import { CoupleInfo, DocumentItem, TaskItem, WishlistItem, UserSizes, LoyaltyCard } from '../types';

export const INITIAL_COUPLE: CoupleInfo = {
  id: '',
  partnerA: {
    id: 'user_1',
    name: 'Партнер 1',
    avatar: 'memoji_1',
    role: 'partner_a',
  },
  partnerB: {
    id: 'user_2',
    name: 'Партнер 2',
    avatar: 'memoji_2',
    role: 'partner_b',
  },
  startDate: new Date().toISOString(),
  anniversaryTitle: 'Наша дата',
  inviteCode: '',
  vaultPin: '1234',
  isVaultLocked: true,
};

// Clean production initial arrays — filled directly by the couple
export const INITIAL_DOCUMENTS: DocumentItem[] = [];

export const INITIAL_WISHLIST: WishlistItem[] = [];

export const INITIAL_TASKS: TaskItem[] = [];

export const INITIAL_SIZES: Record<string, UserSizes> = {};

export const INITIAL_LOYALTY_CARDS: LoyaltyCard[] = [];
