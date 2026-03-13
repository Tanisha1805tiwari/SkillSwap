/**
 * SignalingHandler — WebRTC SDP offer/answer and ICE candidate relay
 * All messages are room-scoped and sender-authenticated via JWT
 */

import { Socket, Server } from 'socket.io';
import { RoomManager } from './roomManager';
import { logger } from '../utils/logger';

export class SignalingHandler {
  constructor(
    private socket: Socket,
    private io: Server,
    private roomManager: RoomManager
  ) {}

  /**
   * User joins a room — notifies existing peers
   */
  handleJoinRoom(roomId: string, userId: string): void {
    const added = this.roomManager.addPeer(roomId, userId, this.socket.id);

    if (!added) {
      this.socket.emit('error', { code: 'ROOM_FULL', message: 'Room is at capacity' });
      return;
    }

    // Join Socket.io room namespace
    this.socket.join(roomId);

    const peers = this.roomManager.getOtherPeers(roomId, userId);

    // Tell the joining user about existing peers
    this.socket.emit('room-joined', {
      roomId,
      userId,
      peers: peers.map(p => ({
        userId: p.userId,
        socketId: p.socketId,
        mediaState: p.mediaState,
      })),
    });

    // Tell existing peers a new user joined
    this.socket.to(roomId).emit('peer-joined', {
      userId,
      socketId: this.socket.id,
    });

    logger.info(`User ${userId} joined room ${roomId}. Peers in room: ${peers.length + 1}`);
  }

  /**
   * User leaves a room — notifies remaining peers
   */
  handleLeaveRoom(roomId: string, userId: string): void {
    this.socket.leave(roomId);
    const isEmpty = this.roomManager.removePeer(roomId, userId);

    // Notify remaining peers
    this.socket.to(roomId).emit('peer-left', { userId, reason: 'left' });

    if (isEmpty) {
      this.io.to(roomId).emit('room-ended', { roomId });
    }

    logger.info(`User ${userId} left room ${roomId}`);
  }

  /**
   * Relay SDP Offer to target peer (or all peers in room)
   */
  handleOffer(
    roomId: string,
    fromUserId: string,
    sdp: RTCSessionDescriptionInit,
    targetUserId?: string
  ): void {
    const payload = {
      fromUserId,
      sdp,
      timestamp: Date.now(),
    };

    if (targetUserId) {
      // Direct to specific peer
      const targetPeer = this.roomManager
        .getPeersInRoom(roomId)
        .find(p => p.userId === targetUserId);

      if (targetPeer) {
        this.io.to(targetPeer.socketId).emit('offer', payload);
      }
    } else {
      // Broadcast to all other peers in room
      this.socket.to(roomId).emit('offer', payload);
    }

    logger.debug(`Offer relayed: from=${fromUserId} room=${roomId}`);
  }

  /**
   * Relay SDP Answer to target peer
   */
  handleAnswer(
    roomId: string,
    fromUserId: string,
    sdp: RTCSessionDescriptionInit,
    targetUserId?: string
  ): void {
    const payload = {
      fromUserId,
      sdp,
      timestamp: Date.now(),
    };

    if (targetUserId) {
      const targetPeer = this.roomManager
        .getPeersInRoom(roomId)
        .find(p => p.userId === targetUserId);

      if (targetPeer) {
        this.io.to(targetPeer.socketId).emit('answer', payload);
      }
    } else {
      this.socket.to(roomId).emit('answer', payload);
    }

    logger.debug(`Answer relayed: from=${fromUserId} room=${roomId}`);
  }

  /**
   * Relay ICE candidate to target peer (or broadcast)
   */
  handleIceCandidate(
    roomId: string,
    fromUserId: string,
    candidate: RTCIceCandidateInit,
    targetUserId?: string
  ): void {
    const payload = {
      fromUserId,
      candidate,
    };

    if (targetUserId) {
      const targetPeer = this.roomManager
        .getPeersInRoom(roomId)
        .find(p => p.userId === targetUserId);

      if (targetPeer) {
        this.io.to(targetPeer.socketId).emit('ice-candidate', payload);
      }
    } else {
      this.socket.to(roomId).emit('ice-candidate', payload);
    }
  }
}
