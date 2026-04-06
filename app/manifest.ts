import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RKV Consulting',
    short_name: 'RKV Consulting',
    description: 'AI-Powered Land Infrastructure Intelligence',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#06080C',
    theme_color: '#00D4AA',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '64x64',
        type: 'image/x-icon',
      },
    ],
  };
}
