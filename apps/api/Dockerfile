# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- chạy thật ----
FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
RUN apk add --no-cache tini wget && addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/package.json ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=5 CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1
# Áp dụng migration rồi mới khởi động API (an toàn khi chạy lặp lại)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
