import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendPartnerNotification } from '@/lib/telegram-bot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { coupleId, startDate, anniversaryTitle, senderName } = body;

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

    // 1. Try updating with full payload
    let updateResult = await supabase
      .from('couples')
      .update(updatePayload)
      .eq('id', coupleId);

    // If failed due to unknown column (e.g. name or anniversary_title), retry with start_date only
    if (updateResult.error && startDate !== undefined) {
      console.warn('[API couple/update] Retrying with start_date only due to:', updateResult.error);
      updateResult = await supabase
        .from('couples')
        .update({ start_date: startDate })
        .eq('id', coupleId);
    }

    if (updateResult.error) {
      console.error('[API couple/update] Supabase error:', updateResult.error);
      return NextResponse.json({ ok: false, error: updateResult.error.message }, { status: 500 });
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
    }

    return NextResponse.json({ ok: true, data: updatePayload });
  } catch (err: any) {
    console.error('[API couple/update] Internal error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
