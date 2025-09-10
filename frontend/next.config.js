/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pour Option 1 (Static) : garder 'export' - MANDATORY pour SPA
  output: 'export',
  
  // Pour Option 2 (Standalone) : utiliser 'standalone' (seulement si module SSR choisi)
  // output: 'standalone',
  
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true
  },
  
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src/')
    };
    
    config.module.rules.push({
      test: /\.(glb|gltf|babylon)$/,
      use: 'file-loader'
    });
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
  experimental: {
    esmExternals: false
  }
};

module.exports = nextConfig;