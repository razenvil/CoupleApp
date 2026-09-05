import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendPartnerNotification } from '@/lib/telegram-bot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { coupleId, startDate, anniversaryTitle, senderName, vaultPin, isVaultLocked } = body;

    if (!coupleId) {
      return NextResponse.json({ ok: false, error: 'coupleId is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Database is not configured' }, { status: 503 });
    }

    const updatePayload: any = {};
    if (startDate !== undefined) {
      updatePayload.start_date = startDate;
    }
    if (anniversaryTitle !== undefined) {
      updatePayload.anniversary_title = anniversaryTitle;
      updatePayload.name = anniversaryTitle;
    }
    if (vaultPin !== undefined) {
      updatePayload.vault_pin = vaultPin;
    }
    if (isVaultLocked !== undefined) {
      updatePayload.is_vault_locked = isVaultLocked;
    }

    // 1. Try updating with full payload
    let updateResult = await supabase
      .from('couples')
      .update(updatePayload)
      .eq('id', coupleId);

    // If failed due to unknown column (e.g. name, anniversary_title, or vault_pin before migration), retry step-by-step
    if (updateResult.error) {
      console.warn('[API couple/update] Full update failed, retrying with available columns:', updateResult.error);
      
      const safePayload: any = {};
      if (startDate !== undefined) safePayload.start_date = startDate;
      if (anniversaryTitle !== undefined) safePayload.name = anniversaryTitle;

      if (Object.keys(safePayload).length > 0) {
        updateResult = await supabase
          .from('couples')
          .update(safePayload)
          .eq('id', coupleId);
      }
    }

    // 2. Notify partner via Telegram and Web Push
    if (startDate && senderName) {
      const formattedDate = new Date(startDate).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      sendPartnerNotification({
        coupleId,
        senderName,
        action: 'match_date',
        itemTitle: `Новая дата отношений: с ${formattedDate} ❤️`,
      });
    } else if (vaultPin && senderName) {
      sendPartnerNotification({
        coupleId,
        senderName,
        action: 'task_updated',
        itemTitle: '🔒 Пароль от сейфа документов обновлен!',
      });
    }

    return NextResponse.json({ ok: true, data: updatePayload });
  } catch (err: any) {
    console.error('[API couple/update] Internal error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
