FROM oven/bun:1.3.6 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN rm -rf /root/.bun/install/cache \
	&& bun install --frozen-lockfile --no-cache

COPY . .
RUN bun run build

FROM oven/bun:1.3.6 AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 4321

CMD ["bun", "dist/server/entry.mjs"]
