# ============================================================
# CryptoLaunch — Multi-stage Docker build
# ============================================================

# Stage 1: Install dependencies + generate Prisma
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm ci
RUN npx prisma generate

# Stage 2: Build Next.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib/generated ./lib/generated
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/.next/static ./.next/static

# Copy prisma (schema + generated client + migrations)
COPY --from=deps /app/lib/generated ./lib/generated
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/artifacts ./artifacts
COPY --from=builder /app/app/artifacts ./app/artifacts

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start: run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
