'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, AlertCircle, X } from 'lucide-react';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import DashboardMockup from '@/components/landing/DashboardMockup';
import CTASection from '@/components/landing/CTASection';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load saved username if present
  useEffect(() => {
    const savedName = localStorage.getItem('devspace-username');
    if (savedName) {
      setUsername(savedName);
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal]);

  // Handle modal backdrop click
  useEffect(() => {
    const handleBackdropClick = (e: MouseEvent) => {
      if (modalRef.current && e.target === modalRef.current) {
        setShowModal(false);
      }
    };
    if (showModal) {
      document.addEventListener('mousedown', handleBackdropClick);
      return () => document.removeEventListener('mousedown', handleBackdropClick);
    }
  }, [showModal]);

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

  const handleStartClick = () => {
    if (!roomId.trim()) {
      generateRoomId();
    }
    setShowModal(true);
  };

  return (
    <div className="relative min-h-screen bg-[#0b0e1a] overflow-x-hidden">
      {/* Fixed background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none opacity-20" />

      {/* Main content */}
      <div className="relative z-0">
        {/* Hero Section */}
        <Hero />

        {/* Features Section */}
        <Features />

        {/* Dashboard Mockup */}
        <DashboardMockup />

        {/* CTA Section */}
        <CTASection onStartClick={handleStartClick} />

        {/* Footer */}
        <footer className="relative border-t border-white/10 bg-white/5 backdrop-blur-xl py-8 px-4">
          <div className="max-w-6xl mx-auto text-center text-xs text-slate-400">
            <p>© 2026 DevSpace. Built with Next.js, Socket.io, and Monaco Editor.</p>
          </div>
        </footer>
      </div>

      {/* Modal Backdrop */}
      {showModal && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          {/* Modal */}
          <div className="relative max-w-md w-full rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-xl p-1 shadow-2xl animate-slide-down">
            {/* Gradient line at top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent rounded-full" />

            <div className="rounded-2xl bg-[#0b0e1a] p-8">
              {/* Close button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Enter the Playground</h2>
                  <p className="text-sm text-slate-400">Start collaborating in real-time with your team</p>
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="modal-username" className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                      Your Name
                    </label>
                    <input
                      id="modal-username"
                      type="text"
                      placeholder="Enter your alias..."
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError('');
                      }}
                      className="glass-input rounded-lg px-4 py-3 text-sm text-white placeholder:text-slate-500 transition duration-200 hover:border-cyan-400/40 w-full"
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <label htmlFor="modal-roomId" className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                        Room ID
                      </label>
                      <button
                        type="button"
                        onClick={generateRoomId}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Generate
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="modal-roomId"
                        type="text"
                        placeholder="Enter or generate ID..."
                        value={roomId}
                        onChange={(e) => {
                          setRoomId(e.target.value);
                          setError('');
                        }}
                        className="glass-input rounded-lg pl-4 pr-10 py-3 text-sm text-white placeholder:text-slate-500 font-mono transition duration-200 hover:border-cyan-400/40 w-full"
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
                    <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-400/20 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold text-sm py-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(56,189,248,0.3)] shadow-lg"
                  >
                    Enter Playground
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
