import { NextRequest, NextResponse } from 'next/server';
import { parseProductLink } from '@/lib/parser/parse-link';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Укажите корректную ссылку на товар' },
        { status: 400 }
      );
    }

    const result = await parseProductLink(url);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Внутренняя ошибка парсера' },
      { status: 500 }
    );
  }
}
