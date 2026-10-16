import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true,
    qualities: [75, 95],
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
