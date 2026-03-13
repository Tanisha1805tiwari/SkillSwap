FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 skillswap

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

USER skillswap
EXPOSE 5000

CMD ["node", "dist/index.js"]
