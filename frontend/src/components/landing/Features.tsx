'use client';

import React from 'react';
import {
    Zap,
    Users,
    Eye,
    MessageSquare,
    Share2,
    Lock,
} from 'lucide-react';

const features = [
    {
        icon: Zap,
        title: 'Instant Sync',
        description: 'Code changes propagate in milliseconds across all collaborators in real-time.',
        color: 'from-cyan-500 to-blue-500',
        index: 0,
    },
    {
        icon: Users,
        title: 'Live Cursors',
        description: 'See exactly where your teammates are typing with color-coded cursor positions.',
        color: 'from-violet-500 to-purple-500',
        index: 1,
    },
    {
        icon: Eye,
        title: 'Live Preview',
        description: 'Watch HTML, CSS, and JavaScript render in real-time as you code.',
        color: 'from-pink-500 to-rose-500',
        index: 2,
    },
    {
        icon: MessageSquare,
        title: 'Integrated Chat',
        description: 'Collaborate with built-in messaging. No context switching needed.',
        color: 'from-amber-500 to-orange-500',
        index: 3,
    },
    {
        icon: Share2,
        title: 'Easy Sharing',
        description: 'Generate shareable room links. Invite collaborators with one click.',
        color: 'from-green-500 to-emerald-500',
        index: 4,
    },
    {
        icon: Lock,
        title: 'Secure Sessions',
        description: 'Encrypted sessions and unique room IDs keep your code collaboration private.',
        color: 'from-indigo-500 to-blue-500',
        index: 5,
    },
];

export default function Features() {
    return (
        <section className="relative py-24 px-4 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-0 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-20 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-300">
                            Powerful Features
                        </span>
                    </h2>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Everything you need for seamless real-time collaborative coding
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => {
                        const Icon = feature.icon;
                        const delay = idx * 100;
                        return (
                            <div
                                key={feature.title}
                                className="group relative"
                                style={{
                                    animation: `fadeInUp 0.6s ease-out ${delay}ms both`,
                                }}
                            >
                                {/* Floating animation */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{
                                        animation: `float 3s ease-in-out ${delay}ms infinite`,
                                    }}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity`} />
                                </div>

                                {/* Card */}
                                <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8 transition-all duration-300 hover:border-white/30 hover:bg-white/10 group-hover:shadow-[0_0_40px_rgba(56,189,248,0.2)]">
                                    {/* Icon container */}
                                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-6 transition-transform duration-300 group-hover:scale-110`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">{feature.description}</p>

                                    {/* Accent line */}
                                    <div className={`absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r ${feature.color} rounded-full group-hover:w-full transition-all duration-500`} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
        </section>
    );
}
