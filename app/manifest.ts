import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Amirhub',
    short_name: 'Amirhub',
    description: 'Professional utility suite for microstock contributors.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: 'https://i.postimg.cc/t4J9QKb2/20260501-182631-8-4-300-2.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: 'https://i.postimg.cc/t4J9QKb2/20260501-182631-8-4-300-2.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  }
}
