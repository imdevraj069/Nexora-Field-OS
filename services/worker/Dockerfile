FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY services/worker/package.json services/worker/
RUN pnpm install --filter @nexora/worker... --no-frozen-lockfile

FROM deps AS builder
COPY packages/shared-types/ packages/shared-types/
COPY services/worker/ services/worker/
RUN pnpm --filter @nexora/shared-types build \
 && pnpm --filter @nexora/worker build \
 && pnpm --filter @nexora/worker --prod deploy /prod/worker

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nexora && adduser -S nexora -G nexora
COPY --from=builder --chown=nexora:nexora /prod/worker ./
USER nexora
CMD ["node", "dist/index.js"]
