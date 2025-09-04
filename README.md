# 🏓 ft_transcendence - Plateforme de Jeu Pong Multijoueur

## 📋 Table des Matières

- [🏗️ Architecture](#architecture)
- [🎯 Modules Implémentés](#modules-implementes) 
- [🚀 Démarrage Rapide](#demarrage-rapide)
- [🔧 Configuration](#configuration)
- [📡 API Documentation](#api-documentation)
- [🔐 Authentification 2FA](./2FA.md)
- [🏆 Fonctionnalités](#fonctionnalites)
- [⚠️ Problèmes Connus](#problemes-connus)
- [🔐 Sécurité](#securite)
- [🧪 Tests](#tests)
- [📚 Ressources](#ressources)

## 🏗️ Architecture

### Stack Technologique

- **Backend**: Node.js + Fastify + SQLite
- **Frontend**: Next.js + TypeScript + Tailwind CSS + Babylon.js
- **Base de données**: SQLite (partagée via volume Docker)
- **Conteneurisation**: Docker + Docker Compose
- **Authentification**: JWT + 2FA + OAuth

### Structure des Services

```
ft_transcendence/
├── 🐳 docker-compose.yml          # Orchestration des services
├── 📁 backend/                     # API Fastify 
│   ├── 🐳 Dockerfile
│   ├── 📦 package.json
│   ├── ⚙️ .env.example
│   └── 📁 src/
│       ├── 🚀 server.js            # Point d'entrée Fastify
│       ├── 🗄️ db.js                # Configuration SQLite
│       ├── 📁 middleware/
│       │   └── 🔐 auth.js          # Middleware JWT
│       └── 📁 routes/
│           ├── 🔑 authRoutes.js    # Authentification
│           ├── 👤 userRoutes.js    # Gestion utilisateurs
│           ├── 🎮 gameRoutes.js    # Logique de jeu
│           └── 👑 adminRoutes.js   # Administration
├── 📁 frontend/                    # Interface Next.js
│   ├── 🐳 Dockerfile
│   ├── 📦 package.json
│   ├── ⚙️ next.config.js
│   ├── 🎨 tailwind.config.js
│   └── 📁 src/
│       ├── 📁 app/                 # Pages Next.js App Router
│       │   ├── 🏠 page.tsx         # Page d'accueil
│       │   ├── 🎨 globals.css      # Styles Tailwind
│       │   ├── 📁 (framed)/        # Pages avec cadre
│       │   │   ├── 🎮 play/        # Pages de jeu
│       │   │   ├── 👤 profile-menu/
│       │   │   ├── ⚙️ settings/
│       │   │   └── 💬 tchate/
│       │   ├── 📁 (plain)/         # Pages sans cadre
│       │   │   ├── 🎮 play/
│       │   │   └── 👤 profil/
│       │   └── 📁 components/
│       │       ├── 📁 forms/       # Formulaires
│       │       ├── 📁 pongs/       # Composants Pong
│       │       └── 📁 ui/          # Composants UI
│       ├── 📁 game/                # Logique de jeu
│       │   ├── 📁 components/      # Composants Vue.js
│       │   ├── 📁 factories/       # Factory patterns
│       │   ├── 📁 modes/          # Modes de jeu
│       │   ├── 📁 pong/           # Logique Pong
│       │   └── 📁 utils/          # Utilitaires jeu
```

## 🎯 Modules Implémentés

### 📊 Répartition des Modules (8 Majeurs + 5 Mineurs = 13 modules)

#### � **Florent - Backend & Architecture** (6 modules)
- ✅ **Backend Framework** (Majeur) - Fastify + Node.js
- ✅ **Database** (Mineur) - SQLite avec better-sqlite3
- ✅ **JWT Avancé** (Partie Majeure) - Access/Refresh tokens + Blacklist
- 🚧 **User Management** (Majeur) - Inscription, profils, amis, stats  
- 🚧 **Remote Authentication** (Majeur) - OAuth 2.0
- 🚧 **2FA + JWT** (Majeur) - Double authentification complète
- 🚧 **Microservices Architecture** (Majeur) - Backend modulaire
- ✅ **User Dashboard** (Mineur) - Statistiques utilisateur

#### 🟡 **Younes - Frontend & UX** (3 modules)
- ✅ **Frontend Framework** (Mineur) - Tailwind CSS + TypeScript
- 🚧 **Support All Devices** (Mineur) - Responsive design
- 🚧 **Multi Language** (Mineur) - i18n (FR/EN/ES)

#### 🟠 **Topaze - Gaming & 3D** (4 modules)  
- 🚧 **Multiplayer** (Majeur) - Plus de 2 joueurs simultanés
- 🚧 **AI Opponent** (Majeur) - Intelligence artificielle
- 🚧 **Advanced 3D** (Majeur) - Babylon.js pour rendu 3D

### 🎮 **Fonctionnalités par Module**

#### **Backend Framework (✅ Implémenté)**
```javascript
// Fastify + Node.js comme requis par le sujet
- API RESTful avec Fastify 4.24.3
- Architecture modulaire (routes séparées)
- Middleware d'authentification JWT avancé
- Validation des données avec Joi
- Logging structuré avec Pino
- Rate limiting et headers de sécurité
```

#### **JWT + Sécurité (✅ Implémenté)**
```javascript
// Système JWT avancé avec refresh tokens
- Access tokens courte durée (24h)
- Refresh tokens longue durée (7 jours)
- JWT ID unique (jti) pour tracking
- Système de blacklist pour révocation
- Validation stricte (issuer, audience, algorithms)
- Protection contre replay attacks
```

#### **Database (✅ Implémenté)**  
```sql
-- SQLite avec better-sqlite3 + Structure complète
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  
  -- OAuth fields
  oauth_provider TEXT,
  oauth_id TEXT,
  
  -- 2FA fields  
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  two_factor_temp_secret TEXT,        -- Secret temporaire durant setup
  two_factor_backup_codes TEXT,       -- JSON array codes hachés SHA-256
  
  -- Stats et timestamps
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  status TEXT DEFAULT 'offline',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tables additionnelles
CREATE TABLE friends (...);          -- Relations d'amitié
CREATE TABLE tournaments (...);      -- Système de tournois  
CREATE TABLE games (...);            -- Parties individuelles
CREATE TABLE match_history (...);    -- Historique détaillé
CREATE TABLE user_sessions (...);    -- Gestion des sessions
CREATE TABLE token_blacklist (...);  -- Révocation JWT
```

## 🚀 Démarrage Rapide

### Prérequis
```bash
- Docker & Docker Compose
- Git
- Ports 3000 (backend) et 8080 (frontend) disponibles
```

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd transcendance_2

# Lancer tous les services
docker-compose up --build

# Ou en mode détaché
docker-compose up --build -d
```

### Vérification
Une fois démarré, vérifiez :
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000  
- **Health Check**: http://localhost:3000/health
- **Base de données**: Volume `./database/database.sqlite`

## 🔧 Configuration

### Variables d'Environnement (.env)

**⚠️ CRITIQUE**: Créez un fichier `.env` dans `/backend/` :

```bash
# Sécurité (OBLIGATOIRE pour la production)
JWT_SECRET=your-super-secret-256-bit-key-change-in-production-now-please
NODE_ENV=production

# Base de données  
DATABASE_PATH=/app/data/database.sqlite

# Serveur
PORT=3000
HOST=0.0.0.0

# Authentification
BCRYPT_ROUNDS=12
JWT_EXPIRY=24h

# OAuth (à configurer)
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=https://yourdomain.com/auth/callback

# 2FA Configuration
TOTP_SERVICE_NAME=Transcendance
TOTP_WINDOW=2
BACKUP_CODES_COUNT=10
```

## 📡 API Documentation

### 🔐 Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
Créer un nouveau compte utilisateur.

```javascript
// Request
{
  "username": "player1",
  "email": "player1@example.com", 
  "password": "securePassword123"
}

// Response (201)
{
  "message": "Utilisateur créé avec succès",
  "user": {
    "id": 1,
    "username": "player1",
    "email": "player1@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/api/auth/login`
Connexion utilisateur.

```javascript
// Request
{
  "username": "player1",
  "password": "securePassword123" 
}

// Response (200)
{
  "message": "Connexion réussie",
  "user": {
    "id": 1,
    "username": "player1",
    "email": "player1@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/api/auth/logout` 🔒
Déconnexion (token requis).

```javascript
// Headers: Authorization: Bearer <token>
// Response (200)
{
  "message": "Déconnexion réussie"
}
```

#### POST `/api/auth/verify`
Vérifier la validité d'un token JWT.

```javascript
// Request
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

// Response (200)
{
  "message": "Token valide",
  "user": {
    "id": 1,
    "username": "player1",
    "email": "player1@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### � Two-Factor Authentication Routes (`/api/auth`) 🔒

#### POST `/api/auth/2fa/setup`
Génère un secret TOTP et QR code pour configuration.

```javascript
// Headers: Authorization: Bearer <token>
// Response (200)
{
  "success": true,
  "setup": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "manualEntryKey": "JBSWY3DPEHPK3PXP",
    "instructions": {
      "fr": "Scannez ce QR code avec Google Authenticator..."
    }
  }
}
```

#### POST `/api/auth/2fa/enable`
Active la 2FA après vérification du code TOTP.

```javascript
// Request
{
  "token": "123456"  // Code à 6 chiffres de l'app
}

// Response (200)  
{
  "success": true,
  "message": "Authentification à deux facteurs activée avec succès",
  "backupCodes": [
    "A1B2-C3D4", "E5F6-G7H8", "..." 
  ],
  "warning": "Sauvegardez ces codes de récupération dans un endroit sûr."
}
```

#### GET `/api/auth/2fa/status`
Statut 2FA de l'utilisateur connecté.

```javascript
// Response (200)
{
  "enabled": true,
  "setupInProgress": false,
  "remainingBackupCodes": 8,
  "recommendations": {
    "backupCodesLow": false,
    "noBackupCodes": false
  }
}
```

**📖 [Documentation 2FA complète →](./2FA.md)**

### �👤 User Routes (`/api/users`) 🔒

#### GET `/api/users/profile`
Récupérer le profil de l'utilisateur authentifié.

```javascript
// Headers: Authorization: Bearer <token>
// Response (200)
{
  "user": {
    "id": 1,
    "username": "player1", 
    "email": "player1@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 🎮 Game Routes (`/api/games`) 🔒

#### POST `/api/games/start`
Démarrer une nouvelle partie.

```javascript
// Headers: Authorization: Bearer <token>
// Request
{
  "opponentId": 2,
  "gameMode": "classic"
}

// Response (201)  
{
  "message": "Partie démarrée avec succès",
  "gameId": 123
}
```

### 👑 Admin Routes (`/api/admin`) 🔒

#### GET `/api/admin/list-users`
Lister tous les utilisateurs (admin uniquement).

```javascript
// Headers: Authorization: Bearer <admin-token>
// Response (200)
{
  "users": [
    {
      "id": 1,
      "username": "player1",
      "email": "player1@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### 📋 Status Codes
- `200` - Succès
- `201` - Créé
- `400` - Requête invalide  
- `401` - Non authentifié
- `403` - Accès refusé
- `404` - Non trouvé
- `409` - Conflit (utilisateur existe déjà)
- `500` - Erreur serveur

## 🏆 Fonctionnalités

### ✅ **Implémentées**

#### 🔐 **Système d'Authentification Avancé**
- Inscription/connexion sécurisée avec validation Joi
- Hachage bcrypt (12 rounds) 
- **JWT avec refresh tokens**
  - Access token courte durée (24h)
  - Refresh token longue durée (7 jours)
  - JWT ID unique (jti) pour tracking
  - Système de blacklist pour révocation
  - Validation stricte (issuer, audience, algorithms)
- Middleware de protection des routes avancé
- Gestion des statuts online/offline
- Codes d'erreur standardisés

#### 🗄️ **Base de Données Complète** 
- SQLite avec better-sqlite3
- **8 tables** : users, friends, tournaments, tournament_participants, games, match_history, user_sessions, token_blacklist
- Relations étrangères enforced
- Index optimisés pour performance
- Triggers automatiques pour stats
- Support OAuth et 2FA (structure prête)

#### 🚀 **API Fastify Robuste**
- Architecture RESTful complète
- Routes modulaires séparées (auth, users, games, admin)
- **Validation des données avec Joi**
- Logging structuré avec Pino
- CORS configuré
- **Rate limiting et headers de sécurité**
- Health check avancé avec test DB

#### 🐳 **Conteneurisation Production-Ready**
- Docker multi-stage optimisé
- Docker Compose orchestration
- **Variables d'environnement sécurisées** (.env)
- Volumes persistants pour la DB
- Network isolation
- Restart policies

### ✅ **Implémenté et Testé**

#### 🔑 **Authentification 2FA Complète** 
- ✅ **TOTP avec Google Authenticator** - Compatible RFC 6238
- ✅ **Codes de sauvegarde** - 10 codes uniques générés
- ✅ **QR Code automatique** - Configuration mobile instantanée
- ✅ **API REST complète** - Setup, activation, désactivation
- ✅ **Sécurité renforcée** - Hachage SHA-256, validation temporelle
- ✅ **Gestion d'erreur** - Messages explicites et logging
- 📖 **[Documentation complète 2FA →](./2FA.md)**

#### 🔐 **JWT Avancé Production**
- ✅ **Access/Refresh tokens** - Gestion sécurisée des sessions
- ✅ **Blacklist système** - Révocation immédiate possible
- ✅ **JWT ID tracking** - Suivi unique de chaque token
- ✅ **Validation stricte** - Issuer, audience, algorithme

### 🚧 **En Développement**

#### 🌐 **OAuth Integration**
- Google OAuth 2.0
- GitHub OAuth
- Automatic account linking
- Social login flow

#### 👥 **User Management Complet**
- Système d'amis
- Upload d'avatar
- Historique des matches  
- Statistiques détaillées
- Profils publics

#### 🎮 **Jeu Multijoueur**
- WebSocket temps réel
- Synchronisation des états
- Anti-cheat côté serveur
- Reconnexion automatique

#### 🤖 **Intelligence Artificielle**
- Différents niveaux de difficulté
- Machine learning adaptatif
- Prédiction de trajectoire
- Simulation keyboard input

#### 🎨 **Rendu 3D Avancé** 
- Babylon.js integration
- Shaders personnalisés
- Effets de particules
- Animations fluides

## ⚠️ Problèmes Connus

### 🔴 **Critiques (À Corriger Immédiatement)**

1. **JWT_SECRET hardcodé** 
   ```javascript
   // ❌ DANGER - Dans authRoutes.js ligne 6
   const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
   
   // ✅ SOLUTION - Créer .env et redémarrer
   JWT_SECRET=your-super-secure-256-bit-secret-key-here
   ```

2. **HTTPS manquant**
   ```bash
   # ❌ Le sujet exige HTTPS pour tout
   # ✅ TODO: Configurer TLS/SSL dans docker-compose.yml
   ```

3. **Schéma DB incomplet pour modules**
   ```sql
   -- ❌ Tables manquantes pour vos modules:
   -- friends, user_stats, tournaments, matches, oauth_accounts, user_sessions
   ```

### 🟡 **Moyens (À Planifier)**

4. **Architecture non-microservices**
   - Backend actuel monolithique  
   - Module "Microservices" requis
   - Besoin de séparer auth/user/game services

5. **Validation insuffisante**
   ```javascript
   // ❌ Validation basique
   if (!username || !password) return error;
   
   // ✅ TODO: Schema validation avec Joi/Zod
   ```

6. **Error Handling basique**
   - Pas de codes d'erreur standardisés
   - Logs non structurés  
   - Pas de monitoring

### 🟢 **Mineurs (Nice-to-have)**

7. **Tests manquants**
8. **Documentation API automatisée** 
9. **Monitoring/observabilité**
10. **CI/CD pipeline**

## 🔐 Sécurité

### ✅ **Implémenté**
- ✅ Hachage bcrypt des mots de passe (12 rounds)
- ✅ **JWT avec système avancé**
  - Access + Refresh tokens
  - JWT ID unique pour tracking  
  - Système de blacklist/révocation
  - Validation stricte (iss, aud, alg)
- ✅ CORS configuré
- ✅ **Validation complète des entrées** (Joi)
- ✅ Protection contre l'injection SQL (prepared statements)
- ✅ **Rate limiting et headers de sécurité** (Helmet)
- ✅ **Variables d'environnement** sécurisées (.env)
- ✅ **Logging structuré** avec codes d'erreur

### 🚧 **À Implémenter** 
- 🚧 **HTTPS obligatoire** (requis par le sujet)
- 🚧 **2FA avec TOTP** (Google Authenticator)
- 🚧 **OAuth Google/GitHub** (Remote Authentication)
- 🚧 **Protection CSRF** 
- 🚧 **Sanitization XSS**
- 🚧 **Audit de sécurité** automatisé

### 🔒 **Bonnes Pratiques**
```javascript
// Exemple de sécurisation des routes
fastify.register(helmet); // Headers sécurisés
fastify.register(rateLimit, { max: 100 }); // Rate limiting  
fastify.addHook('preHandler', validateInput); // Validation
```

### 🧪 **Tests JWT Avancés**

#### Test d'inscription avec tokens
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "Test123!@#"
  }'

# Réponse:
{
  "message": "Utilisateur créé avec succès",
  "user": {"id": 1, "username": "testuser", "email": "test@example.com"},
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h",
  "tokenType": "Bearer"
}
```

#### Test d'accès route protégée
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <access_token>"

# Réponse:
{
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "created_at": "2025-09-04 14:06:20"
  }
}
```

#### Test complet 2FA avec curl

```bash
# 1. Créer un utilisateur
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2fa","email":"test2fa@example.com","password":"Test123!"}'

# 2. Setup 2FA (génère QR code)
curl -X POST http://localhost:3000/api/auth/2fa/setup \
  -H "Authorization: Bearer <access_token>"

# 3. Scanner le QR code avec Google Authenticator et activer
curl -X POST http://localhost:3000/api/auth/2fa/enable \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"token":"123456"}'  # Code depuis l'app

# 4. Vérifier le statut 2FA
curl -X GET http://localhost:3000/api/auth/2fa/status \
  -H "Authorization: Bearer <access_token>"

# Réponse:
{
  "enabled": true,
  "setupInProgress": false,
  "remainingBackupCodes": 10,
  "recommendations": {"backupCodesLow": false, "noBackupCodes": false}
}
```

#### Test de vérification de token
```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "<access_token>"}'

# Réponse:
{
  "message": "Token valide",
  "user": {...},
  "tokenInfo": {
    "tokenId": "3dbc7c63-de9c-452d-863b-1941affa1d9b",
    "issuedAt": "2025-09-04T14:06:41.000Z",
    "expiresAt": "2025-09-05T14:06:41.000Z",
    "type": "access"
  },
  "code": "TOKEN_VALID"
}
```

## 🧪 Tests

### Configuration
```bash
# Backend tests
cd backend
npm run test

# Frontend tests  
cd frontend
npm run test

# Tests d'intégration
docker-compose -f docker-compose.test.yml up
```

### Types de Tests
- **Unit Tests**: Logique métier isolée
- **Integration Tests**: API endpoints
- **E2E Tests**: Parcours utilisateur complets
- **Security Tests**: Audit automatisé

## 📚 Ressources

### 📖 Documentation Officielle
- [🔐 JWT.md](./JWT.md) - **Documentation complète du système JWT**
- [Fastify Documentation](https://www.fastify.io/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Babylon.js](https://doc.babylonjs.com/)
- [SQLite](https://sqlite.org/docs.html)

### 🛡️ Sécurité & Standards
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

### 🏗️ Architecture
- [12-Factor App](https://12factor.net/)
- [Microservices Patterns](https://microservices.io/)
- [API Design Guide](https://github.com/microsoft/api-guidelines)

---

## 👥 Équipe

- **Florent** 🔧 - Backend Architecture, Sécurité, Microservices
- **Younes** 🎨 - Frontend, UX/UI, Responsive Design  
- **Topaze** 🎮 - Game Logic, IA, Rendu 3D

---

## 📝 License

Ce projet est développé dans le cadre du cursus 42. Tous droits réservés.

---

*⚡ Dernière mise à jour: Septembre 2025*

## Prochaines étapes

1. Implémenter l'authentification utilisateur
2. Créer les modèles de données SQLite
3. Développer l'interface utilisateur du jeu
4. Ajouter les fonctionnalités de jeu en temps réel
5. Implémenter les tests automatisés

## Commandes utiles

```bash
# Reconstruire les images
docker-compose build

# Lancer en mode détaché
docker-compose up -d

# Voir l'état des conteneurs
docker-compose ps

# Exécuter une commande dans un conteneur
docker-compose exec backend sh
docker-compose exec frontend sh
```
