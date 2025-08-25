# Étape 1 : Spécifier l'image de base (Node.js)
FROM node:20-alpine

# Étape 2 : Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Étape 3 : Copier les fichiers de dépendances et les installer
# On copie d'abord les fichiers package.json et package-lock.json pour optimiser le cache
COPY package*.json ./
RUN npm install

# Étape 4 : Copier le reste du code de l'application
COPY . .

# Étape 5 : Exposer le port sur lequel l'application s'exécute
# Le port 3000 est souvent utilisé par Fastify par défaut, mais vous pouvez le changer
EXPOSE 3000

# Étape 6 : Spécifier la commande pour lancer l'application
# On lance l'application avec la commande npm start
CMD ["npm", "start"]
