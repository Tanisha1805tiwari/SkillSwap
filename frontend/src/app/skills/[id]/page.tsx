'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, Clock, Users, Coins, Calendar, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const [skill, setSkill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    apiGet<any>(`/skills/${id}`).then((d) => setSkill(d.skill)).finally(() => setLoading(false));
  }, [id]);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return;
    setBooking(true);
    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      const result = await apiPost<any>('/sessions', {
        skillId: id,
        scheduledAt,
        notes,
        creditAmount: 1,
      });
      setBooked(true);
      setTimeout(() => router.push(`/sessions/${result.session.id}`), 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!skill) return (
    <DashboardLayout>
      <p className="text-muted-foreground text-center py-16">Skill not found</p>
    </DashboardLayout>
  );

  const isOwnSkill = skill.teacherId === user?.id;
  const levelColors: Record<string, string> = {
    BEGINNER: 'text-emerald-400 bg-emerald-500/10',
    INTERMEDIATE: 'text-amber-400 bg-amber-500/10',
    ADVANCED: 'text-orange-400 bg-orange-500/10',
    EXPERT: 'text-red-400 bg-red-500/10',
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <Link href="/skills" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Skills
        </Link>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2 space-y-5">
            {/* Header */}
            <div className="glass-card p-6">
              <div className="flex gap-2 mb-3">
                <span className="skill-badge">{skill.category}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', levelColors[skill.level])}>
                  {skill.level[0] + skill.level.slice(1).toLowerCase()}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">{skill.title}</h1>
              <p className="text-muted-foreground leading-relaxed">{skill.description}</p>

              {skill.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {skill.tags.map((tag: string) => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-md bg-white/5 text-slate-400">#{tag}</span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/5">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{skill.sessionsCount}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-amber-400 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4" />{skill.rating?.toFixed(1) || '—'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-amber-300">1</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Credit/session</div>
                </div>
              </div>
            </div>

            {/* Teacher */}
            <div className="glass-card p-6">
              <h2 className="font-semibold text-white mb-4">About the Teacher</h2>
              <Link href={`/profile/${skill.teacher.id}`} className="flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  {skill.teacher.avatar
                    ? <img src={skill.teacher.avatar} className="w-12 h-12 rounded-full" alt="" />
                    : <span className="text-lg font-bold text-cyan-400">{skill.teacher.name[0]}</span>
                  }
                </div>
                <div>
                  <p className="font-medium text-white group-hover:text-cyan-300 transition-colors">{skill.teacher.name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{skill.teacher.bio || 'No bio provided'}</p>
                </div>
              </Link>
            </div>

            {/* Recent reviews */}
            {skill.sessions?.some((s: any) => s.review) && (
              <div className="glass-card p-6">
                <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Student Reviews
                </h2>
                <div className="space-y-4">
                  {skill.sessions
                    .filter((s: any) => s.review)
                    .map((s: any) => (
                      <div key={s.id} className="pb-4 border-b border-white/5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            {s.learner.avatar
                              ? <img src={s.learner.avatar} className="w-7 h-7 rounded-full" alt="" />
                              : <span className="text-xs font-bold text-cyan-400">{s.learner.name[0]}</span>
                            }
                          </div>
                          <span className="text-sm font-medium text-white">{s.learner.name}</span>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < s.review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{s.review.comment}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking sidebar */}
          <div>
            <div className="glass-card p-5 sticky top-6">
              {booked ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="font-semibold text-white mb-1">Session Booked!</p>
                  <p className="text-sm text-muted-foreground">Redirecting to your session...</p>
                </div>
              ) : isOwnSkill ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">This is your skill listing.</p>
                  <Link href={`/skills/${id}/edit`} className="mt-3 inline-flex items-center gap-1 text-cyan-400 text-sm hover:text-cyan-300">
                    Edit listing
                  </Link>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-white mb-4">Book a Session</h3>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        min={minDateStr}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Time</label>
                      <input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Notes (optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What do you want to focus on?"
                        rows={2}
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Credit info */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-4">
                    <span className="text-sm text-muted-foreground">Cost</span>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-300">
                      <Coins className="w-4 h-4" />
                      1 credit
                    </div>
                  </div>

                  {user && user.credits < 1 && (
                    <p className="text-xs text-red-400 mb-3">Insufficient credits. You need at least 1 credit to book.</p>
                  )}

                  <button
                    onClick={handleBook}
                    disabled={booking || !selectedDate || !selectedTime || (user?.credits ?? 0) < 1}
                    className="w-full py-3 rounded-lg btn-cyan font-semibold text-slate-900 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    Book Session
                  </button>

                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Credit charged only if session runs 5+ minutes
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
