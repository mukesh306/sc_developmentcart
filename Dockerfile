FROM node:22.14.0-slim AS base

WORKDIR /app

# Copy dependency files first for layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy only necessary files
COPY config/ ./config/
COPY controllers/ ./controllers/
COPY middleware/ ./middleware/
COPY models/ ./models/
COPY routes/ ./routes/
COPY server.js ./

# Expose app port
EXPOSE 5000

CMD ["node", "server.js"]

