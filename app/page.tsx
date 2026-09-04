'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import { initTelegramApp, haptic } from '@/lib/telegram';
import { BottomNav, TabType } from '@/components/common/BottomNav';
import { HeaderWidget } from '@/components/common/HeaderWidget';

// Tasks
import { TaskItem } from '@/components/tasks/TaskItem';
import { AddTaskModal } from '@/components/tasks/AddTaskModal';

// Wishlist
import { WishlistCard } from '@/components/wishlist/WishlistCard';
import { AddWishModal } from '@/components/wishlist/AddWishModal';
import { ArchiveModal } from '@/components/wishlist/ArchiveModal';

// Documents
import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentPinModal } from '@/components/documents/DocumentPinModal';
import { AddDocumentModal } from '@/components/documents/AddDocumentModal';

// Settings & Couple Hub
import { CoinFlipModal } from '@/components/couple/CoinFlipModal';
import { SizesModal } from '@/components/couple/SizesModal';
import { LoyaltyWalletModal } from '@/components/couple/LoyaltyWalletModal';
import { InvitePartnerModal } from '@/components/couple/InvitePartnerModal';
import { AppearanceSettingsModal } from '@/components/couple/AppearanceSettingsModal';
import { getAvatarUrl } from '@/lib/avatars';

import {
  Plus,
  Sparkles,
  Lock,
  Unlock,
  Gift,
  CheckSquare,
  Shield,
  Search,
  ChevronRight,
  Coins,
  Ruler,
  CreditCard,
  Share2,
  Sliders,
  Heart,
} from 'lucide-react';

