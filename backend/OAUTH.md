# Module Remote Authentication OAuth 2.0

## 🎯 Objectif

Module complet d'authentification OAuth 2.0 pour le projet Transcendance 42, permettant l'authentification via Google et GitHub avec liaison de comptes.

## 🚀 Fonctionnalités

### ✅ Providers OAuth Supportés
- **Google OAuth 2.0** - Authentification via compte Google
- **GitHub OAuth 2.0** - Authentification via compte GitHub

### ✅ Fonctionnalités Avancées
- **Liaison de comptes** - Associer plusieurs providers OAuth à un seul compte utilisateur
- **Déliaison de comptes** - Supprimer l'association avec un provider OAuth
- **Sécurité CSRF** - Protection contre les attaques Cross-Site Request Forgery
- **Gestion des sessions** - Sessions sécurisées pour les flows OAuth
- **Validation complète** - Validation des données OAuth et des tokens

## 🗄️ Base de Données

### Table `oauth_providers`
```sql
CREATE TABLE IF NOT EXISTS oauth_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  email TEXT,
  linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(provider, provider_id),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user_provider ON oauth_providers(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_oauth_provider_id ON oauth_providers(provider, provider_id);
```

## 🔧 Configuration

### Variables d'environnement requises

```env
# OAuth Configuration (Google)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# OAuth Configuration (GitHub)  
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# URLs de base
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:3000

# Sécurité des sessions
SESSION_SECRET=your_super_secret_session_key_here
```

## 📡 API Endpoints

### 1. Authentification Google
```bash
# Initier l'authentification Google
GET /api/oauth/google
# Redirige vers Google OAuth

# Callback Google (automatique)
GET /api/oauth/google/callback?code=xxx&state=xxx
# Traite le retour de Google
```

### 2. Authentification GitHub
```bash
# Initier l'authentification GitHub
GET /api/oauth/github
# Redirige vers GitHub OAuth

# Callback GitHub (automatique)
GET /api/oauth/github/callback?code=xxx&state=xxx
# Traite le retour de GitHub
```

### 3. Liaison de comptes (utilisateur connecté)
```bash
# Lier un compte OAuth à l'utilisateur connecté
POST /api/oauth/link
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "provider": "google|github",
  "authCode": "authorization_code"
}

# Réponse
{
  "success": true,
  "message": "Compte Google lié avec succès",
  "provider": "google",
  "email": "user@gmail.com"
}
```

### 4. Gestion des comptes liés
```bash
# Lister les comptes OAuth liés
GET /api/oauth/accounts
Authorization: Bearer <jwt_token>

# Réponse
{
  "accounts": [
    {
      "provider": "google",
      "email": "user@gmail.com",
      "linked_at": "2025-09-06T09:00:00.000Z"
    }
  ]
}

# Délier un compte OAuth
DELETE /api/oauth/unlink/google
Authorization: Bearer <jwt_token>

# Réponse
{
  "success": true,
  "message": "Compte Google délié avec succès"
}
```

## 🛡️ Sécurité

### Protection CSRF
- Génération d'un état (state) aléatoire cryptographiquement sûr
- Vérification de l'état lors du callback
- Stockage sécurisé dans les sessions

### Validation des données
- Validation des tokens OAuth avec les APIs des providers
- Vérification des scopes et permissions
- Sanitisation des données utilisateur

### Gestion des erreurs
- Redirection sécurisée vers le frontend avec messages d'erreur
- Logs détaillés des erreurs OAuth
- Pas d'exposition de secrets dans les logs

## 🧪 Tests

### Tests manuels disponibles

```bash
# 1. Test de santé du serveur
curl http://localhost:3000/health

# 2. Test des redirections OAuth (doivent rediriger)
curl -I http://localhost:3000/api/oauth/google
curl -I http://localhost:3000/api/oauth/github

# 3. Test avec un token utilisateur (nécessite un JWT valide)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/oauth/accounts
```

## 📝 Utilisation Frontend

### 1. Boutons d'authentification
```javascript
// Redirection vers OAuth Google
window.location.href = '/api/oauth/google';

// Redirection vers OAuth GitHub  
window.location.href = '/api/oauth/github';
```

### 2. Liaison de comptes (utilisateur connecté)
```javascript
const linkAccount = async (provider, authCode) => {
  const response = await fetch('/api/oauth/link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ provider, authCode })
  });
  
  return await response.json();
};
```

## 🔍 Dépannage

### Erreurs communes

1. **"OAuth credentials not configured"**
   - Vérifier les variables GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.

2. **"Invalid state parameter"**
   - Problème de session - vérifier SESSION_SECRET
   - S'assurer que les cookies sont activés

3. **"Failed to fetch user data"**
   - Problème réseau ou credentials invalides
   - Vérifier les scopes OAuth configurés

### Logs utiles
```bash
# Voir les logs du backend en temps réel
docker-compose logs -f backend

# Voir les logs OAuth spécifiquement
docker-compose logs backend | grep OAuth
```

## 📊 Statut du Module

✅ **COMPLET ET FONCTIONNEL**

- [x] Configuration Google OAuth 2.0
- [x] Configuration GitHub OAuth 2.0  
- [x] Base de données oauth_providers
- [x] Routes d'authentification
- [x] Routes de liaison de comptes
- [x] Sécurité CSRF et sessions
- [x] Gestion des erreurs
- [x] Validation des données
- [x] Documentation complète
- [x] Tests de déploiement

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │  OAuth Provider │
│   (Next.js)     │    │   (Fastify)      │    │ (Google/GitHub) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                        │
         │ 1. GET /oauth/google  │                        │
         ├──────────────────────▶│                        │
         │                       │ 2. Redirect with state │
         │                       ├───────────────────────▶│
         │ 3. User authorization │                        │
         │◀──────────────────────┼────────────────────────┤
         │                       │ 4. Callback with code │
         │                       │◀───────────────────────┤
         │ 5. JWT token + redirect│                       │
         │◀──────────────────────┤                        │
         │                       │                        │
```

## 🎉 Conclusion

Le module Remote Authentication OAuth 2.0 est **entièrement implémenté et fonctionnel**. Il offre une solution complète et sécurisée pour l'authentification via Google et GitHub, avec toutes les fonctionnalités avancées requises pour le projet Transcendance 42.

**Auteurs:** Équipe Transcendance (Florent, Younes, Topaze)  
**Date:** 6 septembre 2025  
**Version:** 1.0.0
