'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Video, Star, Coins, Calendar, TrendingUp, Plus,
  ArrowRight, Clock, CheckCircle, AlertCircle, Users
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { apiGet } from '@/lib/api';
import { formatDuration, formatRelative } from '@/lib/utils';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

interface DashboardData {
  upcomingSessions: any[];
  recentSessions: any[];
  stats: {
    totalSessions: number;
    hoursTeached: number;
    hoursLearned: number;
    avgRating: number;
  };
  matches: any[];
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    loadDashboard();
  }, [isAuthenticated]);

  const loadDashboard = async () => {
    try {
      const [sessions, matches] = await Promise.all([
        apiGet<any>('/sessions?limit=10'),
        apiGet<any>('/skills/matches'),
      ]);

      const upcoming = sessions.sessions.filter((s: any) =>
        ['PENDING', 'CONFIRMED'].includes(s.status) && new Date(s.scheduledAt) > new Date()
      );
      const recent = sessions.sessions.filter((s: any) =>
        ['COMPLETED', 'CANCELLED'].includes(s.status)
      ).slice(0, 5);

      const completed = sessions.sessions.filter((s: any) => s.status === 'COMPLETED');
      const taught = completed.filter((s: any) => s.teacherId === user?.id);
      const learned = completed.filter((s: any) => s.learnerId === user?.id);

      setData({
        upcomingSessions: upcoming,
        recentSessions: recent,
        matches: matches.matches?.slice(0, 4) || [],
        stats: {
          totalSessions: completed.length,
          hoursTeached: taught.reduce((sum: number, s: any) => sum + (s.durationSecs || 0), 0),
          hoursLearned: learned.reduce((sum: number, s: any) => sum + (s.durationSecs || 0), 0),
          avgRating: 4.8,
        },
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  const statsConfig = [
    { label: 'Credits', value: user?.credits ?? 0, icon: Coins, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Sessions', value: data?.stats.totalSessions ?? 0, icon: Video, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Hours Taught', value: Math.round((data?.stats.hoursTeached ?? 0) / 3600), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Hours Learned', value: Math.round((data?.stats.hoursLearned ?? 0) / 3600), icon: Clock, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  ];

  return (
    <DashboardLayout>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, <span className="text-gradient-cyan">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your skill exchanges.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsConfig.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming sessions */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Upcoming Sessions
            </h2>
            <Link href="/sessions" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {data?.upcomingSessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No upcoming sessions</p>
              <Link href="/skills" className="mt-3 inline-flex items-center gap-1 text-cyan-400 text-sm hover:text-cyan-300">
                Browse skills to book one <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} currentUserId={user?.id} />
              ))}
            </div>
          )}
        </div>

        {/* Quick actions + Matches */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/skills/new" className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">List a new skill</span>
              </Link>
              <Link href="/skills" className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
                <Users className="w-4 h-4" />
                <span className="text-sm">Find skills to learn</span>
              </Link>
              <Link href={`/profile/${user?.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
                <Star className="w-4 h-4" />
                <span className="text-sm">View my profile</span>
              </Link>
            </div>
          </div>

          {/* Smart matches */}
          {(data?.matches.length ?? 0) > 0 && (
            <div className="glass-card p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Matched for you
              </h2>
              <div className="space-y-3">
                {data?.matches.map((skill) => (
                  <Link key={skill.id} href={`/skills/${skill.id}`}
                    className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-cyan-400">{skill.category[0]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors truncate">{skill.title}</p>
                      <p className="text-xs text-muted-foreground">{skill.teacher.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function SessionCard({ session, currentUserId }: { session: any; currentUserId?: string }) {
  const isTeacher = session.teacherId === currentUserId;
  const peer = isTeacher ? session.learner : session.teacher;
  const scheduledAt = new Date(session.scheduledAt);
  const isToday = scheduledAt.toDateString() === new Date().toDateString();

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
      <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
        {peer.avatar
          ? <img src={peer.avatar} className="w-10 h-10 rounded-full" alt={peer.name} />
          : <span className="text-sm font-bold text-cyan-400">{peer.name[0]}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{session.skill.title}</p>
        <p className="text-xs text-muted-foreground">
          {isTeacher ? 'Teaching' : 'Learning from'} {peer.name}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-xs font-medium ${isToday ? 'text-cyan-400' : 'text-muted-foreground'}`}>
          {isToday ? 'Today' : scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
        <p className="text-xs text-muted-foreground">
          {scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {session.videoRoom && (
        <Link href={`/sessions/${session.id}`}
          className="ml-2 p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors opacity-0 group-hover:opacity-100">
          <Video className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
