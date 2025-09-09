FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src/ ./src/

RUN mkdir -p /app/uploads/avatars /app/uploads/default
COPY uploads/ ./uploads/

EXPOSE 3000

CMD ["npm", "start"]