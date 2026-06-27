'use client';

import React from 'react';
import { Code2, Sparkles } from 'lucide-react';

export default function Hero() {
    return (
        <div className="relative h-screen flex flex-col items-center justify-center overflow-hidden px-4">
            {/* Animated gradient background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
            </div>

            {/* Grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none opacity-30" />

            {/* Content */}
            <div className="relative z-10 max-w-4xl text-center space-y-8">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-violet-500 to-pink-500 rounded-3xl blur-2xl opacity-50 animate-pulse" />
                        <div className="relative p-4 rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl shadow-2xl">
                            <Code2 className="w-12 h-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300" />
                        </div>
                    </div>
                </div>

                {/* Badge */}
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 backdrop-blur-md">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" style={{ animationDuration: '3s' }} />
                        <span className="text-xs font-semibold text-cyan-200 tracking-widest">AI-POWERED COLLABORATION</span>
                    </div>
                </div>

                {/* Main Headline */}
                <div className="space-y-4">
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1]">
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200">
                            The Future of
                        </span>
                        <span className="block bg-gradient-to-r from-cyan-300 via-violet-400 to-pink-300 text-transparent bg-clip-text animate-gradient">
                            Collaborative Coding
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-light tracking-wide">
                        Real-time collaborative editor. Instant preview. Synchronized coding. Built for teams that move fast.
                    </p>
                </div>

                {/* CTA Button - moved to below, keep simple here */}
                <div className="flex items-center justify-center gap-4 pt-4">
                    <button className="group px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold text-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(56,189,248,0.4)] shadow-lg">
                        <span className="flex items-center gap-2">
                            Get Started Free
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                    </button>
                    <button className="px-8 py-4 rounded-full border border-white/20 text-white font-semibold text-sm hover:border-white/40 transition-all backdrop-blur-sm hover:bg-white/5">
                        Watch Demo
                    </button>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
                    <span className="text-xs text-slate-400 tracking-widest">SCROLL TO EXPLORE</span>
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
