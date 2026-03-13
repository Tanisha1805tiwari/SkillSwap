<<<<<<< HEAD
# SkillSwap 🚀

> **Peer-to-peer skill exchange platform with live HD video sessions, screen sharing, and a credit-based economy.**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, ShadCN UI, Zustand |
| Backend API | Node.js, Express, TypeScript |
| Signaling | Node.js, Socket.io |
| Database | PostgreSQL + Prisma ORM |
| Video | WebRTC P2P (STUN + TURN via Coturn) |
| Auth | JWT (access/refresh), Google OAuth |
| Deployment | Vercel (FE), Railway/Render (BE+Signaling), Docker (TURN) |

---

## Project Structure

```
skillswap/
├── frontend/          # Next.js 14 app (Vercel)
│   └── src/
│       ├── app/       # App Router pages
│       ├── components/ # UI, video, chat, dashboard
│       ├── hooks/     # useWebRTC, etc.
│       ├── lib/       # API client, utils
│       └── store/     # Zustand auth store
│
├── backend/           # Express REST API (Railway/Render)
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── lib/
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
│
├── signaling/         # Socket.io signaling server (Railway/Render)
│   └── src/
│       ├── handlers/  # RoomManager, SignalingHandler
│       └── utils/
│
├── turn-server/       # Coturn TURN server (Docker)
│   ├── Dockerfile
│   └── turnserver.conf
│
├── docker-compose.yml # Full local stack
└── README.md
```

---

## Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### 1. Clone & install

```bash
git clone https://github.com/your-org/skillswap.git
cd skillswap

# Install all packages
cd backend  && npm install && cd ..
cd signaling && npm install && cd ..
cd frontend  && npm install && cd ..
```

### 2. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL, JWT_SECRET, etc.

# Signaling
cp signaling/.env.example signaling/.env
# Must share same JWT_SECRET as backend

# Frontend
cp frontend/.env.example frontend/.env.local
# Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SIGNALING_URL
```

### 3. Start database

```bash
# Option A: Docker
docker run -d --name skillswap-db \
  -e POSTGRES_USER=skillswap \
  -e POSTGRES_PASSWORD=skillswap_local \
  -e POSTGRES_DB=skillswap \
  -p 5432:5432 postgres:16-alpine

# Option B: Use Supabase/Neon free tier (see DATABASE_URL below)
```

### 4. Run database migrations & seed

```bash
cd backend
npm run db:generate    # Generate Prisma client
npm run db:migrate:dev # Create tables
npm run db:seed        # Load sample data
```

### 5. Start all services

```bash
# Terminal 1 — Backend API (port 4000)
cd backend && npm run dev

# Terminal 2 — Signaling Server (port 5000)
cd signaling && npm run dev

# Terminal 3 — Frontend (port 3000)
cd frontend && npm run dev
```

Open **http://localhost:3000**

**Test credentials (from seed):**
- Admin: `admin@skillswap.io` / `Admin@123`
- User: `alice@example.com` / `Password@123`

---

## Docker (Full Stack)

```bash
# Build and start everything
docker-compose up --build

# Stop
docker-compose down
```

---

## Production Deployment

### Step 1: Database (Supabase or Neon)

**Supabase (recommended free tier):**
1. Go to https://supabase.com → New project
2. Copy the **Connection string** (URI) from Project Settings → Database
3. Format: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`

**Neon:**
1. Go to https://neon.tech → New project
2. Copy the **connection string** from dashboard

### Step 2: Deploy Backend → Railway

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

cd backend
railway init
railway up
```

Set these environment variables in Railway dashboard:
```
NODE_ENV=production
DATABASE_URL=<your-db-url>
JWT_SECRET=<generate: openssl rand -base64 64>
JWT_REFRESH_SECRET=<generate: openssl rand -base64 64>
ALLOWED_ORIGINS=https://your-app.vercel.app
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=skillswap
TURN_CREDENTIAL=<your-turn-credential>
SIGNALING_SERVER_URL=https://your-signaling.railway.app
```

Run migrations on deploy (Railway auto-runs `npm start`):
```bash
# In Railway: set start command to:
npx prisma migrate deploy && node dist/index.js
```

### Step 3: Deploy Signaling → Railway (separate service)

```bash
cd signaling
railway init
railway up
```

Environment variables:
```
NODE_ENV=production
PORT=5000
JWT_SECRET=<same as backend>
ALLOWED_ORIGINS=https://your-app.vercel.app
```

### Step 4: Deploy TURN Server (VPS)

A TURN server needs a **public IP** and open ports. Use a $5/month VPS (DigitalOcean, Hetzner, Linode).

```bash
# On your VPS
sudo apt update && sudo apt install -y docker.io docker-compose

# Clone the turn-server directory to VPS
scp -r ./turn-server user@your-vps:/opt/skillswap/

# Edit turnserver.conf — uncomment and set:
# external-ip=YOUR_VPS_PUBLIC_IP
# Update user credentials

