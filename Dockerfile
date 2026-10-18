# Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Backend
FROM node:22-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

# Data volume for SQLite
VOLUME /app/backend/data

ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0
ENV DB_PATH=/app/backend/data/finance.db

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
