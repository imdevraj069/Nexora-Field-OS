FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/proto/package.json packages/proto/
COPY packages/shard-router/package.json packages/shard-router/
COPY services/api-gateway/package.json services/api-gateway/
RUN pnpm install --filter @nexora/api-gateway... --no-frozen-lockfile

FROM deps AS builder
COPY packages/ packages/
COPY services/api-gateway/ services/api-gateway/
RUN pnpm --filter @nexora/shared-types build \
 && pnpm --filter @nexora/shard-router build \
 && pnpm --filter @nexora/api-gateway build \
 && pnpm --filter @nexora/api-gateway --prod deploy /prod/api-gateway

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nexora && adduser -S nexora -G nexora
COPY --from=builder --chown=nexora:nexora /prod/api-gateway ./
USER nexora
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
