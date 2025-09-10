// src/lib_front/routeProtection.tsx
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import React from 'react';

/**
 * Hook pour protéger les routes qui nécessitent une authentification
 * Redirige vers la page de connexion si l'utilisateur n'est pas connecté
 */
export function useProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  return { isAuthenticated, isLoading: loading };
}

/**
 * Hook pour protéger les routes qui sont destinées aux utilisateurs non authentifiés
 * Redirige vers le profil si l'utilisateur est déjà connecté
 * (Ex: pages de login, register, etc.)
 */
export function usePublicRoute() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/profile');
    }
  }, [isAuthenticated, loading, router]);

  return { isAuthenticated, isLoading: loading };
}

/**
 * Hook pour protéger les routes qui nécessitent un rôle administrateur
 * Redirige vers le profil si l'utilisateur n'est pas admin
 */
export function useAdminRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user && !user.is_admin) {
        router.push('/profile');
      }
    }
  }, [isAuthenticated, loading, router, user]);

  return { isAuthenticated, isLoading: loading, isAdmin: user && 'is_admin' in user };
}

/**
 * Composant d'ordre supérieur pour protéger les routes qui nécessitent une authentification
 */
export function withProtectedRoute(Component: React.ComponentType) {
  return function ProtectedRoute(props: any) {
    const { isLoading } = useProtectedRoute();
    
    if (isLoading) {
      return <div>Chargement</div>;
    }
    
    return <Component {...props} />;
  };
}

/**
 * Composant d'ordre supérieur pour protéger les routes publiques (non-auth seulement)
 */
export function withPublicRoute(Component: React.ComponentType) {
  return function PublicRoute(props: any) {
    const { isLoading } = usePublicRoute();
    
    if (isLoading) {
      return <div>Chargement</div>;
    }
    
    return <Component {...props} />;
  };
}

/**
 * Composant d'ordre supérieur pour protéger les routes administrateur
 */
export function withAdminRoute(Component: React.ComponentType) {
  return function AdminRoute(props: any) {
    const { isLoading } = useAdminRoute();
    
    if (isLoading) {
      return <div>Chargement</div>;
    }
    
    return <Component {...props} />;
  };
}
