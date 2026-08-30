import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PopClub Logistics',
    short_name: 'PopClub',
    description: 'Advanced delivery and logistics tracking for PopClub.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a0f1d',
    theme_color: '#9306CF',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
