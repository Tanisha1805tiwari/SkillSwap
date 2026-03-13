'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
export type MediaState = { video: boolean; audio: boolean; screen: boolean };

interface UseWebRTCProps {
  roomId: string;
  userId: string;
  roomToken: string;
  iceServers: RTCIceServer[];
  signalingUrl: string;
  onCallEnd?: () => void;
}

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: ConnectionQuality;
  mediaState: MediaState;
  remoteMediaState: MediaState;
  callDurationSecs: number;
  peerUserId: string | null;
  error: string | null;
}

export function useWebRTC({
  roomId,
  userId,
  roomToken,
  iceServers,
  signalingUrl,
  onCallEnd,
}: UseWebRTCProps) {
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  const [state, setState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    isConnected: false,
    isConnecting: true,
    connectionQuality: 'disconnected',
    mediaState: { video: true, audio: true, screen: false },
    remoteMediaState: { video: true, audio: true, screen: false },
    callDurationSecs: 0,
    peerUserId: null,
    error: null,
  });

  const update = (partial: Partial<WebRTCState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  // ─── ICE Servers configuration ────────────────────────────────────────────

  const getRTCConfig = (): RTCConfiguration => ({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      ...iceServers,
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  });

  // ─── Create Peer Connection ────────────────────────────────────────────────

  const createPeerConnection = useCallback((peerUserId: string) => {
    const pc = new RTCPeerConnection(getRTCConfig());
    peerConnectionRef.current = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Remote stream
    const remoteStream = new MediaStream();
    update({ remoteStream });

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      update({ remoteStream });
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          roomId,
          candidate: event.candidate.toJSON(),
          targetUserId: peerUserId,
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('PeerConnection state:', state);

      if (state === 'connected') {
        update({ isConnected: true, isConnecting: false, connectionQuality: 'good' });
        startCallTimer();
        reconnectAttemptsRef.current = 0;
      } else if (state === 'disconnected') {
        update({ connectionQuality: 'poor' });
        attemptReconnect();
      } else if (state === 'failed') {
        handleConnectionFailure();
      } else if (state === 'closed') {
        update({ isConnected: false });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE state:', pc.iceConnectionState);
    };

    // Monitor connection quality via stats
    startQualityMonitoring(pc);

    return pc;
  }, [roomId, iceServers]);

  // ─── Media Setup ──────────────────────────────────────────────────────────

  const setupLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      update({ localStream: stream });
      return stream;
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera/microphone permission denied'
        : 'Could not access camera or microphone';
      update({ error: msg, isConnecting: false });
      throw err;
    }
  }, []);

  // ─── Socket.io Signaling ──────────────────────────────────────────────────

  const initSocket = useCallback(async () => {
    await setupLocalMedia();

    const socket = io(signalingUrl, {
      auth: { token: roomToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Signaling connected:', socket.id);
      socket.emit('join-room', { roomId });
    });

    socket.on('connect_error', (err) => {
      console.error('Signaling connection error:', err.message);
      update({ error: 'Could not connect to session server', isConnecting: false });
    });

    // Existing peers in room
    socket.on('room-joined', async (data: { peers: Array<{ userId: string }> }) => {
      update({ isConnecting: peers.length > 0 });
      if (data.peers.length > 0) {
        // We are the second peer — wait for offer
        update({ peerUserId: data.peers[0].userId });
      }
    });

    // New peer joined — we initiate
    socket.on('peer-joined', async ({ userId: peerUserId }: { userId: string }) => {
      console.log('Peer joined:', peerUserId);
      update({ peerUserId });
      const pc = createPeerConnection(peerUserId);

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        socket.emit('offer', { roomId, sdp: offer, targetUserId: peerUserId });
      } catch (err) {
        console.error('Failed to create offer:', err);
      }
    });

    // Received offer — create answer
    socket.on('offer', async ({ fromUserId, sdp }: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      console.log('Received offer from:', fromUserId);
      update({ peerUserId: fromUserId });
      const pc = createPeerConnection(fromUserId);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, sdp: answer, targetUserId: fromUserId });
      } catch (err) {
        console.error('Failed to handle offer:', err);
      }
    });

    // Received answer
    socket.on('answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Failed to set remote description:', err);
      }
    });

    // ICE candidate from remote
    socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    });

    // Remote media state change
    socket.on('peer-media-state', (data: { userId: string; video: boolean; audio: boolean; screen: boolean }) => {
      update({ remoteMediaState: { video: data.video, audio: data.audio, screen: data.screen } });
    });

    // Peer disconnected
    socket.on('peer-left', ({ userId: leftUserId }: { userId: string }) => {
      console.log('Peer left:', leftUserId);
      update({ isConnected: false, connectionQuality: 'disconnected' });
      onCallEnd?.();
    });

    socket.on('room-ended', () => {
      cleanup();
      onCallEnd?.();
    });

    socket.on('error', ({ message }: { message: string }) => {
      update({ error: message });
    });
  }, [roomId, roomToken, signalingUrl, createPeerConnection]);

  // ─── Call Controls ────────────────────────────────────────────────────────

  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    const newEnabled = !audioTracks[0]?.enabled;
    audioTracks.forEach((t) => (t.enabled = newEnabled));
    setState((prev) => {
      const newState = { ...prev, mediaState: { ...prev.mediaState, audio: newEnabled } };
      socketRef.current?.emit('media-state', { roomId, ...newState.mediaState });
      return newState;
    });
  }, [roomId]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    const newEnabled = !videoTracks[0]?.enabled;
    videoTracks.forEach((t) => (t.enabled = newEnabled));
    setState((prev) => {
      const newState = { ...prev, mediaState: { ...prev.mediaState, video: newEnabled } };
      socketRef.current?.emit('media-state', { roomId, ...newState.mediaState });
      return newState;
    });
  }, [roomId]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      screenStreamRef.current = screenStream;

      const screenTrack = screenStream.getVideoTracks()[0];
      const pc = peerConnectionRef.current;

      if (pc) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
      }

      // Update local stream for UI preview
      const newStream = new MediaStream([
        screenTrack,
        ...( localStreamRef.current?.getAudioTracks() || []),
      ]);
      update({ localStream: newStream, mediaState: { ...state.mediaState, screen: true } });
      socketRef.current?.emit('media-state', { roomId, ...state.mediaState, screen: true });

      // Auto-revert when screen sharing ends
      screenTrack.onended = () => stopScreenShare();
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        update({ error: 'Screen sharing failed' });
      }
    }
  }, [roomId, state.mediaState]);

  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;

    const cameraStream = localStreamRef.current;
    if (!cameraStream) return;

    const pc = peerConnectionRef.current;
    if (pc) {
      const cameraTrack = cameraStream.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
    }

    update({ localStream: cameraStream, mediaState: { ...state.mediaState, screen: false } });
    socketRef.current?.emit('media-state', { roomId, ...state.mediaState, screen: false });
  }, [roomId, state.mediaState]);

  const sendChatMessage = useCallback((content: string) => {
    socketRef.current?.emit('chat-message', { roomId, content, timestamp: Date.now() });
  }, [roomId]);

  const leaveCall = useCallback(() => {
    socketRef.current?.emit('leave-room');
    cleanup();
    onCallEnd?.();
  }, [onCallEnd]);

  // ─── Connection Quality Monitoring ────────────────────────────────────────

  const startQualityMonitoring = (pc: RTCPeerConnection) => {
    const interval = setInterval(async () => {
      if (pc.connectionState !== 'connected') {
        clearInterval(interval);
        return;
      }
      try {
        const stats = await pc.getStats();
        let rtt = 0;
        let packetLoss = 0;

        stats.forEach((report) => {
          if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
            rtt = report.roundTripTime || 0;
            packetLoss = report.fractionLost || 0;
          }
        });

        let quality: ConnectionQuality = 'excellent';
        if (rtt > 0.3 || packetLoss > 0.1) quality = 'fair';
        else if (rtt > 0.1 || packetLoss > 0.05) quality = 'good';
        if (rtt > 0.5 || packetLoss > 0.2) quality = 'poor';

        update({ connectionQuality: quality });
      } catch { /* ignore stats errors */ }
    }, 5000);
  };

  // ─── Call Timer ───────────────────────────────────────────────────────────

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, callDurationSecs: prev.callDurationSecs + 1 }));
    }, 1000);
  };

  // ─── Reconnection Logic ───────────────────────────────────────────────────

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      handleConnectionFailure();
      return;
    }
    reconnectAttemptsRef.current++;
    console.log(`Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);

    setTimeout(() => {
      const pc = peerConnectionRef.current;
      if (pc && pc.connectionState !== 'connected') {
        pc.restartIce();
      }
    }, 2000 * reconnectAttemptsRef.current);
  }, []);

  const handleConnectionFailure = () => {
    update({ error: 'Connection lost. Please rejoin the session.', isConnected: false });
  };

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    callTimerRef.current && clearInterval(callTimerRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionRef.current?.close();
    socketRef.current?.disconnect();
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
  }, []);

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    initSocket();
    return () => cleanup();
  }, []);

  return {
    ...state,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    leaveCall,
  };
}
