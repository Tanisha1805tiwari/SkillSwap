/**
 * SkillSwap WebRTC Signaling Server
 * Handles SDP offer/answer exchange, ICE candidates, room lifecycle
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { RoomManager } from './handlers/roomManager';
import { SignalingHandler } from './handlers/signalingHandler';

config();

const app = express();
const httpServer = createServer(app);

// ─── Express Setup ────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    rooms: roomManager.getRoomCount(),
    connections: io.engine.clientsCount,
    uptime: process.uptime(),
  });
});

// ─── Socket.io Setup ──────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30_000,
  pingInterval: 10_000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6, // 1MB max message
});

const roomManager = new RoomManager();

// ─── Socket Authentication Middleware ─────────────────────────────────────────

io.use((socket: Socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { roomId: string; userId: string };
    (socket as any).userId = payload.userId;
    (socket as any).roomId = payload.roomId;

    logger.info(`Socket authenticated: userId=${payload.userId} roomId=${payload.roomId}`);
    next();
  } catch (err) {
    logger.warn(`Socket auth failed: ${(err as Error).message}`);
    next(new Error('Invalid token'));
  }
});

// ─── Connection Tracking ──────────────────────────────────────────────────────

// Track socket → room mapping for cleanup
const socketRooms = new Map<string, string>();

// ─── Socket Event Handlers ────────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {
  const userId = (socket as any).userId as string;
  const roomId = (socket as any).roomId as string;

  logger.info(`Client connected: socketId=${socket.id} userId=${userId}`);

  const signalingHandler = new SignalingHandler(socket, io, roomManager);

  // ── Room Events ──────────────────────────────────────────────────────────

  socket.on('join-room', (data: { roomId: string }) => {
    // Validate the room matches the JWT claim
    if (data.roomId !== roomId) {
      socket.emit('error', { code: 'ROOM_MISMATCH', message: 'Room ID mismatch' });
      return;
    }
    signalingHandler.handleJoinRoom(data.roomId, userId);
    socketRooms.set(socket.id, data.roomId);
  });

  socket.on('leave-room', () => {
    const rid = socketRooms.get(socket.id);
    if (rid) {
      signalingHandler.handleLeaveRoom(rid, userId);
      socketRooms.delete(socket.id);
    }
  });

  // ── WebRTC Signaling ─────────────────────────────────────────────────────

  /**
   * SDP Offer — sent by the initiating peer
   * Security: Validate SDP structure before forwarding
   */
  socket.on('offer', (data: { roomId: string; sdp: RTCSessionDescriptionInit; targetUserId?: string }) => {
    if (data.roomId !== roomId) return; // Prevent room hopping
    if (!isValidSDP(data.sdp)) {
      socket.emit('error', { code: 'INVALID_SDP', message: 'Invalid SDP offer' });
      return;
    }
    signalingHandler.handleOffer(data.roomId, userId, data.sdp, data.targetUserId);
  });

  /**
   * SDP Answer — sent by the receiving peer
   */
  socket.on('answer', (data: { roomId: string; sdp: RTCSessionDescriptionInit; targetUserId?: string }) => {
    if (data.roomId !== roomId) return;
    if (!isValidSDP(data.sdp)) {
      socket.emit('error', { code: 'INVALID_SDP', message: 'Invalid SDP answer' });
      return;
    }
    signalingHandler.handleAnswer(data.roomId, userId, data.sdp, data.targetUserId);
  });

  /**
   * ICE Candidate — NAT traversal candidates
   */
  socket.on('ice-candidate', (data: { roomId: string; candidate: RTCIceCandidateInit; targetUserId?: string }) => {
    if (data.roomId !== roomId) return;
    signalingHandler.handleIceCandidate(data.roomId, userId, data.candidate, data.targetUserId);
  });

  // ── Media State Events ───────────────────────────────────────────────────

  socket.on('media-state', (data: { roomId: string; video: boolean; audio: boolean; screen: boolean }) => {
    if (data.roomId !== roomId) return;
    socket.to(data.roomId).emit('peer-media-state', {
      userId,
      video: data.video,
      audio: data.audio,
      screen: data.screen,
    });
  });

  // ── Chat Events ──────────────────────────────────────────────────────────

  socket.on('chat-message', (data: { roomId: string; content: string; timestamp: number }) => {
    if (data.roomId !== roomId) return;
    if (!data.content?.trim() || data.content.length > 2000) return;

    io.to(data.roomId).emit('chat-message', {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      content: data.content.trim(),
      timestamp: data.timestamp || Date.now(),
    });
  });

  // ── Reconnection ─────────────────────────────────────────────────────────

  socket.on('reconnect-attempt', (data: { roomId: string }) => {
    if (data.roomId !== roomId) return;
    const room = roomManager.getRoom(data.roomId);
    if (room) {
      socket.emit('room-state', {
        peers: Array.from(room.peers.values()).filter(p => p.userId !== userId),
      });
    }
  });

  // ── Disconnect ───────────────────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: socketId=${socket.id} userId=${userId} reason=${reason}`);
    const rid = socketRooms.get(socket.id);
    if (rid) {
      signalingHandler.handleLeaveRoom(rid, userId);
      socketRooms.delete(socket.id);
    }
  });

  socket.on('error', (err) => {
    logger.error(`Socket error: socketId=${socket.id}`, err);
  });
});

// ─── SDP Validation ───────────────────────────────────────────────────────────

function isValidSDP(sdp: any): boolean {
  if (!sdp || typeof sdp !== 'object') return false;
  if (!['offer', 'answer'].includes(sdp.type)) return false;
  if (typeof sdp.sdp !== 'string') return false;
  if (sdp.sdp.length > 50_000) return false; // Max 50KB SDP
  // Must contain required SDP lines
  if (!sdp.sdp.includes('v=0')) return false;
  if (!sdp.sdp.includes('m=')) return false;
  return true;
}

// ─── Server Start ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '5000', 10);

httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`🎙️  SkillSwap Signaling Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Closing signaling server...');
  io.close();
  httpServer.close(() => process.exit(0));
});

export { io, roomManager };
