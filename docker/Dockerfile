# ===================================================
# Stage 1: Build
# ===================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY tsconfig*.json nest-cli.json ./
COPY prisma ./prisma/
COPY src ./src/
COPY scripts ./scripts/

RUN npx prisma generate
RUN npm run build

# ===================================================
# Stage 2: Runtime
# ===================================================
FROM node:20-alpine AS runtime

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/

RUN mkdir -p /data/downloads && chown -R nestjs:nodejs /data /app

USER nestjs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/live || exit 1

CMD ["node", "dist/main"]
