# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.12.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @maanak/api run build

# Production runtime
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@10.12.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/rules-engine/dist ./packages/rules-engine/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/crypto-provenance/dist ./packages/crypto-provenance/dist
COPY --from=builder /app/packages/report-generator/dist ./packages/report-generator/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

RUN pnpm install --frozen-lockfile

EXPOSE 4000

CMD ["node", "apps/api/dist/server.js"]
