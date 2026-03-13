import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config();

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'skillswap',
    audience: 'skillswap-client',
  });
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'skillswap',
    audience: 'skillswap-client',
  });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'skillswap',
    audience: 'skillswap-client',
  }) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: 'skillswap',
    audience: 'skillswap-client',
  }) as JWTPayload;
};

export const generateVideoRoomToken = (roomId: string, userId: string): string => {
  return jwt.sign({ roomId, userId }, JWT_SECRET, { expiresIn: '2h' });
};

export const verifyVideoRoomToken = (token: string): { roomId: string; userId: string } => {
  return jwt.verify(token, JWT_SECRET) as { roomId: string; userId: string };
};
