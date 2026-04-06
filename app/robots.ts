import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/about', '/contact', '/terms', '/privacy', '/security'],
        disallow: ['/api/', '/dashboard', '/map', '/agents', '/sites', '/pipeline', '/settings', '/market', '/data-sources', '/feasibility', '/api-keys'],
      },
    ],
    sitemap: 'https://rkvconsulting.com/sitemap.xml',
  };
}
