/** Escape text for an HTML string (document.write / innerHTML). Anything the
 *  shop typed — store, product, customer or category names — must go through
 *  this, or a name like `<img src=x onerror=…>` runs as code. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
