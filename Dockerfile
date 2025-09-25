# -------- Stage 1: Builder --------
FROM node:18-alpine AS builder

# Install build tools and dependencies for canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Optionally build assets if required (e.g. TypeScript, webpack)
# RUN npm run build

# -------- Stage 2: Runtime --------
FROM node:18-alpine

# Create app user with known UID:GID (match Docker volume permissions)
RUN addgroup -g 1001 appgroup && adduser -S -u 1001 -G appgroup appuser

# Working directory for runtime
WORKDIR /app

# Copy built app and dependencies from builder
COPY --from=builder /app .

# Create and set permissions for uploads directory
RUN mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app/uploads && \
    chmod -R 775 /app/uploads

# Use non-root user
USER appuser

# Expose API port
# Use PORT from environment (.env via docker-compose)
ENV PORT=${PORT}
EXPOSE ${PORT}

# Run app
CMD ["node", "server.js"]
