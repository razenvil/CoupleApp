# Сводка всех исправлений и изменений для другого чата

В данном файле собраны все изменения по 5 обнаруженным проблемам:
1. **Кнопка «Компактный вид» ничего не меняла**
2. **Дата отношений не синхронизировалась между партнерами**
3. **Задержка синхронизации 5 секунд и баннер**
4. **Необходимость перезапуска PWA для появления хотелок (отсутствие Realtime)**
5. **Пропущенные уведомления по хотелкам и задачам (PWA и гонка очереди)**

---

## 1. `lib/telegram-bot.ts`
Добавлено поле `senderId?: string` в `NotificationPayload` и автоматическое извлечение `senderId` из `localStorage` при вызове из PWA/браузера.

```typescript
export interface NotificationPayload {
  coupleId?: string;
  senderId?: string;
  recipientChatId?: number | string;
  senderChatId?: number | string;
  senderName: string;
  action: 'task_created' | 'task_updated' | 'task_completed' | 'wish_added' | 'doc_added' | 'match_date';
  itemTitle: string;
  details?: string;
}

export async function sendPartnerNotification(payload: NotificationPayload) {
  try {
    // If senderChatId not provided, grab it from Telegram WebApp
    if (!payload.senderChatId && typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      payload.senderChatId = window.Telegram.WebApp.initDataUnsafe.user.id;
    }

    // If senderId not provided, try reading from localStorage
    if (!payload.senderId && typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('couple_app_current_user');
      if (savedUser) payload.senderId = savedUser;
    }

    await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (err) {
    console.warn('Telegram notification dispatch error:', err);
  }
}
```

---

## 2. `app/api/telegram/notify/route.ts`
Устранена проблема, из-за которой уведомления из PWA не отправлялись (`no_recipient`). Теперь бэкенд ищет партнера в таблице `profiles` по `couple_id`, исключая `senderId`, `senderChatId` или `senderName`.

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, senderName, itemTitle, recipientChatId, senderChatId, senderId, coupleId } = body;

    let targetChatId = recipientChatId;

    // 1. Resolve partner from Supabase profiles by coupleId (works from PWA, browser, and TG!)
    if (!targetChatId && supabase && coupleId) {
      try {
        const { data: coupleProfiles } = await supabase
          .from('profiles')
          .select('id, name, telegram_id')
          .eq('couple_id', coupleId);

        if (coupleProfiles && coupleProfiles.length > 0) {
          // Find partner: profile with telegram_id that is NOT the sender
          const partnerProfile = coupleProfiles.find((p: any) => {
            if (!p.telegram_id) return false;
            if (senderId && String(p.id) === String(senderId)) return false;
            if (senderChatId && Number(p.telegram_id) === Number(senderChatId)) return false;
            if (senderName && p.name && p.name.trim().toLowerCase() === senderName.trim().toLowerCase()) return false;
            return true;
          });

          if (partnerProfile?.telegram_id) {
            targetChatId = partnerProfile.telegram_id;
          } else if (coupleProfiles.length >= 2) {
            // Fallback: in a couple of 2, if one has telegram_id and is not senderChatId
            const other = coupleProfiles.find((p: any) => 
              p.telegram_id && (!senderChatId || Number(p.telegram_id) !== Number(senderChatId))
            );
            if (other?.telegram_id) {
              targetChatId = other.telegram_id;
            }
          }
        }
      } catch (dbErr) {
        console.warn('[Notify Route] Supabase partner lookup error:', dbErr);
      }
    }

    // 2. Fallback to in-memory partnerChatLinks
    if (!targetChatId) {
      partnerChatLinks.forEach((chatId) => {
        if (!targetChatId && chatId !== Number(senderChatId)) {
          targetChatId = chatId;
        }
      });
    }

    // 3. Fallback to sender if self-test
    const isSelfTest = !targetChatId && Boolean(senderChatId);
    if (!targetChatId && senderChatId) {
      targetChatId = senderChatId;
    }
