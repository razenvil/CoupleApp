import { NextRequest, NextResponse } from 'next/server';
import { partnerChatLinks } from '@/lib/telegram-bot';
import { supabase } from '@/lib/supabase';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://couple-app-phi-ruddy.vercel.app';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, senderName, itemTitle, recipientChatId, senderChatId, senderId, coupleId } = body;

    let targetChatId = recipientChatId;

    // 1. Try resolving partner from Supabase profiles if possible
    if (!targetChatId && supabase && coupleId) {
      try {
        const { data: coupleProfiles } = await supabase
          .from('profiles')
          .select('id, name, telegram_id, notifications_enabled, is_bot_blocked')
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

          // Check if partner explicitly disabled notifications or blocked the bot
          if (partnerProfile) {
            if (partnerProfile.notifications_enabled === false || partnerProfile.is_bot_blocked) {
              console.log(`[Notify Route] Partner disabled notifications or blocked bot, skipping Telegram ping.`);
              return NextResponse.json({ ok: true, delivered: false, reason: 'notifications_disabled' });
            }
            if (partnerProfile.telegram_id) {
              targetChatId = partnerProfile.telegram_id;
            }
          } else if (coupleProfiles.length >= 2) {
            // Fallback: in a couple of 2, if one has telegram_id and is not senderChatId
            const other = coupleProfiles.find((p: any) => 
              p.telegram_id && (!senderChatId || Number(p.telegram_id) !== Number(senderChatId))
            );
            if (other?.notifications_enabled === false || other?.is_bot_blocked) {
              return NextResponse.json({ ok: true, delivered: false, reason: 'notifications_disabled' });
            }
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

    // 3. If still no partner found, fallback to sending to sender (so user sees bot notification works!)
    const isSelfTest = !targetChatId && Boolean(senderChatId);
    if (!targetChatId && senderChatId) {
      targetChatId = senderChatId;
    }

    // Format notification text based on action
    let text = '';
    const prefix = isSelfTest ? '🔔 [Тест для вас / Партнёр ещё не вошёл]\n' : '';

    switch (action) {
      case 'task_created':
        text = `${prefix}📋 <b>${senderName}</b> добавил(а) задачу:\n«<b>${itemTitle}</b>»`;
        break;
      case 'task_updated':
        text = `${prefix}✏️ <b>${senderName}</b> обновил(а) задачу:\n«<b>${itemTitle}</b>»`;
        break;
      case 'task_completed':
        text = `${prefix}✅ <b>${senderName}</b> выполнил(а) задачу:\n«<b>${itemTitle}</b>» 🎉`;
        break;
      case 'wish_added':
        text = `${prefix}🎁 <b>${senderName}</b> добавил(а) в вишлист:\n«<b>${itemTitle}</b>» ✨`;
        break;
      case 'doc_added':
        text = `${prefix}🛡️ <b>${senderName}</b> сохранил(а) документ:\n«<b>${itemTitle}</b>»`;
        break;
      case 'grocery_ping':
        text = `${prefix}🛒 <b>${senderName}</b> сейчас в магазине!\nЗагляни в список покупок, если нужно что-то докупить ✨`;
        break;
      default:
        text = `${prefix}🔔 Обновление от <b>${senderName}</b>:\n«<b>${itemTitle}</b>»`;
    }

    // Format plain text for Web Push
    let pushTitle = 'Мы Вместе ❤️';
    let pushBody = `${senderName}: ${itemTitle}`;
    switch (action) {
      case 'task_created':
        pushBody = `📋 ${senderName} добавил(а) задачу: «${itemTitle}»`;
        break;
      case 'task_completed':
        pushBody = `✅ ${senderName} выполнил(а) задачу: «${itemTitle}» 🎉`;
        break;
      case 'wish_added':
        pushBody = `🎁 ${senderName} добавил(а) в вишлист: «${itemTitle}» ✨`;
        break;
      case 'doc_added':
        pushBody = `🛡️ ${senderName} сохранил(а) документ: «${itemTitle}»`;
        break;
      case 'grocery_ping':
        pushTitle = '🛒 Я в магазине!';
        pushBody = `${senderName} закупается! Проверь список покупок.`;
        break;
      default:
        pushBody = `🔔 ${senderName}: ${itemTitle}`;
    }

    // DISPATCH WEB PUSH NOTIFICATIONS TO PARTNER
    if (coupleId) {
      (async () => {
        try {
          const { sendWebPush, globalPushSubscriptions } = await import('@/lib/web-push-server');

          // 1. From in-memory map
          const inMem = globalPushSubscriptions.get(coupleId) || [];
          for (const item of inMem) {
            // Do not push back to sender if senderChatId/userId/senderId matches
            const isSender =
              (senderChatId && String(item.userId) === String(senderChatId)) ||
              (senderId && String(item.userId) === String(senderId));
            if (!isSender) {
              await sendWebPush(item.subscription, {
                title: pushTitle,
                body: pushBody,
                url: '/',
              });
            }
          }

          // 2. From Supabase if available
          if (supabase) {
            const { data: dbSubs } = await supabase
              .from('web_push_subscriptions')
              .select('*')
              .eq('couple_id', coupleId);

            if (dbSubs && dbSubs.length > 0) {
              for (const row of dbSubs) {
                const isSender =
                  (senderChatId && String(row.user_id) === String(senderChatId)) ||
                  (senderId && String(row.user_id) === String(senderId));
                if (!isSender) {
                  await sendWebPush(row.subscription, {
                    title: pushTitle,
                    body: pushBody,
                    url: '/',
                  });
                }
              }
            }
          }
        } catch (pushErr) {
          console.warn('Web push broadcast error:', pushErr);
        }
      })();
    }

    if (!BOT_TOKEN) {
      console.log(`[Telegram Notification Local Log] ${text}`);
      return NextResponse.json({ ok: true, mocked: true, message: text });
    }

    if (!targetChatId) {
      console.log(`[Telegram Notification Warning] No target chat ID found, skipping delivery.`);
      return NextResponse.json({ ok: true, delivered: false, reason: 'no_recipient' });
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();

    // If bot was blocked by user, mark in profiles
    if (!data.ok && data.error_code === 403 && supabase) {
      supabase.from('profiles').update({ is_bot_blocked: true }).eq('telegram_id', targetChatId).then();
    }

    return NextResponse.json({ ok: true, delivered: Boolean(data.ok), data });
  } catch (error) {
    console.error('Failed to dispatch notification:', error);
    return NextResponse.json({ ok: false, error: 'Internal notification error' }, { status: 500 });
  }
}
