import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/settings/', '/apply/'],
      },
    ],
    sitemap: 'https://rkv-consulting.vercel.app/sitemap.xml',
  };
}