```

---

## 3. `lib/offline-sync.ts`
Устранено состояние гонки (Race Condition), из-за которого при быстром создании двух задач вторая стиралась из очереди и по ней не приходило уведомление. Теперь из `localStorage` удаляются **только успешно отправленные задачи** по `id`:

```typescript
export interface OfflineTaskMutation {
  id: string;
  type: 'CREATE_TASK' | 'UPDATE_TASK' | 'TOGGLE_TASK' | 'TOGGLE_SUBTASK' | 'DELETE_TASK';
  payload: any;
  coupleId: string;
  senderId?: string;
  senderName: string;
  createdAt: number;
}

// ... внутри processTaskQueue():
  try {
    const processedIds = new Set<string>();

    for (const item of queue) {
      try {
        let success = false;
        // switch (item.type) ...
        // при успехе каждого кейса:
        // success = true;
        // sendPartnerNotification({ coupleId: item.coupleId, senderId: item.senderId, ... });

        if (success) {
          processedIds.add(item.id);
        }
      } catch (mutationErr) {
        console.warn('Error processing task mutation:', mutationErr);
      }
    }

    // Safely remove only successfully processed mutations from current storage
    const currentQueue = getPendingTaskMutations();
    const updatedQueue = currentQueue.filter((item) => !processedIds.has(item.id));
    savePendingTaskMutations(updatedQueue);
  } finally {
    isProcessingQueue = false;
    const remaining = getPendingTaskMutations().length;
    window.dispatchEvent(
      new CustomEvent('couple_sync_status_changed', {
        detail: { isSyncing: false, remaining },
      })
    );

    // If more tasks were enqueued during processing, run another pass immediately
    if (remaining > 0 && navigator.onLine) {
      setTimeout(() => processTaskQueue(), 50);
    }
  }
```

---

## 4. `lib/store/app-store.tsx` (Синхронизация даты и Realtime)

### 4.1. Сохранение `startDate` в Supabase (`updateCoupleInfo`):
Раньше функция меняла только локальный стейт `setCouple(...)`.
Должно быть сохранение в `couples` в колонку `start_date`:

```typescript
  const updateCoupleInfo = async (data: Partial<CoupleInfo>) => {
    setCouple((prev) => ({ ...prev, ...data }));

    if (couple.id && supabase && couple.id !== 'default_couple' && couple.id !== 'couple_main') {
      try {
        const updatePayload: any = {};
        if (data.startDate !== undefined) updatePayload.start_date = data.startDate;
        if (data.anniversaryTitle !== undefined) {
          updatePayload.anniversary_title = data.anniversaryTitle;
          updatePayload.name = data.anniversaryTitle;
        }
        if (data.vaultPin !== undefined) updatePayload.vault_pin = data.vaultPin;
        if (data.isVaultLocked !== undefined) updatePayload.is_vault_locked = data.isVaultLocked;

        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('couples').update(updatePayload).eq('id', couple.id);
        }
      } catch (err) {
        console.warn('Failed to update couple info in Supabase:', err);
      }
    }
  };
```

### 4.2. Чтение `start_date` в `loadCoupleData`:
```typescript
      // Fetch couple row for vault settings, anniversary and start_date
      const { data: coupleRow } = await supabase
        .from('couples')
        .select('*')
        .eq('id', coupleId)
        .maybeSingle();

      if (coupleRow) {
        setCouple((prev) => ({
          ...prev,
          startDate: coupleRow.start_date || prev.startDate,
          anniversaryTitle: coupleRow.anniversary_title || coupleRow.name || prev.anniversaryTitle,
          vaultPin: coupleRow.vault_pin || prev.vaultPin || '1234',
          isVaultLocked: coupleRow.is_vault_locked !== undefined ? Boolean(coupleRow.is_vault_locked) : true,
        }));
      }
