version: '3.9'

services:
  # ─── PostgreSQL ─────────────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    container_name: skillswap-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: skillswap
      POSTGRES_PASSWORD: skillswap_local
      POSTGRES_DB: skillswap
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U skillswap']
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Backend API ────────────────────────────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: skillswap-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://skillswap:skillswap_local@postgres:5432/skillswap
      JWT_SECRET: ${JWT_SECRET:-dev_secret_change_in_production}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-dev_refresh_secret_change_in_production}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://localhost:3000}
      TURN_SERVER_URL: turn:turn:3478
      TURN_USERNAME: skillswap
      TURN_CREDENTIAL: skillswap_turn_secret
      SIGNALING_SERVER_URL: http://signaling:5000
    ports:
      - '4000:4000'
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/logs:/app/logs

  # ─── Signaling Server ───────────────────────────────────────────────────────
  signaling:
    build:
      context: ./signaling
      dockerfile: Dockerfile
    container_name: skillswap-signaling
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 5000
      JWT_SECRET: ${JWT_SECRET:-dev_secret_change_in_production}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://localhost:3000}
    ports:
      - '5000:5000'

  # ─── TURN Server ────────────────────────────────────────────────────────────
  turn:
    build:
      context: ./turn-server
      dockerfile: Dockerfile
    container_name: skillswap-turn
    restart: unless-stopped
    network_mode: host   # Required for TURN to work correctly
    volumes:
      - ./turn-server/turnserver.conf:/etc/turnserver.conf:ro

  # ─── Frontend (dev only) ────────────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: http://localhost:4000/api
        NEXT_PUBLIC_SIGNALING_URL: http://localhost:5000
    container_name: skillswap-frontend
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000/api
      NEXT_PUBLIC_SIGNALING_URL: http://localhost:5000
    ports:
      - '3000:3000'
    depends_on:
      - backend
      - signaling

volumes:
  postgres_data:
