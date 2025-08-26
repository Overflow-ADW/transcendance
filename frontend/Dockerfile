# Étape de build
FROM node:20-slim AS build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installer les dépendances
RUN npm ci --include=dev

# Copier le code source
COPY . .

# Construire l'application avec Next.js
RUN npm run build

# Étape de production avec Nginx
FROM nginx:alpine

# Supprimer la configuration par défaut de Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copier les fichiers statiques générés par Next.js (dossier out/)
COPY --from=build /app/out /usr/share/nginx/html

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
