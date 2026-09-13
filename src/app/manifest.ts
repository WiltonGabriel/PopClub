import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pop Shake Sorveteria - Açaí & Sorvetes',
    short_name: 'Pop Shake',
    description: 'Peça seu açaí, sorvetes artesanais e marmitas com entrega rápida na Pop Shake Sorveteria.',
    start_url: '/',
    display: 'standalone',
    background_color: '#401E3F',
    theme_color: '#9306CF',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

