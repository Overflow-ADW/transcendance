/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pour Option 1 (Static) : garder 'export' - MANDATORY pour SPA
  output: 'export',
  
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // Optimisation des performances
  poweredByHeader: false,
  
  images: {
    unoptimized: true,
    domains: ['localhost']
  },
  
  // Configuration pour optimiser les polices et éviter les préchargements inutiles
  experimental: {
    optimizePackageImports: ['@heroicons/react']
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
  }
};

module.exports = nextConfig;