function escapeVcard(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function escapeWifi(value) {
  return String(value).replace(/([\\;,":])/g, '\\$1');
}

function trimmed(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) {
    const text = value == null ? '' : String(value).trim();
    if (text) out[key] = text;
  }
  return out;
}

const SOCIALS = {
  linkedin: { label: 'LinkedIn', base: 'https://www.linkedin.com/in/' },
  instagram: { label: 'Instagram', base: 'https://instagram.com/' },
  github: { label: 'GitHub', base: 'https://github.com/' },
  x: { label: 'X', base: 'https://x.com/' },
};

export const SOCIAL_SERVICES = Object.entries(SOCIALS).map(([id, meta]) => ({ id, ...meta }));

export function socialUrl(service, value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  const meta = SOCIALS[service];
  if (!meta) return normalizeUrl(text);
  return meta.base + text.replace(/^@/, '');
}

export function normalizeUrl(input) {
  const text = String(input || '').trim();
  if (!text) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return text;
  return `https://${text}`;
}

const BUILDERS = {
  url: (f) => normalizeUrl(f.url),

  text: (f) => String(f.text || ''),

  wifi: (f) => {
    const fields = trimmed(f);
    if (!fields.ssid) return '';
    const security = fields.security || 'WPA';
    const parts = [`T:${security}`, `S:${escapeWifi(fields.ssid)}`];
    if (security !== 'nopass' && fields.password) parts.push(`P:${escapeWifi(fields.password)}`);
    if (fields.hidden === 'true' || fields.hidden === true) parts.push('H:true');
    return `WIFI:${parts.join(';')};;`;
  },

  vcard: (f) => {
    const fields = trimmed(f);
    const first = fields.first || '';
    const last = fields.last || '';
    const full = [first, last].filter(Boolean).join(' ');
    if (!full && !fields.email && !fields.phone) return '';
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    lines.push(`N:${escapeVcard(last)};${escapeVcard(first)};;;`);
    lines.push(`FN:${escapeVcard(full)}`);
    if (fields.org) lines.push(`ORG:${escapeVcard(fields.org)}`);
    if (fields.title) lines.push(`TITLE:${escapeVcard(fields.title)}`);
    if (fields.phone) lines.push(`TEL;TYPE=CELL:${escapeVcard(fields.phone)}`);
    if (fields.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVcard(fields.email)}`);
    if (fields.url) lines.push(`URL:${escapeVcard(normalizeUrl(fields.url))}`);
    const adr = [fields.street, fields.city, fields.region, fields.postal, fields.country];
    if (adr.some(Boolean)) {
      lines.push(`ADR;TYPE=WORK:;;${adr.map((v) => escapeVcard(v || '')).join(';')}`);
    }
    for (const service of Object.keys(SOCIALS)) {
      const url = socialUrl(service, fields[service]);
      if (url) lines.push(`X-SOCIALPROFILE;TYPE=${service}:${escapeVcard(url)}`);
    }
    if (fields.note) lines.push(`NOTE:${escapeVcard(fields.note)}`);
    lines.push('END:VCARD');
    return lines.join('\r\n');
  },

  mecard: (f) => {
    const fields = trimmed(f);
    const name = [fields.last, fields.first].filter(Boolean).join(',');
    if (!name && !fields.email && !fields.phone) return '';
    const parts = [];
    if (name) parts.push(`N:${escapeWifi(name)}`);
    if (fields.phone) parts.push(`TEL:${escapeWifi(fields.phone)}`);
    if (fields.email) parts.push(`EMAIL:${escapeWifi(fields.email)}`);
    if (fields.org) parts.push(`ORG:${escapeWifi(fields.org)}`);
    if (fields.url) parts.push(`URL:${escapeWifi(normalizeUrl(fields.url))}`);
    if (fields.note) parts.push(`NOTE:${escapeWifi(fields.note)}`);
    return `MECARD:${parts.join(';')};;`;
  },

  email: (f) => {
    const fields = trimmed(f);
    if (!fields.to) return '';
    const query = [];
    if (fields.subject) query.push(`subject=${encodeURIComponent(fields.subject)}`);
    if (fields.body) query.push(`body=${encodeURIComponent(fields.body)}`);
    return `mailto:${fields.to}${query.length ? `?${query.join('&')}` : ''}`;
  },

  phone: (f) => {
    const fields = trimmed(f);
    if (!fields.number) return '';
    const number = fields.number.replace(/[^\d+*#]/g, '');
    if (fields.mode !== 'text') return `tel:${number}`;
    return fields.message ? `sms:${number}?body=${encodeURIComponent(fields.message)}` : `sms:${number}`;
  },

  sms: (f) => {
    const fields = trimmed(f);
    if (!fields.number) return '';
    const number = fields.number.replace(/[^\d+*#]/g, '');
    return fields.message ? `sms:${number}?body=${encodeURIComponent(fields.message)}` : `sms:${number}`;
  },

  geo: (f) => {
    const fields = trimmed(f);
    if (!fields.lat || !fields.lon) return '';
    return `geo:${Number(fields.lat)},${Number(fields.lon)}`;
  },
};

export const PAYLOAD_TYPES = Object.keys(BUILDERS);

export function buildPayload(type, fields) {
  const builder = BUILDERS[type];
  if (!builder) throw new Error(`unknown payload type: ${type}`);
  return builder(fields || {});
}
