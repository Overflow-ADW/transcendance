# 🔐 JWT - Documentation Système d'Authentification Avancé

> **Système JWT complet avec access/refresh tokens, blacklist et tracking avancé**

## 📋 Table des Matières

- [🎯 Vue d'Ensemble](#vue-densemble)
- [🏗️ Architecture](#architecture)
- [🔑 Types de Tokens](#types-de-tokens)
- [🛡️ Sécurité](#sécurité)
- [📡 API Endpoints](#api-endpoints)
- [🧪 Tests Complets](#tests-complets)
- [⚙️ Configuration](#configuration)
- [📊 Monitoring](#monitoring)

---

## 🎯 Vue d'Ensemble

Notre système JWT implémente les meilleures pratiques de sécurité pour l'authentification dans une application moderne :

### ✨ **Fonctionnalités Principales**
- **Access Tokens** courte durée (24h) pour l'accès aux ressources
- **Refresh Tokens** longue durée (7 jours) pour renouveler les access tokens
- **JWT ID unique** (jti) pour tracker et révoquer individuellement chaque token
- **Système de blacklist** pour invalider les tokens avant expiration
- **Validation stricte** avec issuer, audience et algorithme enforced
- **Codes d'erreur standardisés** pour une gestion d'erreur précise

### 🎭 **Cas d'Usage**
- Authentification utilisateur sécurisée
- Sessions longues avec renouvellement automatique
- Déconnexion sécurisée avec révocation immédiate
- Tracking des sessions multiples par utilisateur
- Protection contre les attaques de replay

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │◄──►│  Backend Fastify │◄──►│  SQLite DB      │
│                 │    │                  │    │                 │
│ • Access Token  │    │ • JWT Utils      │    │ • users         │
│ • Refresh Token │    │ • Auth Routes    │    │ • token_blacklist│
│ • Auto-refresh  │    │ • Middleware     │    │ • user_sessions │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 🔄 **Flux d'Authentification**

1. **Inscription/Connexion** → Génération paire access/refresh tokens
2. **Requêtes API** → Validation access token via middleware
3. **Token expiré** → Utilisation refresh token pour renouvellement
4. **Déconnexion** → Ajout token ID dans blacklist
5. **Sécurité** → Vérification blacklist à chaque validation

---

## 🔑 Types de Tokens

### 🚀 **Access Token**
```json
{
  "userId": 1,
  "username": "testuser",
  "jti": "3dbc7c63-de9c-452d-863b-1941affa1d9b",
  "type": "access",
  "iat": 1756994801,
  "exp": 1757081201,
  "aud": "transcendance-client",
  "iss": "transcendance-api"
}
```

- **Durée** : 24 heures (configurable)
- **Usage** : Accès aux ressources protégées
- **Validation** : Middleware `authenticateToken`
- **Révocation** : Via blacklist avec JWT ID

### 🔄 **Refresh Token**
```json
{
  "userId": 1,
  "username": "testuser", 
  "jti": "3dbc7c63-de9c-452d-863b-1941affa1d9b",
  "type": "refresh",
  "iat": 1756994801,
  "exp": 1757599601,
  "aud": "transcendance-client",
  "iss": "transcendance-api"
}
```

- **Durée** : 7 jours (configurable)
- **Usage** : Renouvellement des access tokens
- **Validation** : Middleware `authenticateRefreshToken`
- **Sécurité** : Secret séparé (optionnel)

### 🎯 **JWT ID (jti)**
- **Format** : UUID v4 unique
- **Usage** : Identifier et tracker chaque session
- **Révocation** : Permet d'invalider individuellement
- **Exemple** : `"3dbc7c63-de9c-452d-863b-1941affa1d9b"`

---

## 🛡️ Sécurité

### 🔒 **Validation Stricte**
```javascript
// Configuration de validation
const jwtOptions = {
  issuer: 'transcendance-api',
  audience: 'transcendance-client', 
  algorithms: ['HS256']
};
```

### 🚫 **Système de Blacklist**

#### Table `token_blacklist`
```sql
CREATE TABLE token_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id TEXT UNIQUE NOT NULL,      -- JWT ID (jti)
  user_id INTEGER,                    -- Utilisateur propriétaire
  reason TEXT DEFAULT 'logout',       -- Raison de révocation
  invalidated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,                    -- Expiration originale du token
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### Vérification Automatique
```javascript
// Chaque validation vérifie la blacklist
const isBlacklisted = isTokenBlacklisted(decoded.jti, db);
if (isBlacklisted) {
  return reply.status(401).send({
    error: 'Token révoqué',
    code: 'TOKEN_BLACKLISTED'
  });
}
```

### 🔐 **Variables d'Environnement**
```bash
# .env
JWT_SECRET=e8f9a6b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0
JWT_REFRESH_SECRET=m9n0l8k7j6i5h4g3f2e1d0c9b8a7z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1z0y9x8
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d
```

---

## 📡 API Endpoints

### 🔐 **Authentification**

#### `POST /api/auth/register`
Créer un compte utilisateur avec génération de tokens.

**Request:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test123!@#"
}
```

**Response (201):**
```json
{
  "message": "Utilisateur créé avec succès",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h",
  "tokenType": "Bearer"
}
```

#### `POST /api/auth/login`
Connexion utilisateur avec génération de nouveaux tokens.

**Request:**
```json
{
  "username": "testuser",
  "password": "Test123!@#"
}
```

**Response (200):**
```json
{
  "message": "Connexion réussie",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "status": "online",
    "created_at": "2025-09-04 14:06:20"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h",
  "tokenType": "Bearer"
}
```

#### `POST /api/auth/refresh` 🔒
Renouveler un access token avec un refresh token valide.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "message": "Tokens rafraîchis avec succès",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "status": "online"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h",
  "tokenType": "Bearer"
}
```

#### `POST /api/auth/logout` 🔒
Déconnexion avec invalidation du token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Déconnexion réussie",
  "code": "LOGOUT_SUCCESS"
}
```

#### `POST /api/auth/verify`
Vérifier la validité d'un token avec détails complets.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "message": "Token valide",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "status": "online",
    "created_at": "2025-09-04 14:06:20"
  },
  "tokenInfo": {
    "tokenId": "3dbc7c63-de9c-452d-863b-1941affa1d9b",
    "issuedAt": "2025-09-04T14:06:41.000Z",
    "expiresAt": "2025-09-05T14:06:41.000Z",
    "type": "access"
  },
  "code": "TOKEN_VALID"
}
```

#### `POST /api/auth/revoke` 🔒
Révoquer un token spécifique (admin ou self).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "tokenId": "3dbc7c63-de9c-452d-863b-1941affa1d9b"
}
```

**Response (200):**
```json
{
  "message": "Token révoqué avec succès",
  "revokedTokenId": "3dbc7c63-de9c-452d-863b-1941affa1d9b",
  "code": "TOKEN_REVOKED"
}
```

### 👤 **Routes Protégées**

#### `GET /api/users/profile` 🔒
Récupérer le profil de l'utilisateur authentifié.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "created_at": "2025-09-04 14:06:20"
  }
}
```

---

## 🧪 Tests Complets

### 📝 **Scénarios de Test**

#### 1. **Flux Complet d'Authentification**
```bash
# 1. Inscription
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# 2. Connexion  
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!@#"
  }'

# 3. Accès ressource protégée
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <access_token>"

# 4. Vérification token
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"token": "<access_token>"}'

# 5. Déconnexion
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

#### 2. **Test Refresh Token**
```bash
# Refresh des tokens
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh_token>"}'
```

#### 3. **Test Révocation**
```bash
# Révoquer un token
curl -X POST http://localhost:3000/api/auth/revoke \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"tokenId": "<jwt_id>"}'
```

### 🚨 **Tests d'Erreur**

#### Token Invalide
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer invalid_token"

# Response (401):
{
  "error": "Token invalide ou malformé",
  "details": "invalid token",
  "code": "INVALID_TOKEN"
}
```

#### Token Expiré
```bash
# Response (401):
{
  "error": "Le token a expiré",
  "details": "jwt expired",
  "code": "TOKEN_EXPIRED"
}
```

#### Token Blacklisté
```bash
# Response (401):
{
  "error": "Token révoqué",
  "details": "Ce token a été invalidé",
  "code": "TOKEN_BLACKLISTED"
}
```

---

## ⚙️ Configuration

### 📄 **Variables d'Environnement (.env)**

```bash
# 🔐 SÉCURITÉ JWT (CRITIQUE)
JWT_SECRET=your-super-secret-256-bit-key-change-this-now
JWT_REFRESH_SECRET=different-secret-for-refresh-tokens-optional
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# 🗄️ BASE DE DONNÉES
DATABASE_PATH=/app/data/database.sqlite

# 🌐 SERVEUR
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# 🔒 SÉCURITÉ
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://localhost:8080
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

### 🐳 **Docker Compose**
```yaml
services:
  backend:
    build:
      context: ./backend
    env_file:
      - ./backend/.env  # Mount du fichier .env
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/database.sqlite
```

### 🏗️ **Architecture des Fichiers**
```
backend/src/
├── utils/
│   └── jwtUtils.js          # Utilitaires JWT centralisés
├── middleware/
│   └── auth.js              # Middlewares d'authentification
├── routes/
│   └── authRoutes.js        # Routes d'authentification
└── db.js                    # Configuration DB avec token_blacklist
```

---

## 📊 Monitoring

### 📈 **Métriques JWT**

#### Logs Structurés
```javascript
// Connexion réussie
{"level":30,"time":1756994801,"msg":"✅ Utilisateur connecté: testuser (ID: 1)"}

// Token révoqué
{"level":30,"time":1756994901,"msg":"🚫 Token révoqué: 3dbc7c63-... par testuser"}

// Tentative token invalide
{"level":40,"time":1756994951,"msg":"🚨 Tentative accès token invalide"}
```

#### Base de Données
```sql
-- Statistiques des tokens révoqués
SELECT reason, COUNT(*) as count, DATE(invalidated_at) as date
FROM token_blacklist 
GROUP BY reason, DATE(invalidated_at)
ORDER BY date DESC;

-- Sessions actives par utilisateur
SELECT u.username, COUNT(s.id) as active_sessions
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = TRUE
GROUP BY u.id, u.username;
```

### 🔍 **Surveillance Sécurité**

#### Détection d'Anomalies
- Tentatives de connexion multiples échouées
- Utilisation de tokens expirés répétée
- Tentatives d'accès avec tokens révoqués
- Refresh tokens utilisés après expiration

#### Nettoyage Automatique
```javascript
// Nettoyer les tokens expirés de la blacklist
const cleanup = db.prepare(`
  DELETE FROM token_blacklist 
  WHERE datetime(invalidated_at, '+7 days') < datetime('now')
`);
```

---

## 🎯 Codes d'Erreur

| Code | Description | Status |
|------|-------------|--------|
| `TOKEN_VALID` | Token vérifié avec succès | 200 |
| `MISSING_TOKEN` | Token manquant dans Authorization | 401 |
| `INVALID_TOKEN` | Token malformé ou signature invalide | 401 |
| `TOKEN_EXPIRED` | Token expiré, utiliser refresh | 401 |
| `TOKEN_BLACKLISTED` | Token révoqué dans blacklist | 401 |
| `INVALID_TOKEN_TYPE` | Type de token incorrect (access/refresh) | 401 |
| `USER_NOT_FOUND` | Utilisateur du token n'existe plus | 404 |
| `TOKEN_REVOKED` | Token révoqué avec succès | 200 |
| `LOGOUT_SUCCESS` | Déconnexion réussie | 200 |

---

## 🚀 Prochaines Améliorations

### 🔮 **Roadmap**
- [ ] **Rotation automatique des secrets** JWT
- [ ] **Sessions multiples** par utilisateur avec gestion
- [ ] **Géolocalisation** des connexions
- [ ] **Notifications** de nouvelles connexions
- [ ] **2FA intégration** avec JWT
- [ ] **OAuth flows** avec JWT bridge
- [ ] **Rate limiting** spécifique par token
- [ ] **Analytics** avancées des sessions

---

*📝 Documentation générée le 4 septembre 2025*  
*🔧 Version du système: JWT v2.0 - Access/Refresh + Blacklist*
