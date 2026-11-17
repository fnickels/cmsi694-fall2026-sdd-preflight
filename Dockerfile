# syntax=docker/dockerfile:1

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    LOG_DIR=/data/logs \
    STATIC_DIR=/app/dist/client \
    PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Request logs may hold exact coordinates (ADR 0004): owned by the non-root user, mode 0700.
RUN mkdir -p /data/logs && chown node:node /data/logs && chmod 700 /data/logs
VOLUME /data/logs
USER node
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
