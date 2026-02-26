FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
RUN npx prisma generate

FROM node:22-alpine
WORKDIR /app
COPY --from=base /app .
EXPOSE 3001
CMD ["node", "src/server.js"]
