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

CMD ["npm", "start"]