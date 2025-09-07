# Configuration Docker pour ft_transcendence

## Contraintes du PDF respectées ✅

### Mandatory Part (IV.2)
- ✅ **Single-Page Application** : `output: 'export'` dans next.config.js
- ✅ **Docker deployment** : docker-compose.yml avec commande unique
- ✅ **Autonomous containers** : Frontend (Nginx) + Backend (Fastify)

### Ports Configuration
- **Backend** : 3000 (container) → 3000 (host) 
- **Frontend** : 80 (container) → 8080 (host)

## Architecture Docker

```
docker-compose up
├── Backend Container (transcendance-backend)
│   ├── Fastify server on port 3000
│   ├── SQLite database
│   └── API REST endpoints
└── Frontend Container (transcendance-frontend) 
    ├── Nginx serving static files
    ├── Static Next.js build (SPA)
    └── Port 80 → 8080 (host)
```

## Commands pour Docker

### Lancement complet (une seule commande comme requis)
```bash
docker-compose up --build
```

### Accès aux services
- **Frontend** : http://localhost:8080 
- **Backend API** : http://localhost:3000/api/*

## Workflow de développement vs Production

### Développement (sans Docker)
```bash
# Backend
cd backend && npm run dev  # Port 3000

# Frontend  
cd frontend && npm run dev  # Port 8080
```

### Production (avec Docker)
```bash
# Une seule commande pour tout lancer
docker-compose up --build
```

## Contraintes respectées

### ✅ Single-Page Application
- Next.js configuré avec `output: 'export'`
- Build statique généré dans `/out`
- Nginx sert les fichiers statiques
- Navigation côté client avec React Router

### ✅ Docker requirement
- `docker-compose.yml` lance tout avec une commande
- Containers autonomes avec volumes partagés
- Variables d'environnement gérées par Docker

### ✅ Browser compatibility
- Compatible Firefox (dernière version stable)
- Pas d'erreurs non gérées
- SPA avec navigation browser (back/forward)

Cette configuration respecte parfaitement les contraintes du PDF tout en permettant un développement moderne avec authentification côté client.
