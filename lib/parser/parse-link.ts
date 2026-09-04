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
  return '24';
}

/**
 * Free Wildberries catalog API parser (zero keys, direct JSON endpoint)
 */
async function parseWildberries(url: string): Promise<LinkParseResult | null> {
  const match = url.match(/(?:wildberries\.ru|wb\.ru)\/catalog\/(\d+)/i);
  if (!match) return null;

  const nmId = parseInt(match[1], 10);
  if (isNaN(nmId)) return null;

  try {
    const apiUrl = `https://card.wb.ru/cards/v1/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${nmId}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`WB API responded with status ${response.status}`);
    }

    const data = await response.json();
    const product = data?.data?.products?.[0];

    if (!product) {
      return {
        success: false,
        source: 'wildberries',
        error: 'Товар не найден на Wildberries',
      };
    }

    const vol = Math.floor(nmId / 100000);
    const part = Math.floor(nmId / 1000);
    const basket = getWildberriesBasket(vol);
    const imageUrl = `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${nmId}/images/c516x688/1.webp`;

    // WB prices are returned in kopecks (cents)
    const rawPrice = product.salePriceU || product.priceU;
    const price = rawPrice ? Math.round(rawPrice / 100) : undefined;

    const brandName = product.brand ? `${product.brand} / ` : '';
    const title = `${brandName}${product.name || 'Товар с Wildberries'}`;

    return {
      title,
      price,
      currency: '₽',
      imageUrl,
      source: 'wildberries',
      success: true,
    };
  } catch (err: any) {
    console.error('WB parsing error:', err);
    return null;
  }
}

/**
 * Generic OpenGraph / HTML metadata scraper for Ozon and other shops
 */
async function parseGeneric(url: string): Promise<LinkParseResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    const isOzon = url.includes('ozon.ru') || url.includes('ozon.by');
    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Title detection
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().trim();

    // Clean up title (remove trailing "— купить по низкой цене в интернет-магазине OZON" etc.)
    if (title) {
      title = title
        .replace(/— купить в интернет-магазине.*$/i, '')
        .replace(/— купить по выгодной цене.*$/i, '')
        .replace(/— интернет-магазин.*$/i, '')
        .replace(/\|\s*OZON.*$/i, '')
        .replace(/\|\s*Wildberries.*$/i, '')
        .trim();
    }

    // 2. Image detection
    let imageUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href');

    // Make relative image absolute if needed
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        const parsedUrl = new URL(url);
        imageUrl = new URL(imageUrl, parsedUrl.origin).toString();
      } catch {}
    }

    // 3. Price detection
    let price: number | undefined;
    const ogPrice =
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[property="og:price:amount"]').attr('content');

    if (ogPrice) {
      const parsed = parseFloat(ogPrice.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) price = Math.round(parsed);
    }

    // Check JSON-LD if price or image not found
    if (!price || !imageUrl) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const jsonText = $(el).html();
          if (!jsonText) return;
          const data = JSON.parse(jsonText);
          const item = Array.isArray(data) ? data[0] : data;
          
          if (!price && item?.offers?.price) {
            price = Math.round(parseFloat(item.offers.price));
          }
          if (!imageUrl && item?.image) {
            imageUrl = Array.isArray(item.image) ? item.image[0] : item.image;
          }
          if (!title && item?.name) {
            title = item.name;
          }
        } catch {}
      });
    }

    return {
      title: title || undefined,
      imageUrl: imageUrl || undefined,
      price,
      currency: '₽',
      source: isOzon ? 'ozon' : 'opengraph',
      success: Boolean(title || imageUrl || price),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Не удалось распарсить ссылку',
    };
  }
}

/**
 * Main parseLink entrypoint
 */
export async function parseProductLink(rawUrl: string): Promise<LinkParseResult> {
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // 1. Try Wildberries specialized parser first
  if (url.includes('wildberries.ru') || url.includes('wb.ru')) {
    const wbResult = await parseWildberries(url);
    if (wbResult && wbResult.success) {
      return wbResult;
    }
  }

  // 2. Try generic OpenGraph scraper
  const genericResult = await parseGeneric(url);
  if (genericResult.success) {
    return genericResult;
  }

  // Fallback
  return {
    success: false,
    error: 'Не удалось получить данные о товаре автоматически. Вы можете заполнить поля вручную.',
  };
}