export default function Home() {
  const {
    currentUser,
    partnerUser,
    couple,
    documents,
    wishlist,
    tasks,
    loyaltyCards,
    isDocumentsUnlocked,
    unlockDocuments,
    lockDocuments,
    toggleTask,
    toggleSubtask,
    deleteTask,
    deleteWishlistItem,
    toggleReserveWishlist,
    markAsGifted,
    deleteArchivedItem,
    deleteDocument,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>('tasks');

  // Modals state
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddWishOpen, setIsAddWishOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Couple Hub Modals
  const [isCoinFlipOpen, setIsCoinFlipOpen] = useState(false);
  const [isSizesOpen, setIsSizesOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Filters
  const [taskFilter, setTaskFilter] = useState<'all' | 'shopping' | 'me' | 'partner'>('all');
  const [wishlistAuthorFilter, setWishlistAuthorFilter] = useState<string>('all');
  const [docSearch, setDocSearch] = useState('');

  useEffect(() => {
    initTelegramApp();
  }, []);

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'shopping') return t.isMegaTask;
    if (taskFilter === 'me') return t.assignee === 'me' || t.assignee === 'both';
    if (taskFilter === 'partner') return t.assignee === 'partner' || t.assignee === 'both';
    return true;
  });

  const activeTasksCount = tasks.filter((t) => !t.isCompleted).length;

  // Filter Wishlist (Active items vs Archived)
  const activeWishlist = wishlist.filter((w) => !w.isGifted);
  const archivedWishlist = wishlist.filter((w) => w.isGifted);

  const displayedWishlist = activeWishlist.filter((w) => {
    if (wishlistAuthorFilter === 'partner') return w.authorId === partnerUser.id;
    if (wishlistAuthorFilter === 'me') return w.authorId === currentUser.id;
    return true;
  });

  // Filter Documents
  const filteredDocs = documents.filter((d) => {
    if (!docSearch.trim()) return true;
    const query = docSearch.toLowerCase();
    return (
      d.title.toLowerCase().includes(query) ||
      d.ownerName.toLowerCase().includes(query) ||
      d.fields.some((f) => f.value.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen pb-32 pt-2">
      {/* iOS 26 Dynamic Island & Live Activity Header */}
      <HeaderWidget />

      {/* Main Tab Content with Apple Large Titles */}
      <main className="max-w-md mx-auto px-5 mt-4">
        {/* ================================================================= */}
        {/* TAB 1: ЗАДАЧИ (APPLE REMINDERS INSET GROUPED LIST)                */}
        {/* ================================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Apple Large Title + Action Button */}
            <div className="flex items-end justify-between pt-1">
              <div>
                <h1 className="text-[32px] font-black tracking-tight text-foreground leading-none">
                  Задачи
                </h1>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  {activeTasksCount === 0
                    ? 'Все дела выполнены 🎉'
                    : `Осталось выполнить: ${activeTasksCount}`}
                </p>
              </div>

              <button
                onClick={() => {
                  haptic.medium();
                  setIsAddTaskOpen(true);
                }}
                className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-hover ios-press"
                title="Новая задача"
              >
                <Plus size={20} strokeWidth={2.6} />
              </button>
            </div>

            {/* Apple Native UISegmentedControl */}
            <div className="p-[3px] bg-secondary/80 rounded-[14px] flex text-xs font-semibold">
              {[
                { id: 'all', label: 'Все' },
                { id: 'shopping', label: '🛒 Покупки' },
                { id: 'me', label: currentUser.name },
                { id: 'partner', label: partnerUser.name },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    haptic.selection();
                    setTaskFilter(f.id as any);
                  }}
                  className={`flex-1 py-1.5 rounded-[11px] transition-all ios-press text-center ${
                    taskFilter === f.id
                      ? 'bg-card text-foreground shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Inset Grouped Monolith (Apple Reminders) */}
            {filteredTasks.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
                <CheckSquare size={44} strokeWidth={1.2} className="text-muted/50 mb-2" />
                <p className="text-sm font-semibold">Список пуст</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                  Нажмите +, чтобы добавить бытовое дело или составить список покупок.
                </p>
              </div>
            ) : (
              <div className="ios-card overflow-hidden shadow-sm">
                {filteredTasks.map((task, idx) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onToggleSubtask={toggleSubtask}
                    onDelete={deleteTask}
                    isLast={idx === filteredTasks.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: ХОТЕЛКИ (VISION STORE / APP STORE TODAY)                   */}
        {/* ================================================================= */}
        {activeTab === 'wishlist' && (
          <div className="space-y-4">
            {/* Apple Large Title + Action Buttons */}
            <div className="flex items-end justify-between pt-1">
              <div>
                <h1 className="text-[32px] font-black tracking-tight text-foreground leading-none">
                  Хотелки
                </h1>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  Список желаний и идеи подарков
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {archivedWishlist.length > 0 && (
                  <button
                    onClick={() => {
                      haptic.light();
                      setIsArchiveOpen(true);
                    }}
                    className="w-9 h-9 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center ios-press shadow-xs"
                    title="Архив подаренных желаний"
                  >
                    <Sparkles size={17} />
                  </button>
                )}

                <button
                  onClick={() => {
                    haptic.medium();
                    setIsAddWishOpen(true);
                  }}
                  className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-hover ios-press"
                  title="Добавить желание"
                >
                  <Plus size={20} strokeWidth={2.6} />
                </button>
              </div>
            </div>

            {/* Apple Segmented Control */}
            <div className="p-[3px] bg-secondary/80 rounded-[14px] flex text-xs font-semibold">
              {[
                { id: 'all', label: 'Все мечты' },
                { id: 'partner', label: `Для ${partnerUser.name}` },
                { id: 'me', label: 'Мои' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    haptic.selection();
                    setWishlistAuthorFilter(f.id);
                  }}
                  className={`flex-1 py-1.5 rounded-[11px] transition-all ios-press text-center ${
                    wishlistAuthorFilter === f.id
                      ? 'bg-card text-foreground shadow-sm font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Wishlist Cards Grid */}
            {displayedWishlist.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
                <Gift size={44} strokeWidth={1.2} className="text-muted/50 mb-2" />
                <p className="text-sm font-semibold">Желаний пока нет</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  Вставьте ссылку на товар с Wildberries или Ozon — карточка заполнится автоматически!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {displayedWishlist.map((item) => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    onDelete={deleteWishlistItem}
                    onToggleReserve={toggleReserveWishlist}
                    onMarkGifted={markAsGifted}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: СЕЙФ ДОКУМЕНТОВ (APPLE WALLET PASSES)                      */}
        {/* ================================================================= */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {!isDocumentsUnlocked ? (
              /* Locked State */
              <div className="py-16 px-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-inner">
                  <Lock size={30} />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Сейф заблокирован
                </h2>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-[260px]">
                  Паспорта, СНИЛС и билеты защищены сквозным шифрованием пары.
                </p>

                <button
                  onClick={() => setIsPinModalOpen(true)}
                  className="mt-6 px-7 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary-hover ios-press flex items-center space-x-2"
                >
                  <Unlock size={16} />
                  <span>Открыть сейф (PIN)</span>
                </button>
              </div>
            ) : (
              /* Unlocked Apple Wallet Documents */
              <div className="space-y-4">
                <div className="flex items-end justify-between pt-1">
                  <div>
                    <h1 className="text-[32px] font-black tracking-tight text-foreground leading-none">
                      Сейф
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                      Быстрое копирование для покупки билетов
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        haptic.heavy();
                        lockDocuments();
                      }}
                      className="w-9 h-9 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground flex items-center justify-center ios-press shadow-xs"
                      title="Заблокировать сейф"
                    >
                      <Lock size={15} />
                    </button>

                    <button
                      onClick={() => {
                        haptic.medium();
                        setIsAddDocOpen(true);
                      }}
                      className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-hover ios-press"
                      title="Добавить документ"
                    >
                      <Plus size={20} strokeWidth={2.6} />
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-[16px] bg-secondary/80 border-0 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                    placeholder="Поиск по документам и номерам..."
                  />
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                </div>

                {/* Wallet Passes */}
                {filteredDocs.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                    <Shield size={40} className="text-muted/50 mb-2" strokeWidth={1.2} />
                    <p className="text-sm font-semibold">Документов не найдено</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Нажмите +, чтобы добавить паспорт или билет.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredDocs.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        document={doc}
                        onDelete={deleteDocument}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: ХАБ «ПАРА» (APPLE INSET GROUPED)                          */}
        {/* ================================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="pt-1">
              <h1 className="text-[32px] font-black tracking-tight text-foreground leading-none">
                Пара
              </h1>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                Пространство для двоих и совместные инструменты
              </p>
            </div>

            {/* Couple Profile Hero Card */}
            <div className="relative p-5 rounded-[28px] ios-glass-card border border-white/20 shadow-lg overflow-hidden flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                {/* Overlapping Memojis */}
                <div className="relative flex items-center">
                  <div className="w-13 h-13 w-[52px] h-[52px] rounded-full overflow-hidden ring-2 ring-background bg-zinc-800 shadow-md shrink-0">
                    <img
                      src={getAvatarUrl(couple.partnerA.avatar)}
                      alt={couple.partnerA.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="w-13 h-13 w-[52px] h-[52px] rounded-full overflow-hidden ring-2 ring-background bg-zinc-800 shadow-md -ml-3.5 shrink-0">
                    <img
                      src={getAvatarUrl(couple.partnerB.avatar)}
                      alt={couple.partnerB.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <Heart size={10} className="fill-current text-white animate-pulse" />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black tracking-tight text-foreground">
                    {couple.partnerA.name} & {couple.partnerB.name}
                  </h3>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-xs font-bold text-primary">
                      {Math.floor(Math.abs(new Date().getTime() - new Date(couple.startDate).getTime()) / (1000 * 60 * 60 * 24))} дней вместе
                    </span>
                    <Sparkles size={11} className="text-amber-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">
                    С {new Date(couple.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* GROUP 1: Инструменты для двоих */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1.5 block">
                Инструменты для двоих
              </span>
              <div className="rounded-[24px] ios-inset-grouped overflow-hidden divide-y divide-border/40 shadow-sm">
                {/* 🪙 Монетка судьбы */}
                <button
                  onClick={() => {
                    haptic.medium();
                    setIsCoinFlipOpen(true);
                  }}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors text-left ios-press"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Coins size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Монетка судьбы
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Честный 3D-рандом для бытовых споров
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/60" />
                </button>

                {/* 📏 Карточка размеров */}
                <button
                  onClick={() => {
                    haptic.medium();
                    setIsSizesOpen(true);
                  }}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors text-left ios-press"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Ruler size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Карточка размеров
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Обувь, кольца, одежда и мерки двоих
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/60" />
                </button>

                {/* 💳 Общий кошелек скидок */}
                <button
                  onClick={() => {
                    haptic.medium();
                    setIsWalletOpen(true);
                  }}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors text-left ios-press"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Карты лояльности
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        {loyaltyCards.length} карт со штрихкодами (OZON style)
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/60" />
                </button>
              </div>
            </div>

            {/* GROUP 2: Настройки и Семья */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1.5 block">
                Семья и настройки
              </span>
              <div className="rounded-[24px] ios-inset-grouped overflow-hidden divide-y divide-border/40 shadow-sm">
                {/* 💌 Пригласить партнера */}
                <button
                  onClick={() => {
                    haptic.light();
                    setIsInviteOpen(true);
                  }}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors text-left ios-press"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Share2 size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Пригласить партнера
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Код пары: {couple.inviteCode}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/60" />
                </button>

                {/* ⚙️ Настройки оформления */}
                <button
                  onClick={() => {
                    haptic.light();
                    setIsSettingsOpen(true);
                  }}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors text-left ios-press"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-zinc-800 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Sliders size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Настройки оформления
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Темы, 3D Memoji, дата годовщины
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/60" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* iOS 26 Floating Island Glass Tab Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'documents' && !isDocumentsUnlocked) {
            setIsPinModalOpen(true);
          }
        }}
        tasksBadgeCount={activeTasksCount}
        wishlistBadgeCount={activeWishlist.length}
      />

      {/* Modals */}
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
      />

      <AddWishModal
        isOpen={isAddWishOpen}
        onClose={() => setIsAddWishOpen(false)}
      />

      <ArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        archivedItems={archivedWishlist}
        onDeleteArchived={deleteArchivedItem}
      />

      <AddDocumentModal
        isOpen={isAddDocOpen}
        onClose={() => setIsAddDocOpen(false)}
      />

      <DocumentPinModal
        isOpen={isPinModalOpen}
        onSuccess={() => {
          unlockDocuments();
          setIsPinModalOpen(false);
          setActiveTab('documents');
        }}
        onCancel={() => setIsPinModalOpen(false)}
      />

      {/* Couple Hub Modals */}
      <CoinFlipModal
        isOpen={isCoinFlipOpen}
        onClose={() => setIsCoinFlipOpen(false)}
      />

      <SizesModal
        isOpen={isSizesOpen}
        onClose={() => setIsSizesOpen(false)}
      />

      <LoyaltyWalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
      />

      <InvitePartnerModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />

      <AppearanceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
