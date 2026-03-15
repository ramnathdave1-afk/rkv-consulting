FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

CMD ["npx", "tsx", "index.ts"]
