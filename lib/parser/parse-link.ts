import * as cheerio from 'cheerio';
import { LinkParseResult } from '../types';

/**
 * Calculates Wildberries basket number for image CDN based on product article ID
 */
function getWildberriesBasket(vol: number): string {
  if (vol >= 0 && vol <= 143) return '01';
  if (vol <= 287) return '02';
  if (vol <= 431) return '03';
  if (vol <= 719) return '04';
  if (vol <= 1007) return '05';
  if (vol <= 1061) return '06';
  if (vol <= 1115) return '07';
  if (vol <= 1169) return '08';
  if (vol <= 1313) return '09';
  if (vol <= 1601) return '10';
  if (vol <= 1655) return '11';
  if (vol <= 1919) return '12';
  if (vol <= 2045) return '13';
  if (vol <= 2189) return '14';
  if (vol <= 2405) return '15';
  if (vol <= 2621) return '16';
  if (vol <= 2837) return '17';
  if (vol <= 3053) return '18';
  if (vol <= 3269) return '19';
  if (vol <= 3485) return '20';
  if (vol <= 3701) return '21';
  if (vol <= 3917) return '22';
  if (vol <= 4133) return '23';
  if (vol <= 4349) return '24';
  if (vol <= 4565) return '25';
  if (vol <= 4781) return '26';
  if (vol <= 4997) return '27';
  if (vol <= 5213) return '28';
  if (vol <= 5429) return '29';
  if (vol <= 5645) return '30';
  if (vol <= 5861) return '31';
  if (vol <= 6077) return '32';
  return '33';
}

/**
 * Transliterates common Russian slugs from URLs (e.g. for Ozon slug fallback)
 */
function transliterateSlug(slug: string): string {
  const words = slug.split('-').filter(Boolean);
  const transMap: Record<string, string> = {
    shch: 'щ', yo: 'ё', zh: 'ж', ch: 'ч', sh: 'ш', yu: 'ю', ya: 'я',
    ts: 'ц', kh: 'х', a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е',
    z: 'з', i: 'и', j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о',
    p: 'п', r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', y: 'ы', e1: 'э',
  };

  const cleanWords = words.map((w) => {
    if (/^\d+$/.test(w)) return '';
    let res = w.toLowerCase();
    for (const [lat, cyr] of Object.entries(transMap)) {
      res = res.replaceAll(lat, cyr);
    }
    return res;
  }).filter(Boolean);

  if (cleanWords.length === 0) return '';
  const phrase = cleanWords.join(' ');
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/**
 * Checks whether title is generic anti-bot or invalid placeholder
 */
function isInvalidTitle(t?: string | null): boolean {
  if (!t || t.trim().length < 2) return true;
  const lower = t.toLowerCase().trim();
  return (
    lower === 'ozon' ||
    lower === 'wildberries' ||
    lower.includes('интернет-магазин wildberries') ||
    lower.includes('широкий ассортимент товаров') ||
    lower.includes('скидки каждый день') ||
    lower.includes('доступ ограничен') ||
    lower.includes('access denied') ||
    lower.includes('just a moment') ||
    lower.includes('cloudflare') ||
    lower.includes('проверка безопасности') ||
    lower.includes('вход в интернет-магазин') ||
    lower.includes('робот') ||
    lower === '403 forbidden' ||
    lower === '404 not found'
  );
}

/**
 * Free Wildberries catalog CDN parser
 */
async function parseWildberries(url: string): Promise<LinkParseResult | null> {
  const match = url.match(/(?:wildberries\.ru|wb\.ru)\/catalog\/(\d+)/i);
  if (!match) return null;

  const nmId = parseInt(match[1], 10);
  if (isNaN(nmId)) return null;

  const vol = Math.floor(nmId / 100000);
  const part = Math.floor(nmId / 1000);
  const baseBasket = parseInt(getWildberriesBasket(vol), 10);

  // Probe baseBasket and adjacent to guarantee hit
  const candidateBaskets = [
    baseBasket,
    baseBasket + 1,
    baseBasket - 1,
    baseBasket + 2,
    baseBasket - 2,
  ].filter((b) => b >= 1 && b <= 35);

  for (const b of candidateBaskets) {
    const basketStr = b < 10 ? `0${b}` : `${b}`;
    const cardUrl = `https://basket-${basketStr}.wbbasket.ru/vol${vol}/part${part}/${nmId}/info/ru/card.json`;

    try {
      const res = await fetch(cardUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
        next: { revalidate: 3600 },
      });

      if (!res.ok) continue;

      const product = await res.json();
      const rawTitle = product.imt_name || product.subj_name || product.name;
      if (!rawTitle || isInvalidTitle(rawTitle)) continue;

      const brand = product.selling?.brand_name || '';
      const title = brand ? `${brand} / ${rawTitle}` : rawTitle;
      const imageUrl = `https://basket-${basketStr}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/c516x688/1.webp`;

      // Fetch price from price history
      let price: number | undefined;
      try {
        const priceRes = await fetch(
          `https://basket-${basketStr}.wbbasket.ru/vol${vol}/part${part}/${nmId}/info/price-history.json`,
          { next: { revalidate: 3600 } }
        );
        if (priceRes.ok) {
          const history = await priceRes.json();
          if (Array.isArray(history) && history.length > 0) {
            const lastItem = history[history.length - 1];
            const rub = lastItem?.price?.RUB;
            if (rub) price = Math.round(rub / 100);
          }
        }
      } catch {}

      return {
        title: title.trim(),
        price,
        currency: '₽',
        imageUrl,
        source: 'wildberries',
        success: true,
      };
    } catch {
      // Continue to next candidate basket
    }
  }

  return null;
}

