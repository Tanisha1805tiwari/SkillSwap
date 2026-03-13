'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

const CATEGORIES = [
  'Programming', 'Design', 'Music', 'Language', 'Business',
  'Marketing', 'Photography', 'Writing', 'Cooking', 'Fitness',
  'Mathematics', 'Science', 'Art', 'Finance', 'Other',
];

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', desc: 'Suitable for complete beginners' },
  { value: 'INTERMEDIATE', label: 'Intermediate', desc: 'Some prior knowledge helpful' },
  { value: 'ADVANCED', label: 'Advanced', desc: 'Significant experience required' },
  { value: 'EXPERT', label: 'Expert', desc: 'Professional or master-level' },
];

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  category: z.string().min(1, 'Category is required'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
});

type FormData = z.infer<typeof schema>;

export default function NewSkillPage() {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { level: 'BEGINNER' },
  });

  const selectedLevel = watch('level');

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError('');
    try {
      const result = await apiPost<any>('/skills', { ...data, tags });
      router.push(`/skills/${result.skill.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create skill');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Link href="/skills" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to skills
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">List a New Skill</h1>
          <p className="text-muted-foreground mt-1">Share your expertise and start earning credits</p>
        </div>

        <div className="glass-card p-8">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Skill Title <span className="text-red-400">*</span>
              </label>
              <input
                {...register('title')}
                placeholder="e.g. React & TypeScript for Beginners"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
              />
              {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Describe what you'll teach, your experience, and what learners can expect..."
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors resize-none"
              />
              {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>}
            </div>

            {/* Category + Level */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  {...register('category')}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="mt-1 text-xs text-red-400">{errors.category.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Skill Level <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {LEVELS.map((l) => (
                    <label
                      key={l.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors text-xs ${
                        selectedLevel === l.value
                          ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                          : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20'
                      }`}
                    >
                      <input {...register('level')} type="radio" value={l.value} className="sr-only" />
                      <span className="font-medium">{l.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Tags <span className="text-slate-500">(optional, up to 10)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="e.g. react, typescript, hooks"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm transition-colors"
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={tags.length >= 10}
                  className="px-3 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs border border-cyan-500/20">
                      #{tag}
                      <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Info box */}
            <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-sm text-muted-foreground">
              <p className="font-medium text-cyan-300 mb-1">How it works</p>
              <p>You'll earn <span className="text-amber-300">1 credit per session</span>. Sessions under 5 minutes don't count. You can have up to 10 active skills at once.</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg btn-cyan font-semibold text-slate-900 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Publish Skill Listing
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
