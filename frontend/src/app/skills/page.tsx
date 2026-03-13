'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Star, Users, Filter, Coins, ChevronDown } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'sessions', label: 'Most Popular' },
];

export default function SkillsPage() {
  const { user } = useAuthStore();
  const [skills, setSkills] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [sort, setSort] = useState('createdAt');

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<any>('/skills', { q, category, level, sort, page, limit: 12 });
      setSkills(page === 1 ? data.skills : (prev: any) => [...prev, ...data.skills]);
      setTotal(data.total);
      setCategories(data.categories || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [q, category, level, sort, page]);

  useEffect(() => { setPage(1); }, [q, category, level, sort]);
  useEffect(() => { fetchSkills(); }, [q, category, level, sort, page]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Browse Skills</h1>
          <p className="text-muted-foreground mt-0.5">{total} skills available to learn</p>
        </div>
        <Link href="/skills/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg btn-cyan text-sm font-semibold text-slate-900">
          + List a Skill
        </Link>
      </div>

      {/* Search + filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills, topics, or teachers..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm transition-colors"
            />
          </div>

          {/* Category filter */}
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer min-w-[140px]"
            >
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Level filter */}
          <div className="relative">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              <option value="">All Levels</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l[0] + l.slice(1).toLowerCase()}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Active filter chips */}
        {(category || level) && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {category && (
              <button onClick={() => setCategory('')} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs border border-cyan-500/20 hover:bg-cyan-500/20">
                {category} ×
              </button>
            )}
            {level && (
              <button onClick={() => setLevel('')} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs border border-cyan-500/20 hover:bg-cyan-500/20">
                {level[0] + level.slice(1).toLowerCase()} ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* Skill grid */}
      {loading && page === 1 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-2/3 mb-3" />
              <div className="h-3 bg-white/5 rounded w-full mb-2" />
              <div className="h-3 bg-white/5 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-white mb-2">No skills found</p>
          <p className="text-muted-foreground">Try adjusting your filters or be the first to list this skill!</p>
          <Link href="/skills/new" className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg btn-cyan text-sm font-semibold text-slate-900">
            List a Skill
          </Link>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {skills.map((skill) => <SkillCard key={skill.id} skill={skill} currentUserId={user?.id} />)}
          </div>

          {skills.length < total && (
            <div className="text-center mt-8">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="px-8 py-3 rounded-lg btn-cyan-outline text-sm font-medium"
              >
                {loading ? 'Loading...' : `Load more (${total - skills.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function SkillCard({ skill, currentUserId }: { skill: any; currentUserId?: string }) {
  const levelColors: Record<string, string> = {
    BEGINNER: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    INTERMEDIATE: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    ADVANCED: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    EXPERT: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <Link href={`/skills/${skill.id}`} className="glass-card p-5 hover:border-cyan-500/30 transition-all duration-300 group block">
      {/* Category + Level */}
      <div className="flex items-center justify-between mb-3">
        <span className="skill-badge">{skill.category}</span>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', levelColors[skill.level] || 'skill-badge')}>
          {skill.level[0] + skill.level.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors mb-2 line-clamp-2">
        {skill.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{skill.description}</p>

      {/* Tags */}
      {skill.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {skill.tags.slice(0, 3).map((tag: string) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-400">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Teacher info + stats */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-cyan-500/10 flex items-center justify-center">
            {skill.teacher.avatar
              ? <img src={skill.teacher.avatar} className="w-7 h-7 rounded-full" alt="" />
              : <span className="text-xs font-bold text-cyan-400">{skill.teacher.name[0]}</span>
            }
          </div>
          <span className="text-sm text-muted-foreground">{skill.teacher.name}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {skill.rating > 0 && (
            <span className="flex items-center gap-0.5 text-amber-400">
              <Star className="w-3 h-3" /> {skill.rating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-amber-400" /> 1 credit
          </span>
        </div>
      </div>
    </Link>
  );
}
