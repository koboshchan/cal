# syntax=docker/dockerfile:1

# isolated-vm@7 requires Node >=24 and ships a prebuilt native addon for
# ABI 137 (exactly Node 24.x) — using that version means npm install picks
# up the bundled prebuild instead of compiling from source (which fails on
# newer/older V8 headers), so no compiler toolchain is needed at all.

# --- builder -----------------------------------------------------------
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- runner --------------------------------------------------------------
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Next.js standalone output bundles its own production node_modules subset,
# including isolated-vm's prebuilt native addon installed above.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
