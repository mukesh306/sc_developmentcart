FROM node:18 AS build
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY . .

FROM node:18-alpine

# Create app user with known UID
RUN addgroup -g 1001 appgroup && adduser -S -u 1001 -G appgroup appuser

WORKDIR /usr/src/app

# Copy everything from builder
COPY --from=build /usr/src/app .

# Pre-create uploads dir (matches Docker Compose mount)
RUN mkdir -p /usr/src/app/uploads && chown -R appuser:appgroup /usr/src/app/uploads

USER appuser
CMD ["node", "server.js"]

