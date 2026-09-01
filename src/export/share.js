import { noteLayout } from './note.js';

export function shareBase(location) {
  return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`;
}

export function viewLink(base, packed) {
  return `${base}view.html#c=${packed}`;
}

export function editLink(location, packed) {
  return `${location.origin}${location.pathname}#c=${packed}`;
}

export function embedSnippet(base, packed, { width = 320, height = 360 } = {}) {
  return [
    `<iframe src="${base}embed.html#c=${packed}"`,
    `  width="${width}" height="${height}" loading="lazy" style="border:0"`,
    '  title="Scan this code"></iframe>',
  ].join('\n');
}

export function composeWithNote(sceneDataUrl, { note, position, background, font }) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const layout = noteLayout(note, { tile: image.width, position });
      if (!layout.lines.length) {
        resolve(sceneDataUrl);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = Math.round(image.height + layout.blockHeight);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, layout.above ? layout.blockHeight : 0);
      ctx.fillStyle = font.color;
      ctx.textAlign = 'center';
      ctx.font = `${layout.fontSize.toFixed(1)}px ${font.family}`;
      const first = layout.above ? layout.pad + layout.fontSize * 0.86
        : image.height + layout.pad + layout.fontSize * 0.86;
      layout.lines.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, first + index * layout.lineHeight);
      });
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('the scene image could not be read'));
    image.src = sceneDataUrl;
  });
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
