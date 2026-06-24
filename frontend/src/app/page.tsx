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
    <div className="flex flex-col items-center justify-center min-h-screen px-4 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4 animate-pulse">
            <Code2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-emerald-200 to-emerald-100 bg-clip-text text-transparent mb-2">
            DevSpace
          </h1>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Real-time collaborative developer playground. Code, chat, and preview live.
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          <form onSubmit={handleJoin} className="space-y-6">
            {/* Username field */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-semibold text-gray-400 tracking-wider uppercase block">
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
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500"
                maxLength={20}
              />
            </div>

            {/* Room ID field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="roomId" className="text-xs font-semibold text-gray-400 tracking-wider uppercase block">
                  Room ID
                </label>
                <button
                  type="button"
                  onClick={generateRoomId}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
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
                  className="w-full glass-input rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-gray-500 font-mono"
                  maxLength={16}
                />
                <button
                  type="button"
                  onClick={generateRoomId}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
                  title="Regenerate Room ID"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-emerald-500/35 active:translate-y-0 duration-200 cursor-pointer"
            >
              <span>Enter Playground</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-500 mt-8">
          Built with Next.js, Socket.io, and Monaco Editor.
        </p>
      </div>
    </div>
  );
}
