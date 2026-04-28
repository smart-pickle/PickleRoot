# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy source
COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Only copy necessary files for production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./

# Install production dependencies
RUN npm install --omit=dev

# Set production environment
ENV NODE_ENV=production
ENV PORT=80

# Expose the configured port
EXPOSE 80

# Run the server using npx to ensure local tsx is found
CMD ["npx", "tsx", "server.ts"]
