FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/proto/package.json packages/proto/
COPY packages/shard-router/package.json packages/shard-router/
COPY services/ai-governance-service/package.json services/ai-governance-service/
RUN pnpm install --filter @nexora/ai-governance-service... --no-frozen-lockfile --ignore-scripts

FROM deps AS builder
COPY packages/ packages/
COPY services/ai-governance-service/ services/ai-governance-service/
RUN pnpm --filter @nexora/shared-types build \
 && pnpm --filter @nexora/shard-router build \
 && pnpm --filter @nexora/ai-governance-service build \
 && pnpm --filter @nexora/ai-governance-service --prod --ignore-scripts deploy /prod/ai-governance-service

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache ffmpeg \
 && addgroup -S nexora && adduser -S nexora -G nexora
COPY --from=builder --chown=nexora:nexora /prod/ai-governance-service ./
USER nexora
EXPOSE 50053
CMD ["node", "dist/server.js"]
