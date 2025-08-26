# Étape de build
FROM node:20-slim as build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installer TOUTES les dépendances (y compris devDependencies pour le build)
RUN npm ci --include=dev

# Copier le code source
COPY . .

# Construire l'application Next.js
RUN npm run build

RUN ls -la out/

# Étape de production avec Nginx
FROM nginx:alpine

# Next.js génère le dossier 'out' pour l'export statique
COPY --from=build /app/out /usr/share/nginx/html

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/nginx.conf

# Exposer le port 80
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
