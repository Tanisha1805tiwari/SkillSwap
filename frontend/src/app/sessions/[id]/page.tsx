'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Video, Clock, Calendar, CheckCircle, XCircle, Loader2,
  Star, ArrowLeft, User
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { VideoRoom } from '@/components/video/VideoRoom';
import Link from 'next/link';
import { formatDuration } from '@/lib/utils';

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roomAccess, setRoomAccess] = useState<any>(null);
  const [inCall, setInCall] = useState(false);
  const [joining, setJoining] = useState(false);
  const [ending, setEnding] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    apiGet<any>(`/sessions/${id}`).then((d) => setSession(d.session)).finally(() => setLoading(false));
  }, [id]);

  const joinCall = async () => {
    setJoining(true);
    try {
      const data = await apiGet<any>(`/video/room/${id}`);
      setRoomAccess(data);

      // Start session if not already active
      if (session.status === 'CONFIRMED') {
        await apiPost(`/sessions/${id}/start`);
        setSession((prev: any) => ({ ...prev, status: 'ACTIVE' }));
      }
      setInCall(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to join call');
    } finally {
      setJoining(false);
    }
  };

  const endCall = async () => {
    setEnding(true);
    setInCall(false);
    try {
      const result = await apiPost<any>(`/sessions/${id}/end`);
      setSession((prev: any) => ({
        ...prev,
        status: 'COMPLETED',
        durationSecs: result.durationSecs,
      }));
    } catch { /* ignore */ }
    finally { setEnding(false); }
  };

  const submitReview = async () => {
    try {
      await apiPost(`/reviews/session/${id}`, { rating, comment: reviewComment });
      setReviewDone(true);
    } catch { /* ignore */ }
  };

  if (inCall && roomAccess) {
    return (
      <VideoRoom
        roomId={roomAccess.roomId}
        userId={user!.id}
        roomToken={roomAccess.roomToken}
        iceServers={roomAccess.iceServers}
        signalingUrl={roomAccess.signalingUrl}
        sessionId={id}
        peerName={
          session.teacherId === user?.id ? session.learner.name : session.teacher.name
        }
        onEnd={endCall}
      />
    );
  }

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!session) return (
    <DashboardLayout>
      <div className="text-center py-16">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    </DashboardLayout>
  );

  const isTeacher = session.teacherId === user?.id;
  const peer = isTeacher ? session.learner : session.teacher;
  const canJoin = ['CONFIRMED', 'ACTIVE'].includes(session.status);
  const scheduledAt = new Date(session.scheduledAt);
  const isCompleted = session.status === 'COMPLETED';

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    PENDING: { label: 'Pending', color: 'text-slate-400 bg-slate-500/10', icon: Clock },
    CONFIRMED: { label: 'Confirmed', color: 'text-cyan-400 bg-cyan-500/10', icon: CheckCircle },
    ACTIVE: { label: 'Live Now', color: 'text-emerald-400 bg-emerald-500/10', icon: Video },
    COMPLETED: { label: 'Completed', color: 'text-slate-400 bg-slate-500/10', icon: CheckCircle },
    CANCELLED: { label: 'Cancelled', color: 'text-red-400 bg-red-500/10', icon: XCircle },
  };

  const status = statusConfig[session.status] || statusConfig.PENDING;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link href="/sessions" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to sessions
        </Link>

        {/* Session header */}
        <div className="glass-card p-6 mb-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">{session.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">{session.skill.category}</p>
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
              <status.icon className="w-4 h-4" />
              {status.label}
            </span>
          </div>

          {/* Session meta */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-white">{scheduledAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-white">{scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {isCompleted && session.durationSecs && (
              <div className="flex items-center gap-2 text-sm">
                <Video className="w-4 h-4 text-cyan-400" />
                <span className="text-white">Duration: {formatDuration(session.durationSecs)}</span>
              </div>
            )}
          </div>

          {/* Peer info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
              {peer.avatar
                ? <img src={peer.avatar} className="w-10 h-10 rounded-full" alt="" />
                : <span className="text-sm font-bold text-cyan-400">{peer.name[0]}</span>
              }
            </div>
            <div>
              <p className="text-sm font-medium text-white">{peer.name}</p>
              <p className="text-xs text-muted-foreground">{isTeacher ? 'Learner' : 'Teacher'}</p>
            </div>
          </div>

          {/* Notes */}
          {session.notes && (
            <div className="mt-4 p-3 rounded-lg bg-white/5 text-sm text-muted-foreground">
              <p className="text-xs font-medium text-white mb-1">Session notes:</p>
              {session.notes}
            </div>
          )}

          {/* Join button */}
          {canJoin && (
            <button
              onClick={joinCall}
              disabled={joining}
              className="w-full mt-5 py-3.5 rounded-xl btn-cyan font-semibold text-slate-900 flex items-center justify-center gap-2 text-base"
            >
              {joining ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  {session.status === 'ACTIVE' ? 'Rejoin Video Call' : 'Join Video Call'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Review section (post-call) */}
        {isCompleted && !isTeacher && !session.review && !reviewDone && (
          <div className="glass-card p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Leave a Review
            </h2>

            {/* Star rating */}
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${star <= rating ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-slate-600'}`}
                >
                  <Star className="w-5 h-5" fill={star <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience with this session..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm resize-none mb-4"
            />

            <button
              onClick={submitReview}
              disabled={reviewComment.length < 10}
              className="px-6 py-2.5 rounded-lg btn-cyan font-medium text-sm text-slate-900 disabled:opacity-50"
            >
              Submit Review
            </button>
          </div>
        )}

        {(isCompleted && (reviewDone || session.review)) && (
          <div className="glass-card p-5 flex items-center gap-3 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm font-medium">Review submitted — thank you!</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
