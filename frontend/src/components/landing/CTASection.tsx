'use client';

import React from 'react';
import { ArrowRight, Zap } from 'lucide-react';

export default function CTASection({ onStartClick }: { onStartClick: () => void }) {
    return (
        <section className="relative py-32 px-4 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto">
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-xl p-1 overflow-hidden">
                    {/* Gradient line at top */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

                    <div className="rounded-2xl bg-[#0b0e1a] p-12 md:p-16 text-center space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 mx-auto">
                            <Zap className="w-4 h-4 text-cyan-300" />
                            <span className="text-xs font-semibold text-cyan-200 tracking-widest">LIMITED TIME</span>
                        </div>

                        {/* Headline */}
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-5xl font-black leading-tight">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300">
                                    Start Collaborating Today
                                </span>
                            </h2>
                            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                                No credit card required. No installation needed. Launch a collaborative workspace in seconds.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <button
                                onClick={onStartClick}
                                className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 text-white font-bold text-base transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(56,189,248,0.3)] hover:shadow-[0_0_50px_rgba(56,189,248,0.5)]"
                            >
                                <span className="flex items-center gap-2">
                                    Enter Playground
                                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </span>
                            </button>

                            <a
                                href="#features"
                                className="px-8 py-4 rounded-full border border-white/20 text-white font-semibold text-base hover:border-white/40 transition-all backdrop-blur-sm hover:bg-white/5"
                            >
                                Learn More
                            </a>
                        </div>

                        {/* Trust badges */}
                        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-8 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span>Instant Setup</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span>Real-time Sync</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span>Forever Free</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
