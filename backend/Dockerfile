FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY src ./src

RUN mkdir -p storage/output storage/uploads

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "src/server.js"]
