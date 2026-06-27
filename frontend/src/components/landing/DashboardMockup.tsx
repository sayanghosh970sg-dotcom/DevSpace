'use client';

import React from 'react';
import { Code2, Users, MessageSquare, Play, Copy } from 'lucide-react';

export default function DashboardMockup() {
    return (
        <section className="relative py-24 px-4 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-300">
                            Experience the Dashboard
                        </span>
                    </h2>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        A modern interface designed for maximum productivity and seamless collaboration
                    </p>
                </div>

                {/* Dashboard Mockup */}
                <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-1 shadow-2xl group hover:border-white/20 transition-all duration-300">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-violet-500/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />

                    <div className="relative bg-[#0b0e1a] rounded-2xl overflow-hidden">
                        {/* Header */}
                        <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-gradient-to-r from-white/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <Code2 className="w-5 h-5 text-cyan-400" />
                                <span className="text-sm font-bold text-white tracking-wider">DEVSPACE</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button className="p-2 rounded-lg hover:bg-white/10 transition text-slate-400 hover:text-white">
                                    <Users className="w-4 h-4" />
                                </button>
                                <button className="p-2 rounded-lg hover:bg-white/10 transition text-slate-400 hover:text-white">
                                    <MessageSquare className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Content area */}
                        <div className="flex h-96">
                            {/* Left sidebar */}
                            <div className="w-64 border-r border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4 space-y-4 overflow-hidden">
                                <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-slate-500 tracking-wider px-2">ACTIVE USERS</div>
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                style={{
                                                    backgroundColor: [
                                                        'rgba(56, 189, 248, 0.3)',
                                                        'rgba(139, 92, 246, 0.3)',
                                                        'rgba(236, 72, 153, 0.3)',
                                                    ][i - 1],
                                                    borderColor: [
                                                        'rgb(56, 189, 248)',
                                                        'rgb(139, 92, 246)',
                                                        'rgb(236, 72, 153)',
                                                    ][i - 1],
                                                    borderWidth: '1px',
                                                }}
                                            >
                                                U{i}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-white truncate">User {i}</div>
                                                <div className="text-[10px] text-slate-400">Online</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-px bg-white/10" />

                                <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-slate-500 tracking-wider px-2">CHAT</div>
                                    <div className="space-y-2 max-h-32 overflow-hidden">
                                        {[1, 2].map((i) => (
                                            <div key={i} className="text-xs text-slate-300 px-2">
                                                <div className="font-semibold text-cyan-300">User {i}</div>
                                                <div className="text-slate-400">Great progress!</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Editor area */}
                            <div className="flex-1 flex flex-col">
                                {/* Tab bar */}
                                <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-white/[0.02]">
                                    {['HTML', 'CSS', 'JS'].map((tab, idx) => (
                                        <button
                                            key={tab}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${idx === 0
                                                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/40'
                                                    : 'text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                {/* Code display */}
                                <div className="flex-1 overflow-hidden p-6 font-mono text-sm text-slate-300 space-y-2">
                                    <div className="text-amber-300">&lt;div class=<span className="text-green-300">"container"</span>&gt;</div>
                                    <div className="ml-4 text-slate-300">
                                        &lt;h1&gt;<span className="text-pink-300">Welcome to DevSpace</span>&lt;/h1&gt;
                                    </div>
                                    <div className="ml-4 text-slate-300">
                                        &lt;p&gt;<span className="text-slate-400">Collaborate in real-time</span>&lt;/p&gt;
                                    </div>
                                    <div className="text-amber-300">&lt;/div&gt;</div>
                                </div>
                            </div>

                            {/* Preview area */}
                            <div className="w-48 border-l border-white/10 flex flex-col bg-gradient-to-b from-white/5 to-transparent">
                                <div className="h-10 border-b border-white/10 flex items-center gap-2 px-4 text-xs font-semibold text-slate-300">
                                    <Play className="w-3.5 h-3.5 text-cyan-400" />
                                    Preview
                                </div>
                                <div className="flex-1 p-4 overflow-hidden flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-white mb-2">Welcome to DevSpace</div>
                                        <div className="text-xs text-slate-400">Collaborate in real-time</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="h-10 border-t border-white/10 flex items-center justify-between px-6 bg-white/[0.02]">
                            <div className="text-xs text-slate-500">Connected • Synced</div>
                            <div className="flex items-center gap-2">
                                <button className="p-1.5 rounded-lg hover:bg-white/10 transition text-slate-400 hover:text-white">
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
