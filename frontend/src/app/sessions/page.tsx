'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Video, Clock, Calendar, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export default function SessionsPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    setLoading(true);
    const params: any = { limit: 30 };
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (roleFilter === 'TEACHER') params.role = 'teacher';
    if (roleFilter === 'LEARNER') params.role = 'learner';

    apiGet<any>('/sessions', params)
      .then((d) => { setSessions(d.sessions); setTotal(d.total); })
      .finally(() => setLoading(false));
  }, [statusFilter, roleFilter]);

  const statusIcon: Record<string, React.ReactNode> = {
    PENDING: <Clock className="w-4 h-4 text-slate-400" />,
    CONFIRMED: <CheckCircle className="w-4 h-4 text-cyan-400" />,
    ACTIVE: <Video className="w-4 h-4 text-emerald-400 animate-pulse" />,
    COMPLETED: <CheckCircle className="w-4 h-4 text-slate-400" />,
    CANCELLED: <XCircle className="w-4 h-4 text-red-400" />,
    NO_SHOW: <AlertCircle className="w-4 h-4 text-amber-400" />,
  };

  const statusColor: Record<string, string> = {
    PENDING: 'text-slate-400 bg-slate-500/10',
    CONFIRMED: 'text-cyan-400 bg-cyan-500/10',
    ACTIVE: 'text-emerald-400 bg-emerald-500/10',
    COMPLETED: 'text-slate-400 bg-slate-500/10',
    CANCELLED: 'text-red-400 bg-red-500/10',
    NO_SHOW: 'text-amber-400 bg-amber-500/10',
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Sessions</h1>
          <p className="text-muted-foreground mt-0.5">{total} sessions total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10'
                )}
              >
                {s === 'ALL' ? 'All Status' : s[0] + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="w-px bg-white/10 self-stretch" />

          {/* Role filter */}
          {['ALL', 'TEACHER', 'LEARNER'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                roleFilter === r
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10'
              )}
            >
              {r === 'ALL' ? 'All Roles' : r[0] + r.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-white mb-2">No sessions found</p>
          <p className="text-muted-foreground text-sm mb-6">Book a session to start learning, or list a skill to start teaching.</p>
          <Link href="/skills" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg btn-cyan text-sm font-semibold text-slate-900">
            Browse Skills
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const isTeacher = session.teacherId === user?.id;
            const peer = isTeacher ? session.learner : session.teacher;
            const scheduledAt = new Date(session.scheduledAt);
            const isLive = session.status === 'ACTIVE';

            return (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="glass-card p-5 hover:border-cyan-500/20 transition-all duration-200 flex items-center gap-4 group block"
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {statusIcon[session.status]}
                </div>

                {/* Session info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {session.skill.title}
                    </h3>
                    {isLive && (
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isTeacher ? 'Teaching' : 'Learning from'}{' '}
                    <span className="text-slate-300">{peer.name}</span>
                    {' · '}
                    <span className="text-slate-400 skill-badge" style={{ padding: '1px 6px' }}>{session.skill.category}</span>
                  </p>
                </div>

                {/* Date/time */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium text-white">
                    {scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {session.durationSecs && (
                    <p className="text-xs text-cyan-400 mt-0.5">{formatDuration(session.durationSecs)}</p>
                  )}
                </div>

                {/* Status badge */}
                <div className={cn('flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium', statusColor[session.status])}>
                  {session.status[0] + session.status.slice(1).toLowerCase()}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
