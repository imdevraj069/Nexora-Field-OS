# Stage 1: Install workspace dependencies
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/proto/package.json packages/proto/
COPY packages/shard-router/package.json packages/shard-router/
COPY services/identity/package.json services/identity/
RUN pnpm install --filter @nexora/identity... --no-frozen-lockfile

# Stage 2: Build packages & deploy standalone production bundle
FROM deps AS builder
COPY packages/ packages/
COPY services/identity/ services/identity/
RUN pnpm --filter @nexora/shared-types build \
 && pnpm --filter @nexora/shard-router build \
 && pnpm --filter @nexora/identity build \
 && pnpm --filter @nexora/identity --prod deploy /prod/identity

# Stage 3: Minimal standalone runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nexora && adduser -S nexora -G nexora
COPY --from=builder --chown=nexora:nexora /prod/identity ./
USER nexora
EXPOSE 4001 50051
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD node -e "fetch('http://127.0.0.1:4001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