/**
 * Specialized Ozon parser with slug fallback
 */
async function parseOzon(url: string): Promise<LinkParseResult> {
  // 1. Try extracting product name from Ozon URL slug
  let slugTitle = '';
  const slugMatch = url.match(/ozon\.ru\/product\/([a-zA-Z0-9_-]+)(?:\/|\?|$)/i);
  if (slugMatch && slugMatch[1]) {
    const rawSlug = slugMatch[1];
    slugTitle = transliterateSlug(rawSlug);
  }

  // 2. Try scraping HTML metadata
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8',
      },
      redirect: 'follow',
    });

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      let title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text().trim();

      if (title) {
        title = title
          .replace(/— купить в интернет-магазине.*$/i, '')
          .replace(/— купить по выгодной цене.*$/i, '')
          .replace(/— интернет-магазин.*$/i, '')
          .replace(/\|\s*OZON.*$/i, '')
          .replace(/\|\s*Wildberries.*$/i, '')
          .trim();
      }

      if (isInvalidTitle(title)) {
        title = '';
      }

      let imageUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content');

      if (imageUrl && (imageUrl.includes('favicon') || imageUrl.includes('logo'))) {
        imageUrl = undefined;
      }

      let price: number | undefined;
      const ogPrice = $('meta[property="product:price:amount"]').attr('content');
      if (ogPrice) {
        const parsed = parseFloat(ogPrice.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) price = Math.round(parsed);
      }

      const finalTitle = title || slugTitle;

      if (finalTitle && !isInvalidTitle(finalTitle)) {
        return {
          title: finalTitle.trim(),
          imageUrl: imageUrl || undefined,
          price,
          currency: '₽',
          source: 'ozon',
          success: true,
        };
      }
    }
  } catch {
    // Scraping failed
  }

  // Fallback to slug if scraping was blocked
  if (slugTitle && slugTitle.length > 2 && !isInvalidTitle(slugTitle)) {
    return {
      title: slugTitle.trim(),
      currency: '₽',
      source: 'ozon',
      success: true,
    };
  }

  return {
    source: 'ozon',
    success: false,
    error: 'Ozon защищен от роботов. Пожалуйста, введите название товара вручную.',
  };
}

/**
 * Generic OpenGraph / HTML metadata scraper for other shops
 */
async function parseGeneric(url: string): Promise<LinkParseResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8',
      },
      redirect: 'follow',
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().trim();

    if (title) {
      title = title
        .replace(/— купить в интернет-магазине.*$/i, '')
        .replace(/— купить по выгодной цене.*$/i, '')
        .replace(/— интернет-магазин.*$/i, '')
        .trim();
    }

    if (isInvalidTitle(title)) {
      title = '';
    }

    let imageUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content');

    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        const parsedUrl = new URL(url);
        imageUrl = new URL(imageUrl, parsedUrl.origin).toString();
      } catch {}
    }

    let price: number | undefined;
    const ogPrice = $('meta[property="product:price:amount"]').attr('content');
    if (ogPrice) {
      const parsed = parseFloat(ogPrice.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) price = Math.round(parsed);
    }

    // JSON-LD fallback
    if (!title || !price || !imageUrl) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const jsonText = $(el).html();
          if (!jsonText) return;
          const data = JSON.parse(jsonText);
          const item = Array.isArray(data) ? data[0] : data;

          if (!title && item?.name && !isInvalidTitle(item.name)) {
            title = item.name;
          }
          if (!price && item?.offers?.price) {
            price = Math.round(parseFloat(item.offers.price));
          }
          if (!imageUrl && item?.image) {
            imageUrl = Array.isArray(item.image) ? item.image[0] : item.image;
          }
        } catch {}
      });
    }

    const hasValidTitle = Boolean(title && title.trim().length > 1 && !isInvalidTitle(title));

    return {
      title: hasValidTitle ? title.trim() : undefined,
      imageUrl: imageUrl || undefined,
      price,
      currency: '₽',
      source: 'opengraph',
      success: hasValidTitle,
      error: hasValidTitle ? undefined : 'Не удалось определить название. Введите его вручную.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Сайт ограничил доступ. Пожалуйста, введите название вручную.',
    };
  }
}

/**
 * Main parseProductLink entrypoint
 */
export async function parseProductLink(rawUrl: string): Promise<LinkParseResult> {
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // 1. Wildberries
  if (url.includes('wildberries.ru') || url.includes('wb.ru')) {
    const wbResult = await parseWildberries(url);
    if (wbResult && wbResult.success) {
      return wbResult;
    }
  }

  // 2. Ozon
  if (url.includes('ozon.ru') || url.includes('ozon.by')) {
    const ozonResult = await parseOzon(url);
    if (ozonResult && ozonResult.success) {
      return ozonResult;
    }
  }

  // 3. Generic OpenGraph
  const genericResult = await parseGeneric(url);
  if (genericResult.success) {
    return genericResult;
  }

  // Fallback
  return {
    success: false,
    error: 'Магазин ограничил автопарсинг. Пожалуйста, введите название вручную.',
  };
}
