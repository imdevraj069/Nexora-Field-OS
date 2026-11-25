FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY services/worker-service/package.json services/worker-service/
RUN pnpm install --filter @nexora/worker-service... --no-frozen-lockfile --ignore-scripts

FROM deps AS builder
COPY packages/shared-types/ packages/shared-types/
COPY services/worker-service/ services/worker-service/
RUN pnpm --filter @nexora/shared-types build \
 && pnpm --filter @nexora/worker-service build \
 && pnpm --filter @nexora/worker-service --prod --ignore-scripts deploy /prod/worker-service

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nexora && adduser -S nexora -G nexora
COPY --from=builder --chown=nexora:nexora /prod/worker-service ./
USER nexora
CMD ["node", "dist/server.js"]
