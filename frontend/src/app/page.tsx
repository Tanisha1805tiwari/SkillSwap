import Link from 'next/link';
import { Video, Users, Star, Zap, Shield, Globe, ArrowRight, CheckCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background bg-grid overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-cyan-500/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-xl font-bold text-gradient-cyan">SkillSwap</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="px-4 py-2 text-sm text-cyan-300 hover:text-cyan-100 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/register" className="px-4 py-2 text-sm rounded-lg btn-cyan">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 text-center relative">
        {/* Glow orb */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-sm font-medium mb-6 animate-slide-up">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Live HD video sessions with screen sharing
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <span className="text-white">Swap Skills,</span>
            <br />
            <span className="text-gradient-cyan">Grow Together</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Exchange expertise through live video sessions. Teach what you know, learn what you need.
            No money — just skills.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl btn-cyan text-lg"
            >
              Start Swapping Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl btn-cyan-outline text-lg"
            >
              Browse Skills
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
            {[
              { value: '5K+', label: 'Active Users' },
              { value: '50+', label: 'Skill Categories' },
              { value: '4.9★', label: 'Average Rating' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold neon-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything you need to{' '}
              <span className="text-gradient-cyan">learn and teach</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Professional-grade video sessions with all the tools you need
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={f.title} className="glass-card p-6 group hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                  <f.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 border-t border-cyan-500/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-12">How SkillSwap Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg mb-4">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Start with 5 free credits
            </h2>
            <p className="text-muted-foreground mb-8">
              Sign up today and get 5 credits to book your first sessions immediately.
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-8">
              {['No credit card required', 'HD video with screen sharing', 'Smart skill matching'].map(item => (
                <div key={item} className="flex items-center gap-2 justify-center">
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl btn-cyan text-lg">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cyan-500/10 py-8 px-4 text-center text-muted-foreground text-sm">
        <p>© 2025 SkillSwap. Built for lifelong learners.</p>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Video,
    title: 'HD Video Calls',
    description: 'Crystal-clear peer-to-peer video with WebRTC. No lag, no intermediary servers.',
  },
  {
    icon: Globe,
    title: 'Screen Sharing',
    description: 'Share your screen, walk through code, design files, or presentations in real time.',
  },
  {
    icon: Users,
    title: 'Smart Matching',
    description: 'Our algorithm connects you with users whose skills complement yours perfectly.',
  },
  {
    icon: Zap,
    title: 'Credit System',
    description: 'Earn credits by teaching. Spend credits to learn. A fair, balanced exchange.',
  },
  {
    icon: Star,
    title: 'Reviews & Ratings',
    description: 'Build your reputation. Quality teachers attract more learners.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'End-to-end encrypted video. Your sessions stay between you and your peer.',
  },
];

const steps = [
  {
    title: 'List your skills',
    description: 'Tell us what you can teach. Add a description, your level, and availability.',
  },
  {
    title: 'Get matched & book',
    description: 'Find someone who has what you need. Book a session with one click.',
  },
  {
    title: 'Join the live session',
    description: 'Connect via HD video. Share your screen. Teach, learn, and grow.',
  },
];
