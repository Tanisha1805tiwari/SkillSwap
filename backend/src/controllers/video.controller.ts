import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { generateVideoRoomToken } from '../utils/jwt';

// ICE server configuration with STUN + TURN
const getIceServers = () => [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TURN server (configured via env vars)
  ...(process.env.TURN_SERVER_URL ? [{
    urls: process.env.TURN_SERVER_URL,
    username: process.env.TURN_USERNAME || 'skillswap',
    credential: process.env.TURN_CREDENTIAL || 'skillswap_turn_secret',
  }] : []),
  // Backup TURN over TCP
  ...(process.env.TURN_SERVER_TCP_URL ? [{
    urls: process.env.TURN_SERVER_TCP_URL,
    username: process.env.TURN_USERNAME || 'skillswap',
    credential: process.env.TURN_CREDENTIAL || 'skillswap_turn_secret',
  }] : []),
];

/**
 * GET /api/video/room/:sessionId
 * Get room access credentials for a session
 */
export const getRoomAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.sessionId },
      include: {
        videoRoom: true,
        teacher: { select: { id: true, name: true } },
        learner: { select: { id: true, name: true } },
      },
    });

    if (!session) throw new AppError('Session not found', 404);

    // Only participants can join
    if (session.teacherId !== req.user!.id && session.learnerId !== req.user!.id) {
      throw new AppError('Not authorized to join this room', 403);
    }

    if (!session.videoRoom) throw new AppError('Video room not found', 404);

    if (session.status === 'CANCELLED') throw new AppError('Session was cancelled', 400);
    if (session.status === 'COMPLETED') throw new AppError('Session has ended', 400);

    // Generate authenticated room token
    const roomToken = generateVideoRoomToken(session.videoRoom.roomToken, req.user!.id);
    const iceServers = getIceServers();

    // Store TURN credentials in room for later validation
    await prisma.videoRoom.update({
      where: { id: session.videoRoom.id },
      data: { iceServers },
    });

    res.json({
      success: true,
      data: {
        roomId: session.videoRoom.roomToken,
        roomToken,
        iceServers,
        signalingUrl: process.env.SIGNALING_SERVER_URL || 'http://localhost:5000',
        role: session.teacherId === req.user!.id ? 'teacher' : 'learner',
        participants: {
          teacher: session.teacher,
          learner: session.learner,
        },
        sessionStatus: session.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/video/active
 * Get all currently active video rooms (admin use)
 */
export const getActiveRooms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rooms = await prisma.videoRoom.findMany({
      where: { status: 'ACTIVE' },
      include: {
        sessions: {
          include: {
            teacher: { select: { id: true, name: true } },
            learner: { select: { id: true, name: true } },
            skill: { select: { title: true } },
          },
        },
        participants: true,
      },
    });

    res.json({ success: true, data: { rooms, count: rooms.length } });
  } catch (error) {
    next(error);
  }
};
