/**
 * Signaling Server Tests
 * Tests Socket.io signaling and WebRTC handshake flow
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { RoomManager } from '../src/handlers/roomManager';
import { SignalingHandler } from '../src/handlers/signalingHandler';

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

describe('RoomManager', () => {
  let rm: RoomManager;

  beforeEach(() => { rm = new RoomManager(); });

  it('creates room on first peer join', () => {
    rm.addPeer('room-1', 'user-1', 'socket-1');
    expect(rm.getRoom('room-1')).toBeDefined();
    expect(rm.getPeersInRoom('room-1')).toHaveLength(1);
  });

  it('rejects more than maxPeers (2)', () => {
    rm.addPeer('room-1', 'user-1', 'socket-1');
    rm.addPeer('room-1', 'user-2', 'socket-2');
    const result = rm.addPeer('room-1', 'user-3', 'socket-3');
    expect(result).toBe(false);
    expect(rm.getPeersInRoom('room-1')).toHaveLength(2);
  });

  it('removes peer and destroys empty room', () => {
    rm.addPeer('room-1', 'user-1', 'socket-1');
    const isEmpty = rm.removePeer('room-1', 'user-1');
    expect(isEmpty).toBe(true);
    expect(rm.getRoom('room-1')).toBeUndefined();
  });

  it('getOtherPeers excludes self', () => {
    rm.addPeer('room-1', 'user-1', 'socket-1');
    rm.addPeer('room-1', 'user-2', 'socket-2');
    const others = rm.getOtherPeers('room-1', 'user-1');
    expect(others).toHaveLength(1);
    expect(others[0].userId).toBe('user-2');
  });
});

describe('Signaling Server - Socket Connection', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let clientSocket: ClientSocket;
  const PORT = 5100;

  const makeToken = (roomId: string, userId: string) =>
    jwt.sign({ roomId, userId }, JWT_SECRET, { expiresIn: '1h' });

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    const rm = new RoomManager();

    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        const payload = jwt.verify(token, JWT_SECRET) as any;
        (socket as any).userId = payload.userId;
        (socket as any).roomId = payload.roomId;
        next();
      } catch { next(new Error('Auth failed')); }
    });

    io.on('connection', (socket) => {
      new SignalingHandler(socket, io, rm);
      socket.on('join-room', (data) => {
        rm.addPeer(data.roomId, (socket as any).userId, socket.id);
        socket.join(data.roomId);
        socket.emit('room-joined', { roomId: data.roomId, userId: (socket as any).userId, peers: [] });
      });
    });

    httpServer.listen(PORT, done);
  });

  afterAll((done) => {
    clientSocket?.disconnect();
    io.close();
    httpServer.close(done);
  });

  it('authenticates and joins room', (done) => {
    const token = makeToken('room-test', 'user-test');
    clientSocket = ioc(`http://localhost:${PORT}`, {
      auth: { token },
      transports: ['websocket'],
    });

    clientSocket.on('connect', () => {
      clientSocket.emit('join-room', { roomId: 'room-test' });
    });

    clientSocket.on('room-joined', (data) => {
      expect(data.roomId).toBe('room-test');
      done();
    });
  });

  it('rejects connection without token', (done) => {
    const badClient = ioc(`http://localhost:${PORT}`, {
      transports: ['websocket'],
    });
    badClient.on('connect_error', (err) => {
      expect(err.message).toContain('Auth failed');
      badClient.disconnect();
      done();
    });
  });
});
