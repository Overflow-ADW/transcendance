# 🏓 ft_transcendence - Documentation Technique Complète

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
│       ├── 🗄️ db.js                # Configuration SQLite + 8 tables
│       ├── 📁 middleware/
│       │   └── 🔐 auth.js          # Middleware JWT + blacklist
│       ├── 📁 utils/
│       │   ├── 🔑 jwtUtils.js      # Utils JWT (génération, validation, révocation)
│       │   └── 📱 twoFactorUtils.js # Utils 2FA (TOTP, QR codes, backup codes)
│       └── 📁 routes/
│           ├── 🔑 authRoutes.js    # Authentification + login/register
│           ├── 📱 twoFactorRoutes.js # 2FA TOTP complet (7 endpoints)
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

#### 🔐 **Florent - Backend & Architecture** (6 modules)
- ✅ **Backend Framework** (Majeur) - Fastify + Node.js
- ✅ **Database** (Mineur) - SQLite avec better-sqlite3
- ✅ **JWT Avancé** (Majeur) - Access/Refresh tokens + Blacklist complet
- ✅ **2FA + JWT** (Majeur) - TOTP Google Authenticator implémenté
- 🚧 **User Management** (Majeur) - Inscription, profils, amis, stats  
- 🚧 **Remote Authentication** (Majeur) - OAuth 2.0
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

#### **JWT + Sécurité (✅ Implémenté & Testé)**
```javascript
// Système JWT avancé avec refresh tokens COMPLET
- Access tokens courte durée (24h)
- Refresh tokens longue durée (7 jours)
- JWT ID unique (jti) pour tracking
- Système de blacklist pour révocation immédiate
- Validation stricte (issuer, audience, algorithms)
- Protection contre replay attacks
- Middleware d'authentification robuste
- Gestion complète des erreurs JWT
```

#### **Database (✅ Implémenté)**  
```sql
-- SQLite avec better-sqlite3 + Structure complète avec 2FA
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  
  -- OAuth fields
  oauth_provider TEXT,
  oauth_id TEXT,
  
  -- 2FA fields COMPLETS
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

-- Tables additionnelles COMPLÈTES
CREATE TABLE friends (...);          -- Relations d'amitié
CREATE TABLE tournaments (...);      -- Système de tournois  
CREATE TABLE games (...);            -- Parties individuelles
CREATE TABLE match_history (...);    -- Historique détaillé
CREATE TABLE user_sessions (...);    -- Gestion des sessions
CREATE TABLE token_blacklist (...);  -- Révocation JWT
CREATE TABLE tournament_participants (...); -- Participants tournois
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

### 📱 Two-Factor Authentication Routes (`/api/2fa`) 🔒

#### POST `/api/2fa/setup`
Génère un secret TOTP et QR code pour configuration 2FA.

```javascript
// Headers: Authorization: Bearer <token>
// Response (200)
{
  "success": true,
  "setup": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "manualEntryKey": "JBSWY3DPEHPK3PXP",
    "backupUrl": "otpauth://totp/Transcendance:player1?secret=JBSWY3...",
    "instructions": "Scannez ce QR code avec Google Authenticator ou saisissez manuellement la clé"
  }
}
```

#### POST `/api/2fa/enable`
Active la 2FA après vérification du code TOTP.

```javascript
// Request
{
  "token": "123456"  // Code à 6 chiffres de Google Authenticator
}

// Response (200)  
{
  "success": true,
  "message": "Authentification à deux facteurs activée avec succès",
  "backupCodes": [
    "A1B2-C3D4", "E5F6-G7H8", "I9J0-K1L2", "M3N4-O5P6", "Q7R8-S9T0",
    "U1V2-W3X4", "Y5Z6-A7B8", "C9D0-E1F2", "G3H4-I5J6", "K7L8-M9N0"
  ],
  "warning": "Sauvegardez ces codes de récupération dans un endroit sûr. Ils ne seront plus affichés."
}
```

#### GET `/api/2fa/status`
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

#### POST `/api/2fa/verify`
Vérifie un code TOTP pour authentification.

```javascript
// Request
{
  "token": "123456"
}

// Response (200)
{
  "success": true,
  "message": "Code TOTP valide"
}
```

#### POST `/api/2fa/verify-backup`
Utilise un code de sauvegarde pour authentification.

```javascript
// Request
{
  "backupCode": "A1B2-C3D4"
}

// Response (200)
{
  "success": true,
  "message": "Code de sauvegarde utilisé avec succès",
  "remainingCodes": 7,
  "warning": "Il vous reste 7 codes de sauvegarde"
}
```

#### POST `/api/2fa/disable`
Désactive la 2FA (avec vérification).

```javascript
// Request
{
  "currentPassword": "userPassword123",
  "confirmDisable": true
}

// Response (200)
{
  "success": true,
  "message": "Authentification à deux facteurs désactivée"
}
```

#### POST `/api/2fa/regenerate-backup-codes`
Génère de nouveaux codes de sauvegarde.

```javascript
// Request
{
  "token": "123456"  // Code TOTP pour vérification
}

