FROM node:20-alpine

# Créer un utilisateur non-root
RUN adduser -D -u 1001 appuser

WORKDIR /app

# Copier et installer les dépendances en tant que root
COPY package*.json ./
RUN npm install --production

# Copier le code source
COPY src/ ./src/

# Créer les dossiers d'upload
RUN mkdir -p /app/uploads/avatars /app/uploads/default
COPY uploads/ ./uploads/

# Changer la propriété vers l'utilisateur non-root
RUN chown -R appuser:appuser /app

# Passer à l'utilisateur non-root
USER appuser

EXPOSE 3000

CMD ["npm", "start"]