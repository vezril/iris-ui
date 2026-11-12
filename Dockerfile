# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
# NEXT_PUBLIC_* is inlined into the browser bundle at BUILD time — a chart/runtime env for it is
# inert. A RELATIVE path keeps the image environment-agnostic. It must be set HERE, in the builder
# stage, before `next build`.
ARG NEXT_PUBLIC_IRIS_API_BASE=/api/iris
ENV NEXT_PUBLIC_IRIS_API_BASE=$NEXT_PUBLIC_IRIS_API_BASE
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The build fails if the value did not land in the browser chunks (zeus-ui shipped that bug).
RUN npm run build && sh scripts/verify-api-base.sh

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nextjs && adduser -S -u 1001 -G nextjs nextjs
COPY --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 /app/public ./public
USER 1001
EXPOSE 3000
CMD ["node", "server.js"]
