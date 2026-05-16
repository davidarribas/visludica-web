// Limpia el HTML crudo que viene de feeds RSS antes de renderizarlo.
export function sanitizeRssHtml(raw: string): string {
  if (!raw) return '';

  return raw
    // Elimina inline styles
    .replace(/ style="[^"]*"/gi, '')
    .replace(/ style='[^']*'/gi, '')
    // Tres o más <br> seguidos → salto de párrafo
    .replace(/(\s*<br\s*\/?>\s*){3,}/gi, '</p><p>')
    // Dos <br> seguidos → uno solo
    .replace(/(<br\s*\/?>\s*){2}/gi, '<br>')
    // Añade target="_blank" rel="noopener noreferrer" a enlaces externos
    // que no tengan ya atributo target
    .replace(/<a\b([^>]*?)>/gi, (match, attrs) => {
      const isExternal = /href=["']https?:\/\//i.test(attrs);
      const hasTarget  = /\btarget=/i.test(attrs);
      if (isExternal && !hasTarget) {
        return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
      }
      return match;
    })
    .trim();
}
