'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, ArrowRight, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  // Load saved username if present
  useEffect(() => {
    const savedName = localStorage.getItem('devspace-username');
    if (savedName) {
      setUsername(savedName);
    }
  }, []);

  // Generate a random room ID
  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomId(result);
    setError('');
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!roomId.trim()) {
      setError('Please enter or generate a Room ID.');
      return;
    }

    // Save username for future visits
    localStorage.setItem('devspace-username', username.trim());

    // Redirect to the room
    const cleanRoomId = roomId.trim().toLowerCase();
    router.push(`/room/${cleanRoomId}?username=${encodeURIComponent(username.trim())}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1020]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.18),_transparent_26%),radial-gradient(circle_at_center,_rgba(139,92,246,0.16),_transparent_26%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:70px_70px]" />
      <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-10">
        <div className="w-full max-w-xl z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-3xl mb-4 border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_40px_rgba(56,189,248,0.2)] backdrop-blur">
              <Code2 className="w-8 h-8 text-cyan-300" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-[0.2em] uppercase bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text text-transparent mb-3">
              DevSpace
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              A futuristic AI workspace for collaborative coding, instant chat, and live preview.
            </p>
          </div>

          <div className="glass-panel rounded-[32px] p-8 shadow-[0_0_70px_rgba(139,92,246,0.18)] border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.18),_transparent_45%)]" />
            <div className="absolute left-8 right-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

            <form onSubmit={handleJoin} className="space-y-6 relative">
              <div className="space-y-2">
                <label htmlFor="username" className="text-[11px] font-semibold text-slate-400 tracking-[0.25em] uppercase block">
                  Your Name
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your alias..."
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  className="glass-input rounded-2xl px-4 py-4 text-sm text-white placeholder:text-slate-500 transition duration-200 hover:border-cyan-400/40"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <label htmlFor="roomId" className="text-[11px] font-semibold text-slate-400 tracking-[0.25em] uppercase block">
                    Room ID
                  </label>
                  <button
                    type="button"
                    onClick={generateRoomId}
                    className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate new
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="roomId"
                    type="text"
                    placeholder="Enter or generate ID..."
                    value={roomId}
                    onChange={(e) => {
                      setRoomId(e.target.value);
                      setError('');
                    }}
                    className="glass-input rounded-2xl pl-4 pr-11 py-4 text-sm text-white placeholder:text-slate-500 font-mono transition duration-200 hover:border-cyan-400/40"
                    maxLength={16}
                  />
                  <button
                    type="button"
                    onClick={generateRoomId}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 transition"
                    title="Regenerate Room ID"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-400/20 p-3 rounded-2xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="group w-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-6 py-4 text-sm font-semibold text-white shadow-[0_0_40px_rgba(139,92,246,0.3)] transition duration-300 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(56,189,248,0.35)]"
              >
                <span className="inline-flex items-center gap-2">
                  <span>Enter Playground</span>
                  <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" />
                </span>
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500 mt-8 tracking-[0.2em] uppercase">
            Built with Next.js, Socket.io, and Monaco Editor.
          </p>
        </div>
      </div>
    </div>
  );
}
