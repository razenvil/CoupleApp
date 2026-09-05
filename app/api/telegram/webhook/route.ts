import { NextRequest, NextResponse } from 'next/server';
import { verifiedUsers, partnerChatLinks, pendingInvites } from '@/lib/telegram-bot';
import { supabase } from '@/lib/supabase';
import { authorizeAuthSession } from '@/lib/auth-session';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://couple-app-phi-ruddy.vercel.app';

// Admin Telegram IDs (user explicitly provided 361122150)
const ADMIN_TELEGRAM_IDS: number[] = [
  361122150,
  ...(process.env.ADMIN_TELEGRAM_ID ? [Number(process.env.ADMIN_TELEGRAM_ID)] : []),
];

// In-memory conversation state trackers
const userSupportState = new Map<number, boolean>(); // userId -> is waiting for support text
const adminActiveTicket = new Map<number, number>(); // adminId -> ticketId currently responding to
const adminBroadcastState = new Map<number, { step: 'awaiting_post' | 'confirm'; text?: string; photoFileId?: string | null }>();

function getWebAppUrl(user: any, coupleCode?: string | null): string {
  const params = new URLSearchParams();
  if (user?.id) params.set('auth_id', String(user.id));
  if (user?.first_name) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    params.set('name', fullName);
  }
  if (coupleCode && coupleCode.startsWith('CP-')) {
    params.set('couple', coupleCode);
  }
  const queryString = params.toString();
  return queryString ? `${APP_URL}/?${queryString}` : APP_URL;
}

// Persistent bottom ReplyKeyboard (app launcher only here, as requested)
function getMainKeyboard(launchUrl: string, notificationsEnabled: boolean = true, isAdmin: boolean = false) {
  const keyboard: any[][] = [
    [
      {
        text: '📱 Открыть «Мы Вместе»',
        web_app: { url: launchUrl },
      },
    ],
    [
      {
        text: notificationsEnabled ? '🔔 Уведомления: Вкл' : '🔕 Уведомления: Выкл',
      },
      {
        text: '💬 Поддержка',
      },
    ],
  ];

  if (isAdmin) {
    keyboard.push([
      { text: '👑 Админ-панель' },
    ]);
  }

  return {
    keyboard,
    resize_keyboard: true,
    is_persistent: true,
  };
}

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
  if (!BOT_TOKEN) {
    console.log(`[Telegram Bot Mock] To ${chatId}: ${text}`);
    return null;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
    return res;
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
    return null;
  }
}

