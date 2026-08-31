export function shareBase(location) {
  return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`;
}

export function shareLink(location, packed) {
  return `${location.origin}${location.pathname}#c=${packed}`;
}

export function embedSnippet(base, packed, { width = 320, height = 360 } = {}) {
  return [
    `<iframe src="${base}embed.html#c=${packed}"`,
    `  width="${width}" height="${height}" loading="lazy" style="border:0"`,
    '  title="Scan this code"></iframe>',
  ].join('\n');
}

export async function writeClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the selection fallback
    }
  }

  const holder = document.createElement('textarea');
  holder.value = text;
  holder.setAttribute('readonly', '');
  holder.style.position = 'fixed';
  holder.style.top = '0';
  holder.style.left = '0';
  holder.style.opacity = '0';
  document.body.appendChild(holder);
  holder.select();
  holder.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  holder.remove();
  return copied;
}
