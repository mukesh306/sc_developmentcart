# -------- Stage 1: Builder --------
FROM node:20-alpine AS builder

# Install build dependencies (required for canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev

WORKDIR /app

# Copy only package files first (better caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .


# -------- Stage 2: Runtime --------
FROM node:20-alpine

# Install runtime dependencies required for canvas
RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy built app
COPY --from=builder /app .

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

# Healthcheck (important for production)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT, res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]

