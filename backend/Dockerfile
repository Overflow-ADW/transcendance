FROM node:20-alpine

WORKDIR /app

# Copier et installer les dépendances
COPY package*.json ./
RUN npm install

# Copier le code source
COPY src/ ./src/

# Créer les dossiers d'upload et de base de données
RUN mkdir -p /app/uploads/avatars /app/uploads/default /app/data
COPY uploads/ ./uploads/

# Garder root comme UID unique pour compatibilité avec les volumes

EXPOSE 3000

RUN apk add --no-cache openssl && \
    [ -f server.key ] || openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout server.key -out server.cert -subj "/C=FR/ST=Ile-de-France/L=Paris/O=42/OU=Student/CN=localhost"


CMD ["npm", "start"]