# 🏓 ft_transcendence 

> **Le mythique jeu Pong réinventé pour l'ère moderne !**  
> Plongez dans une expérience multijoueur immersive avec authentification sécurisée, IA avancée et rendu 3D époustouflant.

<div align="center">

![Transcendance Banner](https://via.placeholder.com/800x200/1a1a2e/eee?text=🏓+ft_transcendence)

[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/SarKaZm19/transcendance)
[![42 School](https://img.shields.io/badge/42-School-000000.svg)](https://42.fr/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-42-blue.svg)](LICENSE)

[🚀 Démarrer](#-démarrage-rapide) • [🏆 Fonctionnalités](#-fonctionnalités) • [👥 Équipe](#-léquipe) • [📚 Documentation](#-documentation)

</div>

---

## ✨ À propos

**ft_transcendence** est bien plus qu'un simple remake de Pong. C'est une plateforme de jeu complète développée par des étudiants passionnés de [42](https://42.fr/), qui repousse les limites du jeu classique avec des technologies modernes.

### 🎯 Notre Vision

Créer **l'expérience Pong ultime** : 
- 🎮 **Multijoueur en temps réel** avec matchmaking intelligent
- 🔐 **Sécurité de niveau entreprise** (JWT + 2FA Google Authenticator)  
- 🤖 **IA adaptative** qui apprend de votre style de jeu
- 🌟 **Rendu 3D immersif** avec Babylon.js
- 🏆 **Système de tournois** et classements

---

## 🚀 Démarrage Rapide

```bash
# Clonez le projet
git clone https://github.com/SarKaZm19/transcendance.git
cd transcendance

# Lancez tout avec Docker (magie en 1 ligne !)
docker-compose up --build

# Ouvrez votre navigateur
# 🎯 Jeu: http://localhost:8080  
# 🔧 API: http://localhost:3000
```

**C'est tout !** 🎉 Docker s'occupe du reste.

---

## 🏆 Fonctionnalités

### ✅ **Déjà Implémenté**
- 🔐 **Authentification Ultra-Sécurisée**
  - Connexion classique + JWT avancé 
  - **2FA Google Authenticator** (codes QR automatiques)
  - **OAuth 2.0 Google & GitHub** (authentification sociale)
  - **Liaison de comptes OAuth** (multiple providers par utilisateur)
  - Codes de récupération sécurisés
- 🗄️ **Base de données robuste** (SQLite avec 9 tables optimisées)
- 🚀 **API REST complète** (Fastify + validation JSON Schema)
- 🐳 **Conteneurisation production-ready**

### 🚧 **En Cours de Développement**  
- 🎮 **Multijoueur temps réel** (WebSockets)
- 🤖 **IA avec 5 niveaux de difficulté**
- 🌟 **Rendu 3D avancé** (Babylon.js + shaders)
- 👥 **Système d'amis** et messagerie
- 🏆 **Tournois** et classements

---

## 🛠️ Stack Technologique

<div align="center">

| Frontend | Backend | Base de données | DevOps | OAuth |
|----------|---------|----------------|---------|-------|
| **Next.js** 14 | **Node.js** + Fastify | **SQLite** | **Docker** | **OAuth 2.0** |
| TypeScript | JWT + 2FA | better-sqlite3 | Docker Compose | Google Provider |
| Tailwind CSS | JSON Schema validation | 9 tables optimisées | Volume persistence | GitHub Provider |
| **Babylon.js** | Pino logging | Relations FK | Multi-stage builds | Account Linking |

</div>

---

## 👥 L'Équipe

<div align="center">

| 🔐 **Florent** | 🎨 **Younes** | 🎮 **Topaze** |
|----------------|---------------|---------------|
| Backend & Sécurité | Frontend & UX | Gaming & 3D |
| JWT + 2FA TOTP | Next.js + Design | IA + Babylon.js |
| Architecture API | Interface utilisateur | Logique de jeu |

</div>

### 🏅 Modules Réalisés
- **4 modules majeurs** + **6 modules mineurs** = **12 modules** au total
- **Module Remote Authentication OAuth 2.0** ✅ **COMPLET**
- **Architecture monolithique modulaire** - Choix optimal pour une équipe de 3
- Conformité stricte avec le **sujet 42**
- Code de qualité production 🚀

---

## 🔐 Sécurité de Niveau Entreprise

Nous prenons la sécurité **très au sérieux** :

- ✅ **Hachage bcrypt** (12 rounds)  
- ✅ **JWT avancé** (access + refresh tokens)
- ✅ **2FA TOTP** compatible Google Authenticator
- ✅ **OAuth 2.0** (Google + GitHub avec liaison de comptes)
- ✅ **Sessions sécurisées** avec protection CSRF
- ✅ **Blacklist JWT** (révocation en temps réel)
- ✅ **Rate limiting** et headers de sécurité
- ✅ **Validation stricte** de toutes les entrées
- ✅ **Protection SQL injection**

> 🛡️ **Prêt pour la production !**

---

## 📚 Documentation

### 📖 Guides Complets
- **[📋 TRANSCENDANCE.md](./TRANSCENDANCE.md)** - Documentation technique complète
- **[🔐 JWT.md](./JWT.md)** - Système JWT avancé
- **[📱 2FA.md](./2FA.md)** - Authentification à deux facteurs
- **[🌐 OAUTH.md](./backend/OAUTH.md)** - Module Remote Authentication OAuth 2.0
- **[🏗️ ARCHITECTURE.md](./backend/ARCHITECTURE.md)** - Choix d'architecture backend

### 🧪 Tests en Direct
```bash
# Tester l'API d'authentification
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"player1","email":"test@example.com","password":"Test123!"}'

# Configurer la 2FA
curl -X POST http://localhost:3000/api/2fa/setup \
  -H "Authorization: Bearer <votre_token>"

# Tester l'OAuth Google (redirection)
curl -I http://localhost:3000/api/oauth/google

# Lister les comptes OAuth liés
curl -X GET http://localhost:3000/api/oauth/accounts \
  -H "Authorization: Bearer <votre_token>"
```

---

## 🎮 Captures d'écran

<div align="center">

*🚧 Screenshots à venir avec l'interface 3D !*

![Game Preview](https://via.placeholder.com/600x300/4a90e2/ffffff?text=🏓+Aperçu+du+Jeu+3D)

</div>

---

## 🤝 Contribuer

Ce projet fait partie du cursus **42 School**. Nous sommes ouverts aux suggestions et retours !

### 💡 Idées d'Amélioration
- [ ] Mode spectateur en temps réel
- [ ] Replay system avec analyse
- [ ] Thèmes visuels personnalisés  
- [ ] Intégration Discord bot
- [ ] Mobile app companion

---

## 📝 Licence & Remerciements

- 🏫 Développé dans le cadre de **42 School**
- ❤️ Fait avec passion par l'équipe **SarKaZm19**
- 🙏 Merci à tous les testeurs et contributeurs

---

<div align="center">

**⭐ Star le projet si vous l'aimez !**

*Transformons ensemble le Pong en expérience inoubliable* 🚀

[![42](https://img.shields.io/badge/42-The%20Future%20of%20Learning-black?style=flat-square)](https://42.fr/)

</div>
