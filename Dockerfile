# Сборка
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3210
ARG NEXT_PUBLIC_INDEXING=off
ARG NEXT_PUBLIC_PARTNERS=off
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_INDEXING=$NEXT_PUBLIC_INDEXING \
    NEXT_PUBLIC_PARTNERS=$NEXT_PUBLIC_PARTNERS \
    NEXT_TELEMETRY_DISABLED=1
# Финансовые тесты — обязательная часть сборки: с ошибкой в формулах образ не соберётся
RUN pnpm test && pnpm build

# Запуск
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