async function sendTelegramPhoto(chatId: number | string, photoFileId: string, caption?: string, replyMarkup?: any) {
  if (!BOT_TOKEN) return null;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoFileId,
        caption: caption || '',
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
    return res;
  } catch (err) {
    console.error('Failed to send Telegram photo:', err);
    return null;
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (err) {}
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // ==========================================
    // 1. HANDLE INLINE CALLBACK QUERIES
    // ==========================================
    if (update.callback_query) {
      const cq = update.callback_query;
      const cqFromId = cq.from.id;
      const data = cq.data || '';
      const isAdmin = ADMIN_TELEGRAM_IDS.includes(Number(cqFromId));

      // --- Admin: Reply to ticket button ---
      if (data.startsWith('reply_ticket_')) {
        if (!isAdmin) {
          await answerCallbackQuery(cq.id, 'Доступ только для администратора.');
          return NextResponse.json({ ok: true });
        }
        const ticketId = Number(data.replace('reply_ticket_', ''));
        adminActiveTicket.set(cqFromId, ticketId);
        await answerCallbackQuery(cq.id);
        await sendTelegramMessage(
          cqFromId,
          `✍️ <b>Ответ на Тикет #${ticketId}:</b>\n\nНапишите ваш ответ следующим сообщением в этот чат:`
        );
        return NextResponse.json({ ok: true });
      }

      // --- Admin: Close ticket button (Manual close only!) ---
      if (data.startsWith('close_ticket_')) {
        if (!isAdmin) {
          await answerCallbackQuery(cq.id, 'Доступ только для администратора.');
          return NextResponse.json({ ok: true });
        }
        const ticketId = Number(data.replace('close_ticket_', ''));
        await answerCallbackQuery(cq.id, `Тикет #${ticketId} закрывается...`);

        if (supabase) {
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('id', ticketId)
            .maybeSingle();

          await supabase
            .from('support_tickets')
            .update({ status: 'closed', updated_at: new Date().toISOString() })
            .eq('id', ticketId);

          if (ticket?.user_telegram_id) {
            await sendTelegramMessage(
              ticket.user_telegram_id,
              `✅ <b>Тикет #${ticketId} закрыт.</b>\n\nРады были помочь! Если появятся новые вопросы или предложения — вы всегда можете нажать кнопку «💬 Поддержка».`
            );
          }
        }

        adminActiveTicket.delete(cqFromId);
        await sendTelegramMessage(cqFromId, `🔒 <b>Тикет #${ticketId} успешно закрыт.</b>`);
        return NextResponse.json({ ok: true });
      }

      // --- Admin: Open tickets list ---
      if (data === 'admin_open_tickets') {
        if (!isAdmin) return NextResponse.json({ ok: true });
        await answerCallbackQuery(cq.id);

        if (!supabase) {
          await sendTelegramMessage(cqFromId, '⚠️ База данных недоступна.');
          return NextResponse.json({ ok: true });
        }

        const { data: openTickets } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('status', 'open')
          .order('id', { ascending: false })
          .limit(5);

        if (!openTickets || openTickets.length === 0) {
          await sendTelegramMessage(cqFromId, '🎉 <b>Нет открытых тикетов!</b> Все обращения обработаны.');
          return NextResponse.json({ ok: true });
        }

        for (const t of openTickets) {
          await sendTelegramMessage(
            cqFromId,
            `📩 <b>Тикет #${t.id}</b>\n` +
            `👤 ${t.user_name} (${t.username ? `@${t.username}` : `ID ${t.user_telegram_id}`})\n` +
            `❤️ Пара: <code>${t.couple_id || 'Не привязана'}</code>\n` +
            `📅 Дата: ${new Date(t.created_at).toLocaleString('ru-RU')}`,
            {
              inline_keyboard: [
                [
                  { text: '💬 Ответить', callback_data: `reply_ticket_${t.id}` },
                  { text: '🔒 Закрыть', callback_data: `close_ticket_${t.id}` },
                ],
              ],
            }
          );
        }
        return NextResponse.json({ ok: true });
      }

      // --- Admin: Bot Statistics ---
      if (data === 'admin_stats') {
        if (!isAdmin) return NextResponse.json({ ok: true });
        await answerCallbackQuery(cq.id);

        let userCount = 0;
        let coupleCount = 0;
        let taskCount = 0;
        let ticketCount = 0;

        if (supabase) {
          const [uRes, cRes, tRes, tkRes] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('couples').select('id', { count: 'exact', head: true }),
            supabase.from('tasks').select('id', { count: 'exact', head: true }),
            supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
          ]);
          userCount = uRes.count || 0;
          coupleCount = cRes.count || 0;
          taskCount = tRes.count || 0;
          ticketCount = tkRes.count || 0;
        }

        await sendTelegramMessage(
          cqFromId,
          `📊 <b>Статистика «Мы Вместе»:</b>\n\n` +
          `👥 Пользователей в базе: <b>${userCount}</b>\n` +
          `❤️ Создано пар: <b>${coupleCount}</b>\n` +
          `📋 Задач и покупок: <b>${taskCount}</b>\n` +
          `📩 Открытых тикетов в поддержке: <b>${ticketCount}</b>`
        );
        return NextResponse.json({ ok: true });
      }

      // --- Admin: Start Broadcast mode ---
      if (data === 'admin_broadcast_init') {
        if (!isAdmin) return NextResponse.json({ ok: true });
        await answerCallbackQuery(cq.id);

        adminBroadcastState.set(cqFromId, { step: 'awaiting_post' });
        await sendTelegramMessage(
          cqFromId,
          `📢 <b>Создание рассылки:</b>\n\n` +
          `Отправьте сообщение, которое хотите разослать всем пользователям бота.\n\n` +
          `• Можно прислать <b>текстовое сообщение</b>\n` +
          `• Можно прислать <b>фотографию с подписью</b>\n\n` +
          `<i>(Для отмены отправьте слово «Отмена»)</i>`
        );
        return NextResponse.json({ ok: true });
      }

      // --- Admin: Confirm and Send Broadcast (with Anti-Ban safeguards) ---
      if (data === 'admin_broadcast_send') {
        if (!isAdmin) return NextResponse.json({ ok: true });
        const post = adminBroadcastState.get(cqFromId);
        if (!post) {
          await answerCallbackQuery(cq.id, 'Пост для рассылки не найден или устарел.');
          return NextResponse.json({ ok: true });
        }

        await answerCallbackQuery(cq.id, 'Рассылка запущена!');
        await sendTelegramMessage(cqFromId, '🚀 <b>Запуск безопасной рассылки...</b>\nПожалуйста, подождите завершения.');

        let recipients: any[] = [];
        if (supabase) {
          const { data: users } = await supabase
            .from('profiles')
            .select('telegram_id')
            .not('telegram_id', 'is', null)
            .eq('is_bot_blocked', false);
          recipients = users || [];
        }

        // Deduplicate recipients
        const uniqueIds = recipients
          .map((r) => Number(r.telegram_id))
          .filter((id, idx, arr) => Boolean(id) && arr.indexOf(id) === idx);

        let sent = 0;
        let failed = 0;

        // Anti-Ban Throttling Queue: ~20 messages/sec with 50ms interval
        for (const tid of uniqueIds) {
          try {
            let res: any = null;
            if (post.photoFileId) {
              res = await sendTelegramPhoto(tid, post.photoFileId, post.text);
            } else if (post.text) {
              res = await sendTelegramMessage(tid, post.text);
            }

            if (res) {
              const resData = await res.json().catch(() => null);
              if (resData && !resData.ok) {
                if (resData.error_code === 403) {
                  // User blocked bot: mark so we don't bother them again
                  failed++;
                  if (supabase) {
                    supabase.from('profiles').update({ is_bot_blocked: true }).eq('telegram_id', tid).then();
                  }
                } else if (resData.error_code === 429) {
                  // Rate limit hit: backoff safely
                  const retrySec = resData.parameters?.retry_after || 2;
                  await new Promise((resolve) => setTimeout(resolve, (retrySec + 1) * 1000));
                  sent++;
                } else {
                  failed++;
                }
              } else {
                sent++;
              }
            } else {
              sent++;
            }
          } catch (sendErr) {
            failed++;
          }

          // 50ms pause between sends ensures we never exceed Telegram limits
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        adminBroadcastState.delete(cqFromId);

        await sendTelegramMessage(
          cqFromId,
          `🏁 <b>Рассылка успешно завершена!</b>\n\n` +
          `✅ Доставлено пользователям: <b>${sent}</b>\n` +
          `⚠️ Ошибок (заблокировали бота): <b>${failed}</b>`
        );
        return NextResponse.json({ ok: true });
      }

      // --- Admin: Cancel Broadcast ---
      if (data === 'admin_broadcast_cancel') {
        adminBroadcastState.delete(cqFromId);
        await answerCallbackQuery(cq.id, 'Рассылка отменена');
        await sendTelegramMessage(cqFromId, '❌ <b>Создание рассылки отменено.</b>');
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // ==========================================
    // 2. HANDLE INCOMING MESSAGES
    // ==========================================
    const message = update.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const fromUser = message.from;
    const text = (message.text || '').trim();
    const isAdmin = ADMIN_TELEGRAM_IDS.includes(Number(fromUser?.id));
    const fullName = [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(' ') || 'Пользователь';

    // Register user chat ID for notifications
    if (fromUser?.id) {
      partnerChatLinks.set(String(fromUser.id), chatId);
    }

    // Check user's notification preferences from Supabase
    let notificationsEnabled = true;
    if (supabase && fromUser?.id) {
      const { data: userProf } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('telegram_id', fromUser.id)
        .maybeSingle();
      if (userProf && userProf.notifications_enabled === false) {
        notificationsEnabled = false;
      }
    }

    // Parse /start parameter (e.g. /start CP-1234, /start CP_1234, or /start login_token)
    let startCode: string | null = null;
    let loginSessionToken: string | null = null;
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        const rawArg = parts[1].trim();
        if (rawArg.startsWith('login_')) {
          loginSessionToken = rawArg;
        } else {
          let rawParam = rawArg.toUpperCase();
          if (rawParam.startsWith('CP_')) {
            rawParam = rawParam.replace('CP_', 'CP-');
          } else if (rawParam.startsWith('CP') && !rawParam.startsWith('CP-')) {
            rawParam = `CP-${rawParam.slice(2)}`;
          }
          if (rawParam.startsWith('CP-')) {
            startCode = rawParam;
            if (fromUser?.id) pendingInvites.set(String(fromUser.id), rawParam);
            pendingInvites.set(String(chatId), rawParam);
          }
        }
      }
    }

    const userCoupleCode =
      startCode ||
      (fromUser?.id ? pendingInvites.get(String(fromUser.id)) : null) ||
      pendingInvites.get(String(chatId)) ||
      null;

    const launchUrl = getWebAppUrl(fromUser, userCoupleCode);
    const persistentKeyboard = getMainKeyboard(launchUrl, notificationsEnabled, isAdmin);

    // ----------------------------------------------------
    // 2.0 Telegram -> PWA Instant Login (Session Handshake)
    // ----------------------------------------------------
    if (loginSessionToken && fromUser?.id) {
      let resolvedCouple = userCoupleCode;
      let existingProfile: any = null;

      if (supabase) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('telegram_id', fromUser.id)
            .maybeSingle();
          existingProfile = data;
          if (data?.couple_id && data.couple_id.startsWith('CP-')) {
            resolvedCouple = data.couple_id;
          }
        } catch (e) {
          console.warn('Error fetching profile for session auth:', e);
        }
      }

      if (!resolvedCouple || !resolvedCouple.startsWith('CP-')) {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let p1 = '', p2 = '';
        for (let i = 0; i < 4; i++) {
          p1 += chars.charAt(Math.floor(Math.random() * chars.length));
          p2 += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        resolvedCouple = `CP-${p1}-${p2}`;
        if (supabase) {
          try {
            await supabase.from('couples').upsert({ id: resolvedCouple, name: 'Наша семья' }, { onConflict: 'id' });
          } catch {}
        }
      }

      const avatar = fromUser.photo_url || existingProfile?.avatar || 'memoji_1';
      const role = existingProfile?.role || 'partner_a';

      if (supabase) {
        try {
          await supabase.from('profiles').upsert({
            id: String(fromUser.id),
            telegram_id: fromUser.id,
            name: fullName,
            username: fromUser.username || null,
            avatar,
            couple_id: resolvedCouple,
            role,
          }, { onConflict: 'id' });
        } catch (e) {
          console.warn('Error saving profile for session auth:', e);
        }
      }

      await authorizeAuthSession(loginSessionToken, {
        id: String(fromUser.id),
        telegram_id: fromUser.id,
        name: fullName,
        avatar,
        couple_id: resolvedCouple,
        role,
      });

      const webLoginUrl = `${APP_URL}/?auth_id=${fromUser.id}&couple=${resolvedCouple}&name=${encodeURIComponent(fullName)}&avatar=${encodeURIComponent(avatar)}`;

      await sendTelegramMessage(
        chatId,
        `✅ <b>Вход в браузере подтверждён!</b>\n\nВы успешно авторизовались в <b>«Мы Вместе»</b> с профиля <b>${fromUser.first_name}</b> (пара <code>${resolvedCouple}</code>).\n\nВкладка на компьютере или в браузере уже открывает приложение! Если этого не произошло, нажмите кнопку ниже:`,
        {
          inline_keyboard: [
            [
              {
                text: '🌐 Открыть в браузере',
                url: webLoginUrl,
              },
            ],
          ],
        }
      );
      return NextResponse.json({ ok: true });
    }

    // ----------------------------------------------------
    // 2.1 User shared contact (Authorization via phone number)
    // ----------------------------------------------------
    if (message.contact) {
      const contact = message.contact;

      if (contact.user_id && contact.user_id !== fromUser.id) {
        await sendTelegramMessage(
          chatId,
          '⚠️ <b>Ошибка авторизации:</b>\nВы отправили чужой контакт. Пожалуйста, поделитесь своим собственным номером телефона для входа.'
        );
        return NextResponse.json({ ok: true });
      }

      const phone = contact.phone_number.startsWith('+')
        ? contact.phone_number
        : `+${contact.phone_number}`;

      verifiedUsers.set(fromUser.id, {
        phone,
        name: contact.first_name || fromUser.first_name,
        username: fromUser.username,
        verifiedAt: new Date().toISOString(),
      });

      if (fromUser?.id && userCoupleCode && supabase) {
        try {
          await supabase.from('profiles').upsert({
            id: String(fromUser.id),
            telegram_id: fromUser.id,
            name: contact.first_name || fromUser.first_name || 'Пользователь',
            username: fromUser.username || null,
            couple_id: userCoupleCode,
            role: 'partner_b',
          }, { onConflict: 'id' });
        } catch (err) {
          console.warn('Webhook profile upsert error:', err);
        }
      }

      await sendTelegramMessage(
        chatId,
        `✅ <b>Вход подтвержден!</b>\n\nНомер <code>${phone}</code> успешно верифицирован.${
          userCoupleCode ? `\n❤️ Вы подключаетесь к паре: <b>${userCoupleCode}</b>` : ''
        }\n\nТеперь вам открыт доступ к Сейфу документов, Хотелкам и Задачам в приложении пары.\n\nНажмите кнопку внизу, чтобы войти:`,
        persistentKeyboard
      );
      return NextResponse.json({ ok: true });
    }

    // ----------------------------------------------------
    // 2.2 Command /start
    // ----------------------------------------------------
    if (text.startsWith('/start')) {
      // Ensure user profile exists in Supabase
      if (fromUser?.id && supabase) {
        try {
          const profileData: any = {
            id: String(fromUser.id),
            telegram_id: fromUser.id,
            name: fullName,
            username: fromUser.username || null,
          };
          if (userCoupleCode) {
            profileData.couple_id = userCoupleCode;
            profileData.role = 'partner_b';
          }
          await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });
        } catch (e) {
          console.warn('Upsert on start error:', e);
        }
      }

      const welcomeInviteText = userCoupleCode
        ? `❤️ Вы подключаетесь к общему пространству пары (код <b>${userCoupleCode}</b>)!\n\n`
        : '';

      const adminGreeting = isAdmin ? '\n👑 <i>Вы авторизованы как администратор бота.</i>' : '';

      await sendTelegramMessage(
        chatId,
        `👋 Привет, <b>${fromUser.first_name}</b>!\n\n${welcomeInviteText}Добро пожаловать в <b>«Мы Вместе»</b> — приватное пространство для вашей пары.${adminGreeting}\n\nДля входа используйте кнопку <b>«📱 Открыть «Мы Вместе»</b> в нижнем меню:`,
        persistentKeyboard
      );
      return NextResponse.json({ ok: true });
    }

    // ----------------------------------------------------
    // 2.3 Toggle Notifications Button
    // ----------------------------------------------------
    if (text.includes('Уведомления:')) {
      const newEnabled = !notificationsEnabled;

      if (supabase && fromUser?.id) {
        await supabase
          .from('profiles')
          .update({ notifications_enabled: newEnabled })
          .eq('telegram_id', fromUser.id);
      }

      const updatedKeyboard = getMainKeyboard(launchUrl, newEnabled, isAdmin);

      if (newEnabled) {
        await sendTelegramMessage(
          chatId,
          `🔔 <b>Уведомления включены!</b>\n\nБот будет присылать вам оповещения о покупках в магазине, новых задачах и желаниях половинки.`,
          updatedKeyboard
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `🔕 <b>Уведомления отключены.</b>\n\nБот больше не будет присылать сообщения об активности половинки. Вы можете включить их обратно в любой момент.`,
          updatedKeyboard
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ----------------------------------------------------
    // 2.4 Support Button (User asks for help)
    // ----------------------------------------------------
    if (text === '💬 Поддержка') {
      userSupportState.set(fromUser.id, true);
      await sendTelegramMessage(
        chatId,
        `💬 <b>Служба поддержки «Мы Вместе»</b>\n\n` +
        `Напишите ваш вопрос, пожелание или опишите проблему следующим сообщением прямо в этот чат — разработчик получит ваше обращение и ответит вам сюда.\n\n` +
        `<i>(Для отмены отправьте слово «Отмена»)</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // ----------------------------------------------------
    // 2.5 Admin Panel Button
    // ----------------------------------------------------
    if (text === '👑 Админ-панель' || text === '/admin') {
      if (!isAdmin) {
        await sendTelegramMessage(chatId, '⛔ Доступ к админ-панели разрешен только администратору.');
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(
        chatId,
        `👑 <b>Панель управления администратора:</b>\n\nВыберите действие:`,
        {
          inline_keyboard: [
            [{ text: '📢 Создать рассылку', callback_data: 'admin_broadcast_init' }],
            [{ text: '📩 Открытые тикеты', callback_data: 'admin_open_tickets' }],
            [{ text: '📊 Статистика бота', callback_data: 'admin_stats' }],
          ],
        }
      );
      return NextResponse.json({ ok: true });
    }

    // ----------------------------------------------------
    // 2.6 Admin Composing Broadcast (Text or Photo)
    // ----------------------------------------------------
    if (isAdmin && adminBroadcastState.has(fromUser.id)) {
      const bState = adminBroadcastState.get(fromUser.id)!;

      if (bState.step === 'awaiting_post') {
        if (text.toLowerCase() === 'отмена') {
          adminBroadcastState.delete(fromUser.id);
          await sendTelegramMessage(chatId, '❌ <b>Создание рассылки отменено.</b>', persistentKeyboard);
          return NextResponse.json({ ok: true });
        }

        const photoFileId = message.photo ? message.photo[message.photo.length - 1].file_id : null;
        const postText = message.caption || message.text || '';

        if (!photoFileId && !postText) {
          await sendTelegramMessage(chatId, '⚠️ Пожалуйста, отправьте текст или фото с подписью.');
          return NextResponse.json({ ok: true });
        }

        adminBroadcastState.set(fromUser.id, {
          step: 'confirm',
          text: postText,
          photoFileId,
        });

        // Count recipients
        let count = 0;
        if (supabase) {
          const { count: c } = await supabase
            .from('profiles')
            .select('telegram_id', { count: 'exact', head: true })
            .not('telegram_id', 'is', null)
            .eq('is_bot_blocked', false);
          count = c || 0;
        }

        const confirmKeyboard = {
          inline_keyboard: [
            [
              { text: '🚀 Запустить рассылку', callback_data: 'admin_broadcast_send' },
              { text: '❌ Отмена', callback_data: 'admin_broadcast_cancel' },
            ],
          ],
        };

        const previewNote = `\n\n────────────────\n👥 <b>Получателей:</b> ${count} пользователей.\nЗапустить рассылку?`;

        if (photoFileId) {
          await sendTelegramPhoto(chatId, photoFileId, `📢 <b>ПРЕДПРОСМОТР РАССЫЛКИ:</b>\n\n${postText}${previewNote}`, confirmKeyboard);
        } else {
          await sendTelegramMessage(chatId, `📢 <b>ПРЕДПРОСМОТР РАССЫЛКИ:</b>\n\n${postText}${previewNote}`, confirmKeyboard);
        }
        return NextResponse.json({ ok: true });
      }
    }

    // ----------------------------------------------------
    // 2.7 Admin Replying to a Ticket
    // (Either via Telegram Reply, or via active ticket state)
    // ----------------------------------------------------
    let replyTicketId: number | null = null;

    if (isAdmin) {
      if (adminActiveTicket.has(fromUser.id)) {
        replyTicketId = adminActiveTicket.get(fromUser.id)!;
      } else if (message.reply_to_message?.text) {
        const match = message.reply_to_message.text.match(/Тикет #(\d+)/i);
        if (match) {
          replyTicketId = Number(match[1]);
        }
      }
    }

    if (isAdmin && replyTicketId && text && text !== 'Отмена') {
      if (supabase) {
        const { data: ticket } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('id', replyTicketId)
          .maybeSingle();

        if (ticket && ticket.user_telegram_id) {
          // Send answer to user
          await sendTelegramMessage(
            ticket.user_telegram_id,
            `👨‍💻 <b>Ответ поддержки «Мы Вместе» (Тикет #${replyTicketId}):</b>\n\n${text}`
          );

          // Record in messages history
          await supabase.from('support_messages').insert({
            ticket_id: replyTicketId,
            sender: 'admin',
            text,
          });

          adminActiveTicket.delete(fromUser.id);

          await sendTelegramMessage(
            chatId,
            `✅ <b>Ответ отправлен пользователю!</b>\nТикет #${replyTicketId} остаётся открытым для дальнейшего диалога.`,
            {
              inline_keyboard: [
                [{ text: `🔒 Закрыть тикет #${replyTicketId}`, callback_data: `close_ticket_${replyTicketId}` }],
              ],
            }
          );
          return NextResponse.json({ ok: true });
        }
      }
    }

    // ----------------------------------------------------
    // 2.8 User Support Message Processing
    // (If in support state OR if user has an active open ticket)
    // ----------------------------------------------------
    const isUserInSupportMode = userSupportState.get(fromUser.id) === true;

    // Check if user has an active open ticket
    let activeUserTicket: any = null;
    if (supabase && fromUser?.id) {
      const { data: openT } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_telegram_id', fromUser.id)
        .eq('status', 'open')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      activeUserTicket = openT;
    }

    if (isUserInSupportMode || activeUserTicket) {
      if (text.toLowerCase() === 'отмена') {
        userSupportState.delete(fromUser.id);
        await sendTelegramMessage(chatId, 'Диалог с поддержкой отменен.', persistentKeyboard);
        return NextResponse.json({ ok: true });
      }

      if (text) {
        let ticketId = activeUserTicket?.id;

        if (!ticketId && supabase) {
          const { data: newT } = await supabase
            .from('support_tickets')
            .insert({
              user_telegram_id: fromUser.id,
              couple_id: userCoupleCode || null,
              user_name: fullName,
              username: fromUser.username || null,
              status: 'open',
            })
            .select()
            .single();
          ticketId = newT?.id;
        }

        if (ticketId && supabase) {
          await supabase.from('support_messages').insert({
            ticket_id: ticketId,
            sender: 'user',
            text,
          });
        }

        userSupportState.delete(fromUser.id);

        // Acknowledge to user
        await sendTelegramMessage(
          chatId,
          `📨 <b>Сообщение отправлено в поддержку (Тикет #${ticketId})</b>\n\nРазработчик получил ваше обращение и ответит прямо сюда. Вы можете дописать детали в любой момент.`,
          persistentKeyboard
        );

        // Notify Admins
        const adminAlert =
          `📩 <b>Тикет #${ticketId} | Сообщение от ${fullName}</b>\n` +
          `👤 ${fromUser.username ? `@${fromUser.username}` : fullName} (ID: <code>${fromUser.id}</code>)\n` +
          `❤️ Пара: <code>${userCoupleCode || 'Не привязана'}</code>\n\n` +
          `💬 <b>Текст:</b>\n«${text}»`;

        for (const admId of ADMIN_TELEGRAM_IDS) {
          await sendTelegramMessage(admId, adminAlert, {
            inline_keyboard: [
              [
                { text: '💬 Ответить', callback_data: `reply_ticket_${ticketId}` },
                { text: '🔒 Закрыть тикет', callback_data: `close_ticket_${ticketId}` },
              ],
            ],
          });
        }
        return NextResponse.json({ ok: true });
      }
    }

    // ----------------------------------------------------
    // 2.9 Command /logout or /reset (Reset device session)
    // ----------------------------------------------------
    if (text.startsWith('/logout') || text.startsWith('/reset')) {
      if (fromUser?.id && supabase) {
        try {
          await supabase
            .from('profiles')
            .update({ active_device_id: null })
            .eq('telegram_id', fromUser.id);
        } catch (e) {
          console.warn('Telegram webhook /logout reset error:', e);
        }
      }

      await sendTelegramMessage(
        chatId,
        `🚪 <b>Привязка устройства сброшена!</b>\n\nАктивная сессия PWA успешно завершена. Теперь вы можете войти в приложение с нового телефона без блокировки.`,
        persistentKeyboard
      );
      return NextResponse.json({ ok: true });
    }

    // ----------------------------------------------------
    // 2.10 Default fallback reply
    // ----------------------------------------------------
    await sendTelegramMessage(
      chatId,
      `❤️ Приложение для вашей пары готово к работе! Нажмите кнопку <b>«📱 Открыть «Мы Вместе»</b> в нижнем меню.`,
      persistentKeyboard
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}
