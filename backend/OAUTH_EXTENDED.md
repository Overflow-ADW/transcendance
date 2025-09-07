# Module OAuth 2.0 Étendu - Transcendance

## 🎯 Vue d'Ensemble

Le système OAuth 2.0 étendu de Transcendance offre une authentification complète et sécurisée avec plusieurs providers, des fonctionnalités avancées de gestion des comptes, et un système d'audit complet.

## 🔐 Providers Supportés

### ✅ **Providers Principaux**
- **Google OAuth 2.0** - Authentification Google avec profil complet
- **GitHub OAuth 2.0** - Authentification GitHub avec informations de développeur
- **Microsoft OAuth 2.0** - Authentification Microsoft/Azure AD avec profil professionnel
- **Discord OAuth 2.0** - Authentification Discord avec profil gaming

### 🔧 **Configuration par Provider**

#### Google OAuth
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```
**Scopes:** `profile`, `email`, `openid`
**Données récupérées:** Email, nom, avatar, langue, statut de vérification

#### GitHub OAuth
```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```
**Scopes:** `user:email`, `read:user`
**Données récupérées:** Username, email, bio, localisation, repos publics

#### Microsoft OAuth
```env
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
```
**Scopes:** `openid`, `profile`, `email`, `User.Read`
**Données récupérées:** DisplayName, job title, office location, UPN

#### Discord OAuth
```env
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```
**Scopes:** `identify`, `email`
**Données récupérées:** Username, discriminator, avatar, flags

## 🗄️ Base de Données Étendue

### Table `oauth_providers` (existante)
```sql
CREATE TABLE IF NOT EXISTS oauth_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  email TEXT,
  linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  additional_data TEXT, -- JSON pour données spécifiques
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(provider, provider_id),
  UNIQUE(user_id, provider)
);
```

### Table `oauth_logs` (nouvelle)
```sql
CREATE TABLE IF NOT EXISTS oauth_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  provider TEXT NOT NULL,
  details TEXT, -- JSON
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oauth_logs_user ON oauth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_logs_timestamp ON oauth_logs(timestamp);
```

## 📡 API Endpoints Étendus

### 🔍 **Gestion des Providers**

#### Lister les providers disponibles (étendu)
```http
GET /api/oauth/providers/extended
```

**Réponse:**
```json
{
  "providers": [
    {
      "name": "google",
      "displayName": "Google",
      "color": "#4285F4",
      "icon": "fab fa-google",
      "available": true,
      "configStatus": {
        "clientId": true,
        "clientSecret": true
      },
      "scopes": ["profile", "email", "openid"]
    }
  ],
  "totalAvailable": 4
}
```

#### Validation de configuration (admin)
```http
POST /api/oauth/validate-config
Authorization: Bearer <admin_token>
```

### 👤 **Gestion des Connexions Utilisateur**

#### Récupérer les connexions OAuth détaillées
```http
GET /api/oauth/user/connections
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "userId": 123,
  "connections": [
    {
      "provider": "google",
      "email": "user@gmail.com",
      "linkedAt": "2024-01-15T10:30:00Z",
      "providerConfig": {
        "displayName": "Google",
        "color": "#4285F4"
      },
      "canUnlink": true
    }
  ],
  "availableProviders": [
    {
      "name": "github",
      "displayName": "GitHub"
    }
  ],
  "canUnlink": {
    "google": true,
    "github": false
  }
}
```

#### Actualiser une connexion OAuth
```http
POST /api/oauth/refresh-connection/{provider}
Authorization: Bearer <token>
```

#### Déliaison en masse
```http
POST /api/oauth/bulk-unlink
Authorization: Bearer <token>
Content-Type: application/json

