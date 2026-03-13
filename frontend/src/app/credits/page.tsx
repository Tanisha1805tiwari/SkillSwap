'use client';

import { useEffect, useState } from 'react';
import { Coins, TrendingUp, TrendingDown, Gift, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { cn } from '@/lib/utils';

const TX_ICONS: Record<string, React.ReactNode> = {
  SIGNUP_BONUS: <Gift className="w-4 h-4 text-cyan-400" />,
  SESSION_EARNED: <ArrowUpRight className="w-4 h-4 text-emerald-400" />,
  SESSION_SPENT: <ArrowDownRight className="w-4 h-4 text-red-400" />,
  REFUND: <ArrowUpRight className="w-4 h-4 text-amber-400" />,
  ADMIN_ADJUSTMENT: <Coins className="w-4 h-4 text-violet-400" />,
  PURCHASE: <ArrowUpRight className="w-4 h-4 text-cyan-400" />,
};

export default function CreditsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<any>('/credits').then(setData).finally(() => setLoading(false));
  }, []);

  const earned = data?.transactions.filter((t: any) => t.amount > 0)
    .reduce((sum: number, t: any) => sum + t.amount, 0) ?? 0;
  const spent = data?.transactions.filter((t: any) => t.amount < 0)
    .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0) ?? 0;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Credits</h1>
        <p className="text-muted-foreground mt-0.5">Your SkillSwap credit balance and history</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 col-span-1 border-glow-cyan">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Current Balance</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="text-4xl font-bold text-amber-300">{data?.balance ?? user?.credits ?? 0}</div>
          <div className="text-sm text-muted-foreground mt-1">credits available</div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Total Earned</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400">+{earned}</div>
          <div className="text-sm text-muted-foreground mt-1">from teaching</div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Total Spent</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-red-400">-{spent}</div>
          <div className="text-sm text-muted-foreground mt-1">on learning</div>
        </div>
      </div>

      {/* How credits work */}
      <div className="glass-card p-5 mb-6">
        <h2 className="font-semibold text-white mb-3">How Credits Work</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <Gift className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">5 Free on Signup</p>
              <p>Every new account gets 5 free credits to start learning immediately.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <ArrowUpRight className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">Earn by Teaching</p>
              <p>Complete a 5+ minute session as teacher and receive 1 credit from your learner.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <ArrowDownRight className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white">Spend to Learn</p>
              <p>Book any session for 1 credit. Credit is only charged after 5+ minutes.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-5">Transaction History</h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data?.transactions.length ? (
          <p className="text-muted-foreground text-sm text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-1">
            {data.transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  {TX_ICONS[tx.type] || <Coins className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{tx.description}</p>
                  {tx.session && (
                    <p className="text-xs text-muted-foreground truncate">{tx.session.title}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn('text-sm font-semibold', tx.amount > 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
