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

# Installer openssl pour générer les certificats SSL
RUN apk add --no-cache openssl

# Copier les fichiers statiques
COPY --from=build /app/out /usr/share/nginx/html

# Copier la configuration Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Créer les répertoires nécessaires avec les bonnes permissions
RUN mkdir -p /tmp/nginx /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp \
    /etc/nginx/ssl \
    && chmod -R 755 /tmp/nginx /var/cache/nginx

# Générer un certificat SSL auto-signé
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=FR/ST=Ile-de-France/L=Paris/O=42/OU=Student/CN=localhost"

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
