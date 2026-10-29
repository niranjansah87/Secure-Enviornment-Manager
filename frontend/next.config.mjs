import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').origin;
const websocketOrigin = apiOrigin.replace(/^http/, 'ws');

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} ${websocketOrigin}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'three/addons': path.resolve(__dirname, 'node_modules/three/examples/jsm'),
      'three/examples/jsm': path.resolve(__dirname, 'node_modules/three/examples/jsm'),
      'three$': path.resolve(__dirname, 'node_modules/three/src/Three.js'),
      three: path.resolve(__dirname, 'node_modules/three/src/Three.js'),
    };
    return config;
  },
  images: {
    unoptimized: true,
    qualities: [75, 95],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: '/:namespace/:environment/keys',
        destination: '/apikeys',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
