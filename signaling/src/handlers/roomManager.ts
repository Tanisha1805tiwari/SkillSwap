/**
 * RoomManager — In-memory state for active video rooms
 * Tracks peer connections and room lifecycle
 */

import { logger } from '../utils/logger';

export interface Peer {
  userId: string;
  socketId: string;
  joinedAt: number;
  mediaState: {
    video: boolean;
    audio: boolean;
    screen: boolean;
  };
}

export interface Room {
  roomId: string;
  peers: Map<string, Peer>; // userId -> Peer
  createdAt: number;
  startedAt?: number;
  maxPeers: number;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  // Cleanup stale rooms every 30 minutes
  constructor() {
    setInterval(() => this.cleanupStaleRooms(), 30 * 60 * 1000);
  }

  /**
   * Create or get a room
   */
  getOrCreateRoom(roomId: string): Room {
    if (!this.rooms.has(roomId)) {
      const room: Room = {
        roomId,
        peers: new Map(),
        createdAt: Date.now(),
        maxPeers: 2,
      };
      this.rooms.set(roomId, room);
      logger.info(`Room created: ${roomId}`);
    }
    return this.rooms.get(roomId)!;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Add peer to room, returns false if room is full
   */
  addPeer(roomId: string, userId: string, socketId: string): boolean {
    const room = this.getOrCreateRoom(roomId);

    // Check capacity
    if (room.peers.size >= room.maxPeers && !room.peers.has(userId)) {
      logger.warn(`Room full: ${roomId} (${room.peers.size}/${room.maxPeers})`);
      return false;
    }

    room.peers.set(userId, {
      userId,
      socketId,
      joinedAt: Date.now(),
      mediaState: { video: true, audio: true, screen: false },
    });

    if (room.peers.size === 2 && !room.startedAt) {
      room.startedAt = Date.now();
    }

    logger.info(`Peer ${userId} joined room ${roomId} (${room.peers.size}/${room.maxPeers})`);
    return true;
  }

  /**
   * Remove peer from room, return true if room is now empty
   */
  removePeer(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return true;

    room.peers.delete(userId);
    logger.info(`Peer ${userId} left room ${roomId} (${room.peers.size} remaining)`);

    if (room.peers.size === 0) {
      this.rooms.delete(roomId);
      logger.info(`Room ${roomId} destroyed (empty)`);
      return true;
    }
    return false;
  }

  getPeersInRoom(roomId: string): Peer[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.peers.values());
  }

  getOtherPeers(roomId: string, userId: string): Peer[] {
    return this.getPeersInRoom(roomId).filter(p => p.userId !== userId);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Remove stale rooms (no activity for 3 hours)
   */
  private cleanupStaleRooms(): void {
    const threshold = Date.now() - 3 * 60 * 60 * 1000;
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.createdAt < threshold && room.peers.size === 0) {
        this.rooms.delete(roomId);
        logger.info(`Cleaned up stale room: ${roomId}`);
      }
    }
  }
}
