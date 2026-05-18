FROM node:20-alpine AS base
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci --only=production --no-audit --no-fund
COPY . .
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "index.js"]
