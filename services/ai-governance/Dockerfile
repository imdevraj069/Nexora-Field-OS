FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/proto/package.json packages/proto/
COPY packages/shard-router/package.json packages/shard-router/
COPY services/ai-governance/package.json services/ai-governance/
RUN pnpm install --filter @nexora/ai-governance... --no-frozen-lockfile

FROM deps AS builder
COPY packages/ packages/
COPY services/ai-governance/ services/ai-governance/
RUN pnpm --filter @nexora/shared-types build \
 && pnpm --filter @nexora/shard-router build \
 && pnpm --filter @nexora/ai-governance build \
 && pnpm --filter @nexora/ai-governance --prod deploy /prod/ai-governance

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Install ffmpeg ONLY in the AI Governance container for audio/video preprocessing
RUN apk add --no-cache ffmpeg \
 && addgroup -S nexora && adduser -S nexora -G nexora
COPY --from=builder --chown=nexora:nexora /prod/ai-governance ./
USER nexora
EXPOSE 50053
CMD ["node", "dist/index.js"]