```

### 4.3. Realtime подписка (чтобы хотелки и задачи появлялись без перезапуска PWA):
Вставить в `app-store.tsx` эффект подписки:
```typescript
  // Realtime synchronization via Supabase Channel + PWA visibility refresh
  useEffect(() => {
    if (!supabase || !couple.id || couple.id === 'default_couple' || couple.id === 'couple_main' || !isAuthenticated) return;

    let debounceTimer: NodeJS.Timeout;
    const triggerReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadCoupleData(couple.id, currentUserId);
      }, 300);
    };

    const channel = supabase.channel(`couple_sync_${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `couple_id=eq.${couple.id}` }, () => triggerReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_items', filter: `couple_id=eq.${couple.id}` }, () => triggerReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` }, () => triggerReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `couple_id=eq.${couple.id}` }, () => triggerReload())
      .subscribe();

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
        triggerReload();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    // Heartbeat every 10s when app is active
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
        loadCoupleData(couple.id, currentUserId);
      }
    }, 10000);

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(pollInterval);
      if (supabase) supabase.removeChannel(channel);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [couple.id, currentUserId, isAuthenticated, loadCoupleData]);
```

### 4.4. Передача `senderId` при отправке уведомлений:
В `addWishlistItem`:
```typescript
    sendPartnerNotification({
      coupleId: couple.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      action: 'wish_added',
      itemTitle: newItem.title,
    });
```
В `addTask`:
```typescript
    enqueueTaskMutation({
      type: 'CREATE_TASK',
      payload: newTask,
      coupleId: couple.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
    });
```

---

## 5. `components/common/HeaderWidget.tsx` (Компактный вид)
Подключить `headerStyle` из `useAppStore()` и сделать компактный рендер при `headerStyle === 'compact'`:

```typescript
export const HeaderWidget: React.FC<HeaderWidgetProps> = ({ onOpenPwa }) => {
  const { couple, currentUser, partnerUser, headerStyle } = useAppStore();

  const isTg = isTelegramWebApp();
  const isPwa = isStandalonePwa();
  const showPwaButton = onOpenPwa && isTg && !isPwa;

  const start = new Date(couple.startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const daysTogether = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const getDaysLabel = (num: number) => {
    const mod10 = num % 10;
    const mod100 = num % 100;
    if (mod100 >= 11 && mod100 <= 19) return 'дней';
    if (mod10 === 1) return 'день';
    if (mod10 >= 2 && mod10 <= 4) return 'дня';
    return 'дней';
  };

  const daysWord = getDaysLabel(daysTogether);

  // --- КОМПАКТНЫЙ РЕЖИМ ---
  if (headerStyle === 'compact') {
    return (
      <header className="px-4 pt-safe pt-1.5 pb-1 max-w-md mx-auto">
        <div className="flex items-center justify-between gap-2 py-1 px-3 rounded-full bg-secondary/70 border border-border/40 backdrop-blur-md">
          {/* Couple Days & Avatars */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center -space-x-1.5">
              <img
                src={getAvatarUrl(couple.partnerA.avatar)}
                alt={couple.partnerA.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-background"
              />
              <img
                src={getAvatarUrl(couple.partnerB.avatar)}
                alt={couple.partnerB.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-background"
              />
            </div>
            <div className="flex items-center space-x-1 text-[11px] font-bold text-foreground">
              <Heart size={10} className="fill-primary text-primary" />
              <span>{daysTogether} {daysWord}</span>
            </div>
          </div>

          {/* User Name & PWA button */}
          <div className="flex items-center gap-1.5">
            {showPwaButton && (
              <button
                onClick={onOpenPwa}
                className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold"
              >
                PWA
              </button>
            )}
            <span className="text-[11px] font-semibold text-muted-foreground">{currentUser.name}</span>
          </div>
        </div>
      </header>
    );
  }

  // --- СТАНДАРТНЫЙ РЕЖИМ (WIDGET / DYNAMIC ISLAND) ---
  return (
    // Стандартный рендер HeaderWidget...
  );
};
```