{
  "providers": ["google", "github"],
  "confirmPassword": "optional_password"
}
```

**Réponse:**
```json
{
  "success": true,
  "results": [
    {
      "provider": "google",
      "success": true,
      "error": null
    },
    {
      "provider": "github", 
      "success": false,
      "error": "Cannot unlink last authentication method"
    }
  ],
  "summary": {
    "requested": 2,
    "successful": 1,
    "failed": 1
  }
}
```

### 📊 **Audit et Historique**

#### Historique des activités OAuth
```http
GET /api/oauth/user/activity?limit=20&provider=google
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "userId": 123,
  "activity": [
    {
      "action": "login",
      "provider": "google",
      "timestamp": "2024-01-15T14:30:00Z",
      "details": {
        "ip": "192.168.1.1",
        "userAgent": "Chrome/120.0"
      }
    }
  ],
  "total": 15,
  "filtered": true
}
```

#### Statistiques OAuth (admin)
```http
GET /api/oauth/stats
Authorization: Bearer <admin_token>
```

## 🚀 Fonctionnalités Avancées

### 🔄 **Cache et Performances**
- **Cache des profils utilisateur** (5 minutes)
- **Rate limiting** par provider (10 req/min)
- **Nettoyage automatique du cache**

### 🛡️ **Sécurité Renforcée**
- **Protection CSRF** avec state tokens
- **Validation email RFC 5322**
- **Nettoyage des données** utilisateur
- **Audit trail complet**

### 🔧 **Gestion des Erreurs**
- **Gestion gracieuse** des erreurs provider
- **Fallbacks** pour données manquantes
- **Logs détaillés** pour debugging

### 📱 **Support Multi-Provider**
- **Liaison de comptes** multiples
- **Vérification des dépendances** avant déliaison
- **Synchronisation** des profils

## 🎮 Intégration avec Transcendance

### 🏆 **Fonctionnalités Gaming**
- **Profils unifiés** avec stats de jeu
- **Avatar synchronisé** depuis les providers
- **Historique des parties** lié aux comptes OAuth

### 👥 **Social Features**
- **Import des amis** depuis les providers (si disponible)
- **Partage des scores** sur les plateformes sociales
- **Notifications** cross-platform

## 🔧 Installation et Configuration

### 1. Configuration des Providers

1. **Google Cloud Console**
   - Créer un projet OAuth
   - Configurer les redirections: `${BACKEND_URL}/api/oauth/google/callback`

2. **GitHub Settings**
   - Créer une OAuth App
   - Callback URL: `${BACKEND_URL}/api/oauth/github/callback`

3. **Microsoft Azure AD**
   - Enregistrer une application
   - Permissions: `User.Read`, `profile`, `email`

4. **Discord Developer Portal**
   - Créer une application OAuth2
   - Redirect URI: `${BACKEND_URL}/api/oauth/discord/callback`

### 2. Variables d'Environnement Complètes

```env
# URLs de base
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:3000

# Session security
SESSION_SECRET=your_super_secret_session_key_minimum_32_chars

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Cache settings
OAUTH_CACHE_TTL=300 # 5 minutes
OAUTH_RATE_LIMIT=10 # requests per minute
```

### 3. Intégration Backend

```javascript
// Dans server.js
const { registerAdditionalOAuthProviders } = require('./routes/oauthProvidersExtended');

// Enregistrer les providers étendus
await registerAdditionalOAuthProviders(fastify);

// Enregistrer les routes OAuth avancées
await fastify.register(require('./routes/oauthRoutesAdvanced'), { prefix: '/api/oauth' });
```

## 🧪 Tests et Validation

### Tests de Sécurité
- Vérification des tokens CSRF
- Validation des redirections
- Test des rate limits

### Tests d'Intégration
- Flow complet OAuth pour chaque provider
- Liaison/déliaison de comptes
- Gestion des erreurs

## 📚 Justification par Rapport aux Contraintes du Projet

### ✅ **Conformité avec les Règles**

Le système OAuth utilise uniquement des **bibliothèques spécialisées** :

- `@fastify/oauth2` : Uniquement pour la gestion des flux OAuth (pas une solution complète d'auth)
- `axios` : Client HTTP simple pour les appels API
- `crypto` : Module Node.js natif pour la génération sécurisée
- `bcrypt` : Hashage sécurisé (déjà justifié)

### 🛠️ **Développement Personnalisé**

- **Logique métier personnalisée** : Gestion des utilisateurs, liaison des comptes
- **Validation personnalisée** : Nettoyage et validation des données OAuth
- **Système d'audit complet** : Développé entièrement sur mesure
- **Gestion des sessions** : Implémentation personnalisée avec sécurité CSRF

Le système OAuth **étend et améliore** les capacités de base sans remplacer le développement personnalisé.

## 🎯 Prochaines Étapes

1. **Interface utilisateur** pour la gestion des connexions OAuth
2. **Synchronisation automatique** des avatars
3. **Import des listes d'amis** depuis les providers
4. **Notifications push** via les plateformes connectées
5. **Single Sign-On (SSO)** pour les services internes
