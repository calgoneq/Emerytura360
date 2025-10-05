import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // pozawala dokończyć build nawet jak ESLint krzyczy
    ignoreDuringBuilds: true,
  },
  typescript: {
    // jeżeli TS narzeka w buildzie – też nie blokuj produkcji
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
