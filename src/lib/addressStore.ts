import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface Waypoint {
  id: number;
  title: string;
  cue: string;
  distance: string;
  targetObject: string;
  turnDirection: 'straight' | 'right' | 'left';
  screenPosition: { top: string; left: string };
  thumbnail?: string;
}

export interface AddressCapsule {
  addressTitle: string;
  macroAnchor: string;
  pataHandle: string;
  voiceNoteHindi: string;
  waypoints: Waypoint[];
  phoneHash?: string;
  updatedAt?: number;
}

export const PRESET_CAPSULES: Record<string, AddressCapsule> = {
  gali: {
    addressTitle: 'Flat 302, Green Heights, Gali 3',
    macroAnchor: 'Ganesh Temple Chowk (80 ft Road)',
    pataHandle: 'pata.in/blr-302',
    voiceNoteHindi: 'मंदिर से सीधे 10 फीट की संकरी गली में जाएं। पीला खंभा पार करके दूसरा हरा गेट फ्लैट 302 है।',
    waypoints: [
      {
        id: 1,
        title: 'Ganesh Temple',
        cue: 'Take the narrow 10 ft gali directly to the right',
        distance: '65 m',
        targetObject: 'temple or shrine or religious arch',
        turnDirection: 'right',
        screenPosition: { top: '35%', left: '55%' }
      },
      {
        id: 2,
        title: 'Yellow Transformer',
        cue: 'Walk straight 40 m and keep transformer on your left',
        distance: '25 m',
        targetObject: 'yellow electrical transformer or metal utility box or pole',
        turnDirection: 'straight',
        screenPosition: { top: '40%', left: '30%' }
      },
      {
        id: 3,
        title: 'Green Gate (Door 302)',
        cue: 'Second house on the right, doorbell on left pillar',
        distance: 'Doorstep',
        targetObject: 'green iron gate or house entrance door',
        turnDirection: 'right',
        screenPosition: { top: '38%', left: '60%' }
      }
    ]
  },
  hostel: {
    addressTitle: 'Room 214, Patel Hall of Residence',
    macroAnchor: 'Main Campus Security Gate #2',
    pataHandle: 'pata.in/patel-214',
    voiceNoteHindi: 'मेन गेट से अंदर आकर बास्केटबॉल कोर्ट की तरफ जाएं। नॉर्थ विंग की सीढ़ियां चढ़कर रूम 214 पहुंचे।',
    waypoints: [
      {
        id: 1,
        title: 'Security Gate #2',
        cue: 'Enter campus and head straight past the guard post',
        distance: '90 m',
        targetObject: 'security gate or barrier or guard cabin',
        turnDirection: 'straight',
        screenPosition: { top: '36%', left: '50%' }
      },
      {
        id: 2,
        title: 'North Wing Staircase',
        cue: 'Turn left after sports court and take the staircase',
        distance: '30 m',
        targetObject: 'staircase or building steps or entrance lobby',
        turnDirection: 'left',
        screenPosition: { top: '40%', left: '35%' }
      },
      {
        id: 3,
        title: 'Room 214 Door',
        cue: 'Second door on the right along the 2nd floor corridor',
        distance: 'Doorstep',
        targetObject: 'wooden door or room number door sign',
        turnDirection: 'right',
        screenPosition: { top: '38%', left: '55%' }
      }
    ]
  },
  office: {
    addressTitle: 'Desk 4B, 3rd Floor, EcoSpace Tech Park',
    macroAnchor: 'Tower 3 Drop-off Porch',
    pataHandle: 'pata.in/ecospace-4b',
    voiceNoteHindi: 'टॉवर 3 पोर्च से मुख्य लॉबी में प्रवेश करें। टर्नस्टाइल 2 पार करके लिफ्ट से तीसरी मंजिल जाएं।',
    waypoints: [
      {
        id: 1,
        title: 'Tower 3 Glass Lobby',
        cue: 'Walk through glass doors into the main atrium',
        distance: '50 m',
        targetObject: 'glass doors or glass entrance lobby',
        turnDirection: 'straight',
        screenPosition: { top: '35%', left: '50%' }
      },
      {
        id: 2,
        title: 'Turnstile Barrier #2',
        cue: 'Tap badge at turnstile and head toward elevators',
        distance: '20 m',
        targetObject: 'turnstile barrier or security gates or badge reader',
        turnDirection: 'right',
        screenPosition: { top: '42%', left: '60%' }
      },
      {
        id: 3,
        title: 'Desk Bay 4B',
        cue: 'Take elevator to 3rd floor and turn right past cafeteria',
        distance: 'Doorstep',
        targetObject: 'office workstations or glass cubicle or cafeteria',
        turnDirection: 'right',
        screenPosition: { top: '38%', left: '50%' }
      }
    ]
  }
};

const DIRECTORY_STORAGE_KEY = 'patavision_address_directory_v1';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export function isCloudEnabled(): boolean {
  return Boolean(supabase);
}

/** Pure-JS SHA-256 fallback for non-HTTPS LAN origins where crypto.subtle is unavailable. */
function sha256Fallback(ascii: string): string {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export async function hashPhone(rawPhone: string): Promise<string> {
  const normalized = normalizePhone(rawPhone);
  if (!normalized) return '';
  const input = `patavision:${normalized}`;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoded = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fallback below
    }
  }

  return sha256Fallback(input);
}

