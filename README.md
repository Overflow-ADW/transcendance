# Transcendance

Projet de plateforme de jeu en ligne développé avec Docker, Fastify (backend), TypeScript (frontend), et SQLite (base de données).

## Architecture

- **Backend**: Node.js avec Fastify
- **Frontend**: TypeScript avec Webpack
- **Base de données**: SQLite
- **Orchestration**: Docker Compose

## Démarrage rapide

Pour lancer l'ensemble du projet avec une seule commande :

```bash
docker-compose up --build
```

Cette commande va :
- Construire les images Docker pour le backend et le frontend
- Démarrer tous les services (backend, frontend, base de données)
- Configurer le réseau entre les conteneurs

## Services disponibles

Une fois lancé, vous pouvez accéder à :

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **Health check**: http://localhost:3000/health

## Structure du projet

```
transcendance/
├── docker-compose.yml          # Orchestration des services
├── backend/
│   ├── Dockerfile             # Image Docker du backend
│   ├── package.json           # Dépendances Node.js
│   └── src/
│       └── server.js          # Serveur Fastify
├── frontend/
│   ├── Dockerfile             # Image Docker du frontend
│   ├── package.json           # Dépendances frontend
│   ├── webpack.config.js      # Configuration Webpack
│   ├── tsconfig.json          # Configuration TypeScript
│   ├── nginx.conf             # Configuration Nginx
│   └── src/
│       ├── index.html         # Page principale
│       ├── index.ts           # Application TypeScript
│       └── styles.css         # Styles CSS
└── database/                  # Dossier pour la base de données SQLite
```

## Développement

### Développement local

Pour le développement, vous pouvez lancer les services individuellement :

```bash
# Backend seulement
docker-compose up backend database

# Frontend seulement  
docker-compose up frontend
```

### Logs

Pour voir les logs d'un service spécifique :

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Arrêter les services

```bash
docker-compose down
```

### Nettoyer les volumes (attention : supprime les données)

```bash
docker-compose down -v
```

## Fonctionnalités implémentées

- ✅ Configuration Docker Compose complète
- ✅ Backend Fastify avec API REST
- ✅ Frontend TypeScript avec Webpack
- ✅ Base de données SQLite configurée
- ✅ Proxy Nginx pour l'API
- ✅ Communication entre conteneurs
- ✅ Health check endpoint

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
