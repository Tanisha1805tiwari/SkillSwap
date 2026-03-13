'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, Video, Calendar, Edit3, MapPin } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isOwn = currentUser?.id === id;

  useEffect(() => {
    apiGet<any>(`/users/${id}`).then((d) => setProfile(d.user)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!profile) return (
    <DashboardLayout>
      <p className="text-muted-foreground text-center py-16">User not found</p>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Profile header */}
        <div className="glass-card p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              {profile.avatar
                ? <img src={profile.avatar} className="w-20 h-20 rounded-2xl object-cover" alt={profile.name} />
                : <span className="text-3xl font-bold text-cyan-400">{profile.name[0]}</span>
              }
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    {profile.avgRating > 0 && (
                      <span className="flex items-center gap-1 text-sm text-amber-400">
                        <Star className="w-4 h-4 fill-amber-400" />
                        {profile.avgRating.toFixed(1)} rating
                      </span>
                    )}
                    {profile.timezone && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {profile.timezone}
                      </span>
                    )}
                  </div>
                </div>
                {isOwn && (
                  <Link href="/settings" className="flex items-center gap-1.5 px-3 py-2 rounded-lg btn-cyan-outline text-sm">
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </Link>
                )}
              </div>

              {profile.bio && (
                <p className="text-muted-foreground mt-3 leading-relaxed">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="flex gap-6 mt-4 pt-4 border-t border-white/5">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{profile._count?.sessionsAsTeacher || 0}</div>
                  <div className="text-xs text-muted-foreground">Sessions Taught</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{profile._count?.reviewsReceived || 0}</div>
                  <div className="text-xs text-muted-foreground">Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{profile.skillsOffered?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Skills Listed</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Member since</div>
                  <div className="text-sm font-medium text-white">
                    {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills offered */}
        {profile.skillsOffered?.length > 0 && (
          <div className="glass-card p-6 mb-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Video className="w-4 h-4 text-cyan-400" />
              Skills Offered
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {profile.skillsOffered.map((skill: any) => (
                <Link key={skill.id} href={`/skills/${skill.id}`}
                  className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-white group-hover:text-cyan-300 transition-colors text-sm">
                      {skill.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="skill-badge text-xs">{skill.category}</span>
                    <span className="text-xs text-muted-foreground">{skill._count?.sessions || 0} sessions</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {profile.reviewsReceived?.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Reviews ({profile.reviewsReceived.length})
            </h2>
            <div className="space-y-4">
              {profile.reviewsReceived.map((review: any) => (
                <div key={review.id} className="pb-4 border-b border-white/5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center">
                      {review.author.avatar
                        ? <img src={review.author.avatar} className="w-8 h-8 rounded-full" alt="" />
                        : <span className="text-xs font-bold text-cyan-400">{review.author.name[0]}</span>
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{review.author.name}</p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn('w-3 h-3', i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600')} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
