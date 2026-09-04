export type ThemeId = 'rose-gold' | 'apple-classic' | 'cozy-pastel';
export type HeaderStyle = 'widget' | 'compact';
export type TaskAssignee = 'me' | 'partner' | 'both';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // Memoji key or image URL
  role: 'partner_a' | 'partner_b';
}

export interface CoupleInfo {
  id: string;
  partnerA: UserProfile;
  partnerB: UserProfile;
  startDate: string; // ISO date string: when they started dating
  anniversaryTitle?: string;
  inviteCode: string;
  vaultPin?: string;
  isVaultLocked?: boolean;
}

export interface DocumentItem {
  id: string;
  coupleId: string;
  title: string;
  category: 'passport' | 'international_passport' | 'snils' | 'inn' | 'driver_license' | 'medical' | 'tickets' | 'other';
  ownerId: string; // user id or 'both'
  ownerName: string;
  fields: {
    label: string;
    value: string;
    copyable?: boolean;
    masked?: boolean;
  }[];
  fileUrl?: string;
  fileName?: string;
  fileType?: 'image' | 'pdf';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  coupleId: string;
  authorId: string; // Who wants it
  authorName: string;
  title: string;
  price?: number;
  currency?: string;
  link?: string;
  imageUrl?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  isReservedByPartner?: boolean; // Secret gift reservation!
  reservedAt?: string;
  isGifted?: boolean; // When gifted -> moved to archive
  giftedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface SubtaskItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface TaskItem {
  id: string;
  coupleId: string;
  title: string;
  description?: string;
  isMegaTask: boolean; // Checklist/shopping list with subtasks
  subtasks: SubtaskItem[];
  isCompleted: boolean;
  assignee: TaskAssignee;
  creatorId: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

export interface LinkParseResult {
  title?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  link?: string;
  source?: 'wildberries' | 'ozon' | 'opengraph' | 'unknown';
  success: boolean;
  error?: string;
}

export interface UserSizes {
  shoesEu?: string;
  shoesCm?: string;
  clothingTop?: string;
  clothingBottom?: string;
  ringSize?: string;
  underwear?: string;
  heightCm?: string;
  wristCm?: string;
  notes?: string;
}

export interface LoyaltyCard {
  id: string;
  coupleId: string;
  storeName: string;
  cardNumber: string;
  barcodeType: 'qr' | 'code128' | 'ean13';
  cardColor: string;
  imageUri?: string;
  addedById: string;
  createdAt: string;
}
