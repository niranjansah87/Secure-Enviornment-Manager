import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login'],
      disallow: [
        '/dashboard',
        '/projects',
        '/apikeys',
        '/analytics',
        '/admin/',
        // All namespace/environment routes are private
        '/*/',
        '/api/',
      ],
    },
    sitemap: 'https://sem.niranjansah87.com.np/sitemap.xml',
  }
}
