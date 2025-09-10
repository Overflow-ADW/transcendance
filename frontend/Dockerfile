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

# Créer un utilisateur non-root pour Nginx
RUN adduser -D -u 1001 appuser

# Copier les fichiers statiques
COPY --from=build --chown=appuser:appuser /app/out /usr/share/nginx/html

# Copier la configuration Nginx
COPY --chown=appuser:appuser nginx.conf /etc/nginx/nginx.conf

# Créer les répertoires nécessaires avec les bonnes permissions
RUN mkdir -p /tmp/nginx /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp \
    && chown -R appuser:appuser /tmp/nginx /var/cache/nginx /var/log/nginx \
    && chmod -R 755 /tmp/nginx /var/cache/nginx

# Passer à l'utilisateur non-root
USER appuser

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