# Start
cd /opt/skillswap/turn-server
docker build -t skillswap-turn .
docker run -d \
  --name skillswap-turn \
  --network host \
  --restart unless-stopped \
  skillswap-turn
```

Open firewall ports:
```bash
# UFW (Ubuntu)
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp
```

Test TURN server: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
Use: `turn:your-vps-ip:3478` with your credentials.

### Step 5: Deploy Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set Vercel environment variables:
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_SIGNALING_URL=https://your-signaling.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
```

---

## Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create a new project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized origins: `http://localhost:3000`, `https://your-app.vercel.app`
5. Add redirect URIs: `http://localhost:3000/auth/google`
6. Copy **Client ID** → set as `GOOGLE_CLIENT_ID` (backend) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend)

---

## Running Tests

```bash
# Backend tests
cd backend
npm test

# Signaling tests
cd signaling
npm test
```

---

## Database Management

```bash
cd backend

# View/edit data in browser
npm run db:studio

# Create a new migration
npm run db:migrate:dev -- --name add_field_name

# Reset database (dev only!)
npx prisma migrate reset

# Re-seed
npm run db:seed
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Access token signing secret (min 64 chars) |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token signing secret |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated allowed CORS origins |
| `GOOGLE_CLIENT_ID` | ⚠️ | Required for Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ⚠️ | Required for Google OAuth |
| `TURN_SERVER_URL` | ⚠️ | TURN server URL (strongly recommended for production) |
| `TURN_USERNAME` | ⚠️ | TURN server username |
| `TURN_CREDENTIAL` | ⚠️ | TURN server credential |
| `SIGNALING_SERVER_URL` | ✅ | URL of the signaling server |
| `PORT` | ❌ | Server port (default: 4000) |

### Signaling (`signaling/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Must match backend JWT_SECRET |
| `ALLOWED_ORIGINS` | ✅ | Must include frontend URL |
| `PORT` | ❌ | Server port (default: 5000) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL |
| `NEXT_PUBLIC_SIGNALING_URL` | ✅ | Signaling server URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ⚠️ | For Google sign-in button |

---

## Video Architecture

```
Peer A (Browser)                    Peer B (Browser)
     │                                     │
     │──── Socket.io ──────────────────────│
     │     Signaling Server                │
     │     - SDP offer/answer relay        │
     │     - ICE candidate exchange        │
     │                                     │
     │──── WebRTC P2P (direct) ───────────│
           STUN: Google STUN servers
           TURN: Coturn (fallback only)
```

**ICE Gathering flow:**
1. Peer A joins room via Socket.io (with JWT)
2. Peer B joins → A receives `peer-joined` event
3. A creates SDP offer → sends via socket → B
4. B creates SDP answer → sends via socket → A
5. Both exchange ICE candidates
6. Direct P2P connection established (STUN)
7. If STUN fails → falls back to TURN relay

---

## Credit System

```
Session booked: 1 credit reserved
Session starts: timer begins
At session end:
  if duration >= 5 minutes:
    learner.credits -= creditAmount
    teacher.credits += creditAmount
    CreditTransaction records created
  else:
    no transfer (session too short)
```

---

## Production Checklist

- [ ] Generate strong JWT secrets (`openssl rand -base64 64`)
- [ ] Set `NODE_ENV=production` on all servers
- [ ] Configure TURN server with real credentials
- [ ] Enable HTTPS on all services (Vercel/Railway handle this automatically)
- [ ] Set up database backups (Supabase/Neon have automatic backups)
- [ ] Configure proper CORS origins (not wildcard)
- [ ] Run `prisma migrate deploy` before starting backend
- [ ] Set up log monitoring (Railway/Render have built-in logging)

---

## API Reference

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/skills          # Browse with ?q=&category=&level=&sort=
GET    /api/skills/matches  # Smart matching
POST   /api/skills          # Create skill listing
GET    /api/skills/:id
PUT    /api/skills/:id
DELETE /api/skills/:id

GET    /api/sessions
POST   /api/sessions        # Book a session
GET    /api/sessions/:id
POST   /api/sessions/:id/start
POST   /api/sessions/:id/end
PATCH  /api/sessions/:id/cancel

GET    /api/video/room/:sessionId   # Get room access credentials
GET    /api/video/active            # Admin: active rooms

GET    /api/credits
GET    /api/reviews/user/:userId
POST   /api/reviews/session/:id

GET    /api/notifications
PATCH  /api/notifications/read-all

GET    /api/admin/stats
GET    /api/admin/users
PATCH  /api/admin/users/:id/ban
GET    /api/admin/reports
PATCH  /api/admin/reports/:id
```

---

## Support

For issues, open a GitHub issue or contact the team.

Built with ❤️ for lifelong learners.
=======
# SkillSwap
>>>>>>> 5be66c95a7d3df02e4b9ab0a499e4af0b366f16f
