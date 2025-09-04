# Authentification à Deux Facteurs (2FA) - Documentation Technique

## 🔐 Vue d'ensemble

Le système 2FA de Transcendance implémente l'authentification TOTP (Time-based One-Time Password) compatible avec Google Authenticator, Authy et autres applications d'authentification standard.

## 📋 Fonctionnalités

### ✅ Implémentées
- **TOTP (Time-based One-Time Password)** : Compatible RFC 6238
- **Codes de sauvegarde** : 10 codes uniques générés automatiquement
- **QR Code automatique** : Pour configuration rapide dans les apps mobiles
- **Validation sécurisée** : Fenêtre de tolérance configurable
- **Gestion complète** : Activation, désactivation, régénération des codes
- **API REST complète** : Toutes les opérations via endpoints sécurisés

### 🚧 À implémenter
- **OAuth Google** : Authentification via compte Google
- **Intégration frontend** : Interface utilisateur pour la gestion 2FA

## 🏗️ Architecture Technique

### Dépendances
```json
{
  "speakeasy": "^2.0.0",  // Génération et validation TOTP
  "qrcode": "^1.5.3",     // Génération QR codes
  "crypto": "built-in"     // Hachage codes de sauvegarde
}
```

### Structure des fichiers
```
backend/src/
├── utils/
│   └── twoFactorUtils.js    # Utilitaires TOTP et codes de sauvegarde
├── routes/
│   └── twoFactorRoutes.js   # API endpoints 2FA
└── middleware/
    └── auth.js              # Middleware d'authentification JWT
```

### Base de données (SQLite)
```sql
-- Colonnes ajoutées à la table users
two_factor_enabled BOOLEAN DEFAULT FALSE,
two_factor_secret TEXT,                    -- Secret TOTP (base32)
two_factor_temp_secret TEXT,              -- Secret temporaire durant setup
two_factor_backup_codes TEXT              -- JSON array codes hachés
```

## 🔧 API Endpoints

### 🚀 Configuration 2FA

#### `POST /api/auth/2fa/setup`
Génère un secret temporaire et un QR code pour configuration.

**Headers requis :**
```
Authorization: Bearer <access_token>
```

**Réponse :**
```json
{
  "success": true,
  "setup": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "manualEntryKey": "JBSWY3DPEHPK3PXP",
    "instructions": {
      "fr": "Scannez ce QR code avec Google Authenticator...",
      "en": "Scan this QR code with Google Authenticator..."
    }
  }
}
```

#### `POST /api/auth/2fa/enable`
Active la 2FA après vérification du token TOTP.

**Body :**
```json
{
  "token": "123456"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Authentification à deux facteurs activée avec succès",
  "backupCodes": [
    "A1B2-C3D4",
    "E5F6-G7H8",
    "..."
  ],
  "warning": "Sauvegardez ces codes de récupération dans un endroit sûr."
}
```

### 📊 Gestion 2FA

#### `GET /api/auth/2fa/status`
Récupère le statut 2FA de l'utilisateur.

**Réponse :**
```json
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

#### `POST /api/auth/2fa/disable`
Désactive la 2FA (mot de passe + token TOTP requis).

**Body :**
```json
{
  "password": "motdepasse123",
  "token": "123456"
}
```

### 🔄 Codes de sauvegarde

#### `POST /api/auth/2fa/regenerate-backup-codes`
Génère de nouveaux codes de sauvegarde.

**Réponse :**
```json
{
  "success": true,
  "message": "Nouveaux codes de sauvegarde générés",
  "backupCodes": ["A1B2-C3D4", "..."],
  "warning": "Sauvegardez ces nouveaux codes. Les anciens ne fonctionnent plus."
}
```

#### `POST /api/auth/2fa/verify-backup`
Utilise un code de sauvegarde (pendant la connexion).

**Body :**
```json
{
  "backupCode": "A1B2-C3D4"
}
```

## 🛡️ Sécurité

### Bonnes pratiques implémentées
- **Secrets cryptographiquement sûrs** : 32 bytes d'entropie
- **Hachage des codes de sauvegarde** : SHA-256
- **Validation temporelle** : Fenêtre de ±2 périodes (2 minutes)
- **Usage unique des codes** : Codes de sauvegarde supprimés après usage
- **Logging sécurisé** : Aucun secret en plain text dans les logs

### Configuration sécurisée
```env
# Variables d'environnement recommandées
TOTP_SERVICE_NAME=Transcendance
TOTP_WINDOW=2
BACKUP_CODES_COUNT=10
```

## 📱 Flux utilisateur

### 1. Activation de la 2FA
1. Utilisateur connecté appelle `/2fa/setup`
2. Scanne le QR code dans Google Authenticator
3. Saisit le code à 6 chiffres généré
4. Appelle `/2fa/enable` avec le code
5. Sauvegarde les codes de récupération

### 2. Connexion avec 2FA
1. Connexion normale (username/password)
2. Si 2FA activée : demande du code TOTP
3. Validation avec `/2fa/verify` ou `/2fa/verify-backup`
4. Connexion complète après validation

### 3. Gestion des codes de sauvegarde
- Utilisation pour connexion si téléphone perdu
- Régénération périodique recommandée
- Stockage sécurisé hors ligne obligatoire

## 🧪 Tests et exemples

### Test complet avec curl

```bash
# 1. Création utilisateur
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!"}'

# 2. Setup 2FA
curl -X POST http://localhost:3000/api/auth/2fa/setup \
  -H "Authorization: Bearer <token>"

# 3. Activation avec code Google Authenticator
curl -X POST http://localhost:3000/api/auth/2fa/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"token":"123456"}'

# 4. Vérification statut
curl -X GET http://localhost:3000/api/auth/2fa/status \
  -H "Authorization: Bearer <token>"
```

### Test avec speakeasy (développement)
```javascript
const speakeasy = require('speakeasy');

// Génération d'un token pour test
const token = speakeasy.totp({
  secret: 'JBSWY3DPEHPK3PXP',
  encoding: 'base32'
});

console.log('Token actuel:', token);
```

## 🚨 Gestion d'erreur

### Codes d'erreur communs
- `400` : Token TOTP invalide ou expiré
- `401` : Token d'authentification requis
- `404` : Utilisateur non trouvé
- `409` : 2FA déjà activée/désactivée
- `500` : Erreur serveur interne

### Messages d'erreur
```json
{
  "error": "Code de vérification invalide",
  "message": "Vérifiez votre code à 6 chiffres et réessayez"
}
```

## 📈 Métriques et monitoring

### Logs importants
- Setup 2FA initié
- Activation/désactivation 2FA
- Utilisation codes de sauvegarde
- Tentatives de validation échouées

### Indicateurs de sécurité
- Taux d'adoption 2FA
- Fréquence d'utilisation codes de sauvegarde
- Tentatives de force brute sur codes TOTP

## 🔮 Roadmap

### Prochaines fonctionnalités
1. **OAuth Google** : Authentification alternative
2. **WebAuthn** : Support clés de sécurité (YubiKey)
3. **SMS Backup** : Codes de sauvegarde par SMS
4. **Interface utilisateur** : Gestion 2FA dans le frontend
5. **API administrateur** : Gestion 2FA centralisée

### Améliorations prévues
- Rate limiting spécifique 2FA
- Audit trail complet
- Support multi-device
- Synchronisation cross-platform

## 📖 Références

- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [Google Authenticator](https://github.com/google/google-authenticator)
- [Speakeasy Documentation](https://github.com/speakeasyjs/speakeasy)
- [OWASP 2FA Guidelines](https://owasp.org/www-project-cheat-sheets/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

---

**Version :** 1.0.0  
**Dernière mise à jour :** 4 septembre 2025  
**Statut :** ✅ Production Ready
