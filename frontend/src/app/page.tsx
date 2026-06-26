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
    <div className="relative min-h-screen overflow-hidden bg-[#121212]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(30,215,96,0.16)_0%,_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(30,215,96,0.12)_0%,_transparent_24%)]" />
      <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-10">
        <div className="w-full max-w-xl z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-3xl bg-[#1f1f1f] border border-white/10 mb-4 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.8)]">
              <Code2 className="w-8 h-8 text-[#1ed760]" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">DevSpace</h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Real-time collaborative developer playground. Code, chat, and preview live.
            </p>
          </div>

          <div className="glass-panel rounded-[32px] p-8 shadow-[0_35px_90px_-40px_rgba(0,0,0,0.8)] border border-white/10 relative overflow-hidden">
            <div className="absolute left-8 right-8 top-0 h-1 rounded-full bg-gradient-to-r from-[#1ed760] via-transparent to-[#1ed760]/0 opacity-80" />

            <form onSubmit={handleJoin} className="space-y-6 relative">
              <div className="space-y-2">
                <label htmlFor="username" className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                  Your Name
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your nickname..."
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  className="glass-input rounded-3xl px-4 py-4 text-sm text-white placeholder:text-slate-500"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <label htmlFor="roomId" className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                    Room ID
                  </label>
                  <button
                    type="button"
                    onClick={generateRoomId}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-[#1ed760] hover:bg-[#1ed760]/10 transition"
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
                    className="glass-input rounded-3xl pl-4 pr-11 py-4 text-sm text-white placeholder:text-slate-500 font-mono"
                    maxLength={16}
                  />
                  <button
                    type="button"
                    onClick={generateRoomId}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    title="Regenerate Room ID"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-3xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-full bg-[#1ed760] px-6 py-4 text-sm font-semibold text-[#081f12] shadow-[0_20px_50px_-30px_rgba(30,215,96,0.6)] transition hover:bg-[#28e673]"
              >
                <span>Enter Playground</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500 mt-8">
            Built with Next.js, Socket.io, and Monaco Editor.
          </p>
        </div>
      </div>
    </div>
  );
}
