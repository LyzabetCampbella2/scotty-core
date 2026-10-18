FROM oven/bun:1.2.23
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]
