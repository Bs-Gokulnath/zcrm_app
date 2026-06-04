import { OLA_MAPS_API_KEY } from '../lib/constants';
import type { BoardItem } from './board-groups';

const cityCache: Record<string, [number, number] | null> = {};
const itemCache: Record<string, [number, number] | null> = {};

function parseCoords(s: string): [number, number] | null {
  const m = s.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

function hasPlusCode(s: string): boolean {
  return /[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]*/i.test(s);
}

export async function olaGeocode(query: string): Promise<[number, number] | null> {
  if (!query || !OLA_MAPS_API_KEY) return null;
  if (cityCache[query] !== undefined) return cityCache[query];
  try {
    const url = `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(query)}&api_key=${OLA_MAPS_API_KEY}`;
    const res = await fetch(url, {
      headers: { 'X-Request-Id': Math.random().toString(36).slice(2) },
    });
    if (!res.ok) { cityCache[query] = null; return null; }
    const data = await res.json();
    const loc = data?.geocodingResults?.[0]?.geometry?.location;
    if (loc?.lat != null && loc?.lng != null) {
      const coords: [number, number] = [parseFloat(loc.lat), parseFloat(loc.lng)];
      cityCache[query] = coords;
      return coords;
    }
    cityCache[query] = null;
    return null;
  } catch {
    cityCache[query] = null;
    return null;
  }
}

export async function resolveItem(item: BoardItem): Promise<[number, number] | null> {
  if (itemCache[item.id] !== undefined) return itemCache[item.id];

  const loc = item.location?.trim() ?? '';

  if (loc) {
    const c = parseCoords(loc);
    if (c) { itemCache[item.id] = c; return c; }
  }

  if (loc && hasPlusCode(loc)) {
    const c = await olaGeocode(loc);
    if (c) { itemCache[item.id] = c; return c; }
  }

  if (loc && !hasPlusCode(loc)) {
    const q = [loc, item.city, item.state].filter(Boolean).join(', ');
    const c = await olaGeocode(q);
    if (c) { itemCache[item.id] = c; return c; }
  }

  const nameQ = [item.name, item.city, item.state].filter(Boolean).join(', ');
  if (nameQ) {
    const c = await olaGeocode(nameQ);
    if (c) { itemCache[item.id] = c; return c; }
  }

  const cityQ = [item.city, item.state].filter(Boolean).join(', ');
  if (cityQ) {
    const c = await olaGeocode(cityQ);
    if (c) { itemCache[item.id] = c; return c; }
  }

  if (item.state) {
    const c = await olaGeocode(item.state);
    if (c) { itemCache[item.id] = c; return c; }
  }

  itemCache[item.id] = null;
  return null;
}

export function clearItemCache(itemId: string) {
  delete itemCache[itemId];
}

export function clearAllCaches() {
  Object.keys(cityCache).forEach(k => delete cityCache[k]);
  Object.keys(itemCache).forEach(k => delete itemCache[k]);
}