export function formatShortHash(hash: string): string {
  if (!hash || hash.length < 10) return hash;
  return `sha256: ${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export function normalizeHandle(slugOrHandle: string): string {
  const cleaned = slugOrHandle
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^pata\.(in|link)\//, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `pata.in/${cleaned || 'route'}`;
}

export function stripHandlePrefix(handle: string): string {
  return handle.replace(/^pata\.(in|link)\//i, '');
}

function seedPresetsIfEmpty(): AddressCapsule[] {
  const presets = Object.values(PRESET_CAPSULES).map(p => ({ ...p, updatedAt: Date.now() }));
  try {
    localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Ignore quota errors
  }
  return presets;
}

export function listDirectory(): AddressCapsule[] {
  try {
    const raw = localStorage.getItem(DIRECTORY_STORAGE_KEY);
    if (!raw) return seedPresetsIfEmpty();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return seedPresetsIfEmpty();
}

export function saveToDirectory(capsule: AddressCapsule): AddressCapsule[] {
  const normalized: AddressCapsule = {
    ...capsule,
    pataHandle: normalizeHandle(capsule.pataHandle),
    updatedAt: Date.now()
  };

  const current = listDirectory();
  const idx = current.findIndex(
    item =>
      item.pataHandle.toLowerCase() === normalized.pataHandle.toLowerCase() ||
      (normalized.phoneHash && item.phoneHash === normalized.phoneHash)
  );

  const updated =
    idx >= 0
      ? current.map((item, i) => (i === idx ? normalized : item))
      : [normalized, ...current];

  try {
    localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // If thumbnails exceed localStorage quota, retry without thumbnails
    const compact = updated.map(c => ({
      ...c,
      waypoints: c.waypoints.map(({ thumbnail: _t, ...rest }) => rest)
    }));
    try {
      localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore
    }
  }

  return updated;
}

export function lookupByHandle(query: string): AddressCapsule | null {
  const target = normalizeHandle(query).toLowerCase();
  const dir = listDirectory();
  return (
    dir.find(
      item =>
        item.pataHandle.toLowerCase() === target ||
        stripHandlePrefix(item.pataHandle).toLowerCase() === query.trim().toLowerCase()
    ) || null
  );
}

export async function lookupByPhone(
  rawPhone: string
): Promise<{ hash: string; match: AddressCapsule | null }> {
  const hash = await hashPhone(rawPhone);
  if (!hash) return { hash: '', match: null };
  const dir = listDirectory();
  const match = dir.find(item => item.phoneHash === hash) || null;
  return { hash, match };
}

export function encodeCapsuleForHash(capsule: AddressCapsule): string {
  const stripped: AddressCapsule = {
    ...capsule,
    waypoints: capsule.waypoints.map(({ thumbnail: _t, ...rest }) => rest)
  };
  return btoa(encodeURIComponent(JSON.stringify(stripped)));
}

interface CapsuleRow {
  slug: string;
  pata_handle: string;
  address_title: string;
  macro_anchor: string;
  voice_note_hindi: string | null;
  phone_hash: string | null;
  waypoints: Waypoint[];
  updated_at: string;
}

function rowToCapsule(row: CapsuleRow): AddressCapsule {
  return {
    pataHandle: row.pata_handle || `pata.in/${row.slug}`,
    addressTitle: row.address_title,
    macroAnchor: row.macro_anchor,
    voiceNoteHindi: row.voice_note_hindi || '',
    phoneHash: row.phone_hash || undefined,
    waypoints: Array.isArray(row.waypoints) ? row.waypoints : [],
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now()
  };
}

export async function saveToDirectoryAsync(capsule: AddressCapsule): Promise<{
  capsule: AddressCapsule;
  savedToCloud: boolean;
  error?: string;
}> {
  const normalizedHandle = normalizeHandle(capsule.pataHandle);
  const slug = stripHandlePrefix(normalizedHandle);
  const normalized: AddressCapsule = {
    ...capsule,
    pataHandle: normalizedHandle,
    updatedAt: Date.now()
  };

  saveToDirectory(normalized);

  if (!supabase) {
    return { capsule: normalized, savedToCloud: false };
  }

  try {
    const { error } = await supabase.from('capsules').upsert(
      {
        slug,
        pata_handle: normalizedHandle,
        address_title: normalized.addressTitle,
        macro_anchor: normalized.macroAnchor,
        voice_note_hindi: normalized.voiceNoteHindi || '',
        phone_hash: normalized.phoneHash || null,
        waypoints: normalized.waypoints,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'slug' }
    );

    if (error) {
      return { capsule: normalized, savedToCloud: false, error: error.message };
    }
    return { capsule: normalized, savedToCloud: true };
  } catch (err: any) {
    return {
      capsule: normalized,
      savedToCloud: false,
      error: err?.message || 'Cloud sync failed'
    };
  }
}

export async function lookupByHandleAsync(query: string): Promise<AddressCapsule | null> {
  const slug = stripHandlePrefix(normalizeHandle(query)).toLowerCase();

  if (supabase && slug) {
    try {
      const { data, error } = await supabase
        .from('capsules')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data) {
        const cap = rowToCapsule(data as CapsuleRow);
        saveToDirectory(cap);
        return cap;
      }
    } catch {
      // Fallback to local directory below
    }
  }

  return lookupByHandle(query);
}

export async function lookupByPhoneAsync(
  rawPhone: string
): Promise<{ hash: string; match: AddressCapsule | null }> {
  const hash = await hashPhone(rawPhone);
  if (!hash) return { hash: '', match: null };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('capsules')
        .select('*')
        .eq('phone_hash', hash)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const cap = rowToCapsule(data as CapsuleRow);
        saveToDirectory(cap);
        return { hash, match: cap };
      }
    } catch {
      // Fallback to local directory below
    }
  }

  return lookupByPhone(rawPhone);
}
