/**
 * Email tracking: open pixel + click redirect
 * The tracking endpoints are at:
 *   /api/outreach/track/open/[id]  — returns 1x1 transparent GIF
 *   /api/outreach/track/click/[id] — redirects to original URL
 */

export function injectTrackingPixel(html: string, sendId: string, baseUrl: string): string {
  const pixelUrl = `${baseUrl}/api/outreach/track/open/${sendId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0;" alt="" />`;

  // Insert before closing body tag, or append
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
}

export function rewriteLinks(html: string, sendId: string, baseUrl: string): string {
  // Replace all href links with click tracking redirect
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (match, url) => {
      // Don't rewrite unsubscribe links, mailto, or our own tracking URLs
      if (
        url.includes('/track/') ||
        url.includes('mailto:') ||
        url.includes('unsubscribe')
      ) {
        return match;
      }
      const trackUrl = `${baseUrl}/api/outreach/track/click/${sendId}?url=${encodeURIComponent(url)}`;
      return `href="${trackUrl}"`;
    }
  );
}
