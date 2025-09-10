import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { optimizeFontsForPage, removeFontPreloads } from '../utils/fontOptimizer';

export function useFontOptimization() {
  const pathname = usePathname();

  useEffect(() => {
    // Optimiser le chargement des polices selon la page
    optimizeFontsForPage(pathname);
    
    // Supprimer les préchargements inutiles
    removeFontPreloads();
  }, [pathname]);
}