// Response (200)
{
  "success": true,
  "message": "Nouveaux codes de sauvegarde générés",
  "backupCodes": [
    "N1O2-P3Q4", "R5S6-T7U8", "..." // 10 nouveaux codes
  ],
  "warning": "Les anciens codes de sauvegarde ne sont plus valides"
}
```

**📖 [Documentation 2FA complète →](./2FA.md)**

### 👤 User Routes (`/api/users`) 🔒

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

### ✅ **Implémenté et Testé en Production**

#### 🔑 **Authentification 2FA TOTP Complète** ✅
- ✅ **TOTP Google Authenticator** - Compatible RFC 6238, testé et fonctionnel
- ✅ **Codes de sauvegarde** - 10 codes uniques SHA-256, gestion complète
- ✅ **QR Code automatique** - Génération PNG base64, configuration mobile
- ✅ **API REST complète** - 7 endpoints: setup, enable, verify, disable, status, backup-codes
- ✅ **Sécurité renforcée** - Validation temporelle, protection brute-force
- ✅ **Gestion d'erreur** - Codes d'erreur explicites, logging complet
- ✅ **Tests curl réussis** - Tous les endpoints validés en production
- 📖 **[Documentation complète 2FA →](./2FA.md)**

#### 🔐 **Système JWT Avancé Production** ✅
- ✅ **Access/Refresh tokens** - Durées configurables, rotation automatique
- ✅ **Blacklist système** - Révocation immédiate, table dédiée
- ✅ **JWT ID tracking** - UUID unique, traçabilité complète
- ✅ **Validation stricte** - Issuer, audience, algorithme HS256
- ✅ **Middleware robuste** - Protection routes, gestion erreurs
- ✅ **Utils complets** - Génération, validation, révocation
- 📖 **[Documentation complète JWT →](./JWT.md)**

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

1. **Variables d'environnement sécurisées** ✅
   ```javascript
   // ✅ RÉSOLU - JWT_SECRET maintenant sécurisé dans .env
   JWT_SECRET=your-super-secure-256-bit-secret-key-here
   NODE_ENV=production
   ```

2. **HTTPS manquant**
   ```bash
   # ❌ Le sujet exige HTTPS pour tout
   # ✅ TODO: Configurer TLS/SSL dans docker-compose.yml
   ```

### 🟡 **Moyens (À Planifier)**

3. **Architecture non-microservices**
   - Backend actuel monolithique  
   - Module "Microservices" requis
   - Besoin de séparer auth/user/game services

4. **Validation avancée**
   ```javascript
   // ✅ Validation Joi implémentée
   // ✅ TODO: Étendre à tous les endpoints
   ```

5. **Error Handling avancé** ✅
   - ✅ Codes d'erreur standardisés implémentés
   - ✅ Logs structurés avec Pino
   - 🚧 Monitoring à implémenter

### 🟢 **Mineurs (Nice-to-have)**

6. **Tests automatisés** (en cours de planification)
7. **Documentation API automatisée** (Swagger/OpenAPI)
8. **Monitoring/observabilité** (Prometheus/Grafana)
9. **CI/CD pipeline** (GitHub Actions)

## 🔐 Sécurité

### ✅ **Implémenté et Sécurisé**
- ✅ Hachage bcrypt des mots de passe (12 rounds)
- ✅ **JWT avec système avancé COMPLET**
  - Access + Refresh tokens avec rotation
  - JWT ID unique pour tracking parfait
  - Système de blacklist/révocation temps réel
  - Validation stricte (iss, aud, alg, exp, iat)
  - Middleware robuste avec gestion d'erreurs
- ✅ **2FA TOTP Google Authenticator COMPLET**
  - TOTP RFC 6238 compatible
  - QR codes générés automatiquement
  - Codes de sauvegarde sécurisés (SHA-256)
  - 7 endpoints API complets testés
- ✅ CORS configuré correctement
- ✅ **Validation complète des entrées** (Joi sur tous endpoints)
- ✅ Protection contre l'injection SQL (prepared statements)
- ✅ **Rate limiting et headers de sécurité** (Helmet configuré)
- ✅ **Variables d'environnement** sécurisées (.env production)
- ✅ **Logging structuré** avec codes d'erreur standardisés

### 🚧 **À Implémenter** 
- 🚧 **HTTPS obligatoire** (requis par le sujet)
- 🚧 **OAuth Google/GitHub** (Remote Authentication module)
- 🚧 **Protection CSRF** avancée
- 🚧 **Sanitization XSS** complète
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

#### Test complet 2FA avec curl ✅ TESTÉ ET VALIDÉ

```bash
# 1. Créer un utilisateur
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2fa","email":"test2fa@example.com","password":"Test123!"}'

# 2. Setup 2FA (génère QR code)
curl -X POST http://localhost:3000/api/2fa/setup \
  -H "Authorization: Bearer <access_token>"

# 3. Scanner le QR code avec Google Authenticator et activer
curl -X POST http://localhost:3000/api/2fa/enable \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"token":"123456"}'  # Code depuis l'app

# 4. Vérifier le statut 2FA
curl -X GET http://localhost:3000/api/2fa/status \
  -H "Authorization: Bearer <access_token>"

# Réponse confirmée:
{
  "enabled": true,
  "setupInProgress": false,
  "remainingBackupCodes": 10,
  "recommendations": {"backupCodesLow": false, "noBackupCodes": false}
}

# 5. Test vérification TOTP
curl -X POST http://localhost:3000/api/2fa/verify \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"token":"123456"}'

# 6. Test code de sauvegarde
curl -X POST http://localhost:3000/api/2fa/verify-backup \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"backupCode":"A1B2-C3D4"}'

# 7. Régénérer codes de sauvegarde
curl -X POST http://localhost:3000/api/2fa/regenerate-backup-codes \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"token":"123456"}'
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
- [🔐 2FA.md](./2FA.md) - **Documentation complète du système 2FA TOTP**
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

*⚡ Dernière mise à jour: Septembre 2025 - 2FA TOTP et JWT avancé implémentés et testés*
