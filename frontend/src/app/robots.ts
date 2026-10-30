import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://sem.niranjansah87.com.np'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/docs', '/login', '/_next/static/', '/icon.svg', '/logo.png', '/favicon.ico', '/llms.txt', '/llms-full.txt'],
        disallow: [
          '/dashboard',
          '/projects',
          '/apikeys',
          '/analytics',
          '/admin',
          '/admin/',
          '/api',
          '/api/',
        ],
      },
      {
        // Explicitly welcome search & AI retrieval crawlers to public resources
        userAgent: ['Googlebot', 'bingbot', 'GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Applebot'],
        allow: ['/', '/docs', '/llms.txt', '/llms-full.txt'],
        disallow: [
          '/dashboard',
          '/projects',
          '/apikeys',
          '/analytics',
          '/admin',
          '/admin/',
          '/api',
          '/api/',
        ],
      },
      {
        // Restrict aggressive non-search training scrapers from consuming origin bandwidth
        userAgent: ['Bytespider', 'CCBot'],
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
