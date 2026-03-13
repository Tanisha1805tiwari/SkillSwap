'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, MessageSquare, X, Send, Wifi, WifiOff,
  Signal, Clock, Users,
} from 'lucide-react';
import { useWebRTC, ConnectionQuality } from '@/hooks/useWebRTC';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';

interface VideoRoomProps {
  roomId: string;
  userId: string;
  roomToken: string;
  iceServers: RTCIceServer[];
  signalingUrl: string;
  sessionId: string;
  peerName: string;
  onEnd: () => void;
}

export function VideoRoom({
  roomId, userId, roomToken, iceServers,
  signalingUrl, sessionId, peerName, onEnd,
}: VideoRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    localStream, remoteStream, isConnected, isConnecting,
    connectionQuality, mediaState, remoteMediaState,
    callDurationSecs, error,
    toggleAudio, toggleVideo, startScreenShare, stopScreenShare,
    sendChatMessage, leaveCall,
  } = useWebRTC({ roomId, userId, roomToken, iceServers, signalingUrl, onCallEnd: onEnd });

  interface ChatMessage {
    id: string;
    userId: string;
    content: string;
    timestamp: number;
  }

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-hide controls
  useEffect(() => {
    const resetTimer = () => {
      setShowControls(true);
      controlsTimerRef.current && clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
    };
    window.addEventListener('mousemove', resetTimer);
    resetTimer();
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      controlsTimerRef.current && clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // Socket chat messages listener (wired through WebRTC hook via window event)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setMessages((prev) => [...prev, e.detail]);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    window.addEventListener('skillswap:chat', handler as EventListener);
    return () => window.removeEventListener('skillswap:chat', handler as EventListener);
  }, []);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      userId,
      content: chatInput.trim(),
      timestamp: Date.now(),
    }]);
    setChatInput('');
  };

  const qualityColor: Record<ConnectionQuality, string> = {
    excellent: 'text-emerald-400',
    good: 'text-emerald-400',
    fair: 'text-amber-400',
    poor: 'text-red-400',
    disconnected: 'text-slate-500',
  };

  const qualityLabel: Record<ConnectionQuality, string> = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    disconnected: 'Connecting...',
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="glass-card p-8 max-w-md text-center">
          <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button onClick={onEnd} className="px-6 py-3 rounded-lg btn-cyan">
            Return to Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col">
      {/* Main video area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Remote video — full screen */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Remote not connected overlay */}
        {!isConnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Users className="w-10 h-10 text-cyan-400" />
              </div>
              <span className="absolute inset-0 rounded-full border border-cyan-400 animate-pulse-ring" />
            </div>
            <p className="text-lg font-medium text-white mb-2">
              {isConnecting ? `Connecting to ${peerName}...` : `Waiting for ${peerName}`}
            </p>
            <p className="text-muted-foreground text-sm">
              {isConnecting ? 'Establishing peer connection' : 'Session will begin when they join'}
            </p>
          </div>
        )}

        {/* Remote video off overlay */}
        {isConnected && !remoteMediaState.video && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl font-bold text-white">{peerName[0]}</span>
              </div>
              <p className="text-slate-300">{peerName} turned off camera</p>
            </div>
          </div>
        )}

        {/* Screen share indicator */}
        {remoteMediaState.screen && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            {peerName} is sharing their screen
          </div>
        )}

        {/* Local PiP video */}
        <div className="absolute bottom-24 right-4 w-40 h-28 rounded-xl overflow-hidden border border-cyan-500/20 shadow-xl bg-slate-800">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover mirror"
          />
          {!mediaState.video && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-slate-400" />
            </div>
          )}
          {mediaState.screen && (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs bg-cyan-500 text-slate-900 font-medium">
              Screen
            </div>
          )}
        </div>

        {/* Top bar — always visible */}
        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
          {/* Call info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-white">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="font-mono">{formatDuration(callDurationSecs)}</span>
            </div>
            {isConnected && (
              <div className={cn('flex items-center gap-1 text-sm', qualityColor[connectionQuality])}>
                <Signal className="w-4 h-4" />
                <span className="text-xs">{qualityLabel[connectionQuality]}</span>
              </div>
            )}
          </div>

          {/* Peer name */}
          <div className="text-white font-medium">{peerName}</div>

          {/* Chat toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              chatOpen ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Controls bar */}
      <div
        className={cn(
          'transition-all duration-300 bg-slate-900/95 backdrop-blur-xl border-t border-white/5',
          showControls ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="flex items-center justify-center gap-3 px-6 py-4">
          {/* Mic */}
          <ControlButton
            active={mediaState.audio}
            onClick={toggleAudio}
            icon={mediaState.audio ? Mic : MicOff}
            label={mediaState.audio ? 'Mute' : 'Unmute'}
            activeClass="bg-white/10"
            inactiveClass="bg-red-500/20 border border-red-500/30"
          />

          {/* Camera */}
          <ControlButton
            active={mediaState.video}
            onClick={toggleVideo}
            icon={mediaState.video ? Video : VideoOff}
            label={mediaState.video ? 'Stop Video' : 'Start Video'}
            activeClass="bg-white/10"
            inactiveClass="bg-red-500/20 border border-red-500/30"
          />

          {/* Screen share */}
          <ControlButton
            active={!mediaState.screen}
            onClick={mediaState.screen ? stopScreenShare : startScreenShare}
            icon={mediaState.screen ? MonitorOff : Monitor}
            label={mediaState.screen ? 'Stop Share' : 'Share Screen'}
            activeClass="bg-white/10"
            inactiveClass="bg-cyan-500/20 border border-cyan-500/30 text-cyan-300"
          />

          {/* Spacer */}
          <div className="w-px h-10 bg-white/10 mx-2" />

          {/* End call */}
          <button
            onClick={leaveCall}
            className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white transition-all duration-200 hover:-translate-y-0.5"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs font-medium">End Call</span>
          </button>
        </div>
      </div>

      {/* Chat sidebar */}
      {chatOpen && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/5 flex flex-col z-10">
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="font-medium text-white text-sm">In-call Chat</span>
            <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-muted-foreground text-sm text-center mt-8">
                No messages yet. Say hello! 👋
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex flex-col gap-1', msg.userId === userId ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] px-3 py-2 rounded-lg text-sm',
                    msg.userId === userId
                      ? 'bg-cyan-500/20 text-cyan-100 rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm'
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/5">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Type a message..."
                maxLength={2000}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                className="p-2 rounded-lg bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-400 text-slate-900 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  );
}

// ─── Control Button ───────────────────────────────────────────────────────────

interface ControlButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  activeClass: string;
  inactiveClass: string;
}

function ControlButton({ active, onClick, icon: Icon, label, activeClass, inactiveClass }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 text-white',
        active ? activeClass : inactiveClass
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}
