'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
  Users, Video, Coins, Clock, Activity,
  ShieldAlert, TrendingUp, AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { apiGet } from '@/lib/api';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'USER') { router.replace('/dashboard'); return; }
    apiGet<any>('/admin/stats').then(setStats).finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  const overview = stats?.overview;
  const sessionChartData = (stats?.sessionsByDay || []).map((d: any) => ({
    day: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sessions: parseInt(d.count),
  }));

  const topSkillsData = (stats?.topSkills || []).slice(0, 8).map((s: any) => ({
    name: s.title.length > 16 ? s.title.slice(0, 16) + '…' : s.title,
    sessions: s.sessionsCount,
  }));

  const metricCards = [
    { label: 'Total Users', value: overview?.totalUsers, icon: Users, color: 'cyan', delta: `+${overview?.newUsersThisWeek} this week` },
    { label: 'Active Sessions', value: overview?.activeSessions, icon: Video, color: 'emerald', sub: 'Live now' },
    { label: 'Credits Transferred', value: overview?.creditsTransferred, icon: Coins, color: 'amber', sub: 'Last 30 days' },
    { label: 'Avg Session', value: `${overview?.avgSessionDurationMins}m`, icon: Clock, color: 'violet', sub: 'Duration' },
    { label: 'Completed', value: overview?.completedSessions, icon: TrendingUp, color: 'cyan', sub: 'All time' },
    { label: 'Pending Reports', value: overview?.pendingReports, icon: ShieldAlert, color: overview?.pendingReports > 0 ? 'red' : 'slate', sub: 'Needs review' },
  ];

  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    violet: 'text-violet-400 bg-violet-500/10',
    red: 'text-red-400 bg-red-500/10',
    slate: 'text-slate-400 bg-slate-500/10',
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and management</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {metricCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className={`w-9 h-9 rounded-lg ${colorMap[card.color]} flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${colorMap[card.color].split(' ')[0]}`} />
            </div>
            <div className="text-2xl font-bold text-white">{card.value ?? '—'}</div>
            <div className="text-sm text-muted-foreground">{card.label}</div>
            {(card.delta || card.sub) && (
              <div className="text-xs text-muted-foreground mt-0.5">{card.delta || card.sub}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Sessions over time */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="font-semibold text-white">Sessions (30 days)</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={sessionChartData}>
              <defs>
                <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#22d3ee' }}
              />
              <Area type="monotone" dataKey="sessions" stroke="#06b6d4" strokeWidth={2} fill="url(#sessionsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top skills */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h2 className="font-semibold text-white">Top Skills</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topSkillsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 8 }}
                itemStyle={{ color: '#22d3ee' }}
              />
              <Bar dataKey="sessions" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent users */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-white">Recent Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-white/5">
                <th className="text-left pb-3 font-medium">User</th>
                <th className="text-left pb-3 font-medium">Email</th>
                <th className="text-left pb-3 font-medium">Role</th>
                <th className="text-right pb-3 font-medium">Credits</th>
                <th className="text-right pb-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentUsers?.map((u: any) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-cyan-500/10 flex items-center justify-center">
                        {u.avatar
                          ? <img src={u.avatar} className="w-7 h-7 rounded-full" alt="" />
                          : <span className="text-xs font-bold text-cyan-400">{u.name[0]}</span>
                        }
                      </div>
                      <span className="text-white">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{u.email}</td>
                  <td className="py-3">
                    <span className={`skill-badge ${u.role === 'ADMIN' ? 'border-violet-500/30 bg-violet-500/10 text-violet-300' : ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-right text-amber-300 font-medium">{u.credits}</td>
                  <td className="py-3 text-right text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
