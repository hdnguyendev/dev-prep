# Use official Bun image (includes Node.js 20+)
FROM oven/bun:1.2-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Copy Prisma schema
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile --production

# Generate Prisma Client
RUN bunx prisma generate

# Copy application code
COPY . .

# Expose port (Railway will override with PORT env var)
EXPOSE 9999

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e 'fetch("http://localhost:9999/health").then(r => r.ok ? process.exit(0) : process.exit(1))'

# Start the application
CMD ["bun", "run", "src/index.ts"]
