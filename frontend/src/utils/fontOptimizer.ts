// Utilitaire pour optimiser le chargement des polices sur des pages spécifiques
export function optimizeFontsForPage(pathname: string) {
  if (typeof window === 'undefined') return;

  // Sur la page profile, désactiver les préchargements inutiles
  if (pathname === '/profile') {
    // Supprimer les préchargements de polices non utilisées
    const preloadLinks = document.querySelectorAll('link[rel="preload"][as="font"]');
    preloadLinks.forEach((link) => {
      const href = link.getAttribute('href');
      // Si c'est une police Geist Mono non utilisée sur cette page
      if (href && href.includes('93f479601ee12b01') || href?.includes('569ce4b8f30dc480') || href?.includes('9b8c15de1de72117')) {
        link.remove();
      }
    });
    
    // Ajouter font-display: swap à toutes les polices pour améliorer les performances
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Geist';
        font-display: swap;
      }
      @font-face {
        font-family: 'Geist Mono';
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  }
}

export function removeFontPreloads() {
  if (typeof window === 'undefined') return;
  
  // Supprimer tous les préchargements de polices au chargement pour éviter les warnings
  setTimeout(() => {
    const unusedPreloads = document.querySelectorAll('link[rel="preload"][as="font"]:not([data-used])');
    unusedPreloads.forEach(link => {
      const href = link.getAttribute('href');
      // Vérifier si la police est réellement utilisée
      const isUsed = document.querySelector(`[style*="${href}"], [class*="font-"]`);
      if (!isUsed) {
        link.remove();
      }
    });
  }, 100);
}
