// Sanitización y formato del HTML que Captivate sirve en el RSS.
//
// `sanitizeRssHtml` es una sanitización real por allowlist (sanitize-html):
// solo sobrevive el subconjunto de HTML con valor editorial en las shownotes.
// `formatEpisodeHtml` es presentación pura y opera SIEMPRE sobre HTML ya
// sanitizado; el orden del pipeline es sanitize → format.

import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'br', 'a',
    'ul', 'ol', 'li',
    'strong', 'b', 'em', 'i',
    'blockquote',
    'h2', 'h3', 'h4',
    'img',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
  },
  allowedSchemes: ['http', 'https'],
  allowProtocolRelative: false,
  transformTags: {
    // Conserva el comportamiento de presentación previo: los enlaces externos
    // se abren en pestaña nueva sin darles acceso a window.opener. Los
    // target/rel que traiga la entrada se descartan: solo existen los
    // valores canónicos que fija este transform.
    a: (tagName, attribs) => {
      const { target, rel, ...rest } = attribs;
      if (/^https?:\/\//i.test(rest.href ?? '')) {
        return {
          tagName: 'a',
          attribs: { ...rest, target: '_blank', rel: 'noopener noreferrer' },
        };
      }
      return { tagName: 'a', attribs: rest };
    },
  },
};

export function sanitizeRssHtml(raw) {
  if (!raw) return '';
  return sanitizeHtml(raw, SANITIZE_OPTIONS);
}

export function formatEpisodeHtml(sanitized) {
  if (!sanitized) return '';
  return sanitized
    // Tres o más <br> seguidos → salto de párrafo
    .replace(/(\s*<br\s*\/?>\s*){3,}/gi, '</p><p>')
    // Dos <br> seguidos → uno solo
    .replace(/(<br\s*\/?>\s*){2}/gi, '<br>')
    .trim();
}
