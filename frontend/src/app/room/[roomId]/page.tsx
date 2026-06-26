'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Editor, { Monaco } from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';
import {
  Users, MessageSquare, Code, Play, Copy, Check, LogOut,
  Send, Terminal, ChevronRight, RefreshCw, FileCode, CheckCircle,
  Sun, Moon
} from 'lucide-react';

interface User {
  socketId: string;
  username: string;
  cursor?: { lineNumber: number; column: number } | null;
}

interface Message {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  timestamp: number;
}

interface CodeState {
  html: string;
  css: string;
  js: string;
}

export default function RoomPage() {
  const router = useRouter();
  const { roomId } = useParams() as { roomId: string };
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || `User-${Math.floor(1000 + Math.random() * 9000)}`;

  // Socket and Editor refs
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<Record<string, string[]>>({}); // socketId -> decorationIds

  // UI States
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [code, setCode] = useState<CodeState>({ html: '', css: '', js: '' });
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'users' | 'chat'>('users');
  const [isConnected, setIsConnected] = useState(false);
  const [previewKey, setPreviewKey] = useState(0); // For forcing iframe refreshes
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Sync theme with local storage and root document element
  useEffect(() => {
    const savedTheme = localStorage.getItem('devspace-theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.add('light');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('devspace-theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.remove('light');
        if (editorRef.current && monacoRef.current) {
          monacoRef.current.editor.setTheme('devspace-dark');
        }
      } else {
        document.documentElement.classList.add('light');
        if (editorRef.current && monacoRef.current) {
          monacoRef.current.editor.setTheme('vs');
        }
      }
      return next;
    });
  };

  // Refs for auto-scroll
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Generate color palette based on username hash
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444'];
  const getUserColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // 1. Initial Connection Setup
  useEffect(() => {
    // Connect to Backend Socket Server
    const socket = io('https://devspace-9o3f.onrender.com', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-room', { roomId, username });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // 2. Listen to Socket Events
    socket.on('room-state', ({ code: initialCode, users: initialUsers, messages: initialMessages }) => {
      setCode(initialCode);
      setUsers(initialUsers);
      setMessages(initialMessages);
    });

    socket.on('user-joined', ({ username: joinedUser, users: updatedUsers }) => {
      setUsers(updatedUsers);
      // Play system notice/toast or local message
      addSystemMessage(`${joinedUser} joined the room.`);
    });

    socket.on('user-left', ({ username: leftUser, users: updatedUsers, socketId }) => {
      setUsers(updatedUsers);
      addSystemMessage(`${leftUser} left the room.`);

      // Clean up decorations for this user
      if (editorRef.current && decorationsRef.current[socketId]) {
        editorRef.current.deltaDecorations(decorationsRef.current[socketId], []);
        delete decorationsRef.current[socketId];
      }
    });

    socket.on('code-update', ({ language, code: newCode }) => {
      setCode(prev => {
        const next = { ...prev, [language]: newCode };
        // If the current tab code was updated by another user and editor is loaded,
        // update the Monaco Editor content without losing cursor position
        if (language === activeTab && editorRef.current) {
          const currentVal = editorRef.current.getValue();
          if (currentVal !== newCode) {
            const position = editorRef.current.getPosition();
            editorRef.current.setValue(newCode);
            if (position) editorRef.current.setPosition(position);
          }
        }
        return next;
      });
    });

    socket.on('cursor-update', ({ socketId, cursor }) => {
      setUsers(prev => prev.map(u => u.socketId === socketId ? { ...u, cursor } : u));
    });

    socket.on('message-received', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, username, activeTab]);

  // Sync cursor decorations when users list changes
  useEffect(() => {
    updateCursorDecorations();
  }, [users, activeTab]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addSystemMessage = (text: string) => {
    const sysMsg: Message = {
      id: `system-${Date.now()}-${Math.random()}`,
      sender: 'System',
      senderId: 'system',
      text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, sysMsg]);
  };

  // Helper to copy room link
  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // 3. Handle Editor Lifecycle
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Load initial code value into editor
    editor.setValue(code[activeTab] || '');

    // Set custom editor theme if desired
    monaco.editor.defineTheme('devspace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fbbf24' },
      ],
      colors: {
        'editor.background': '#0c0a15',
        'editor.lineHighlightBackground': '#161327',
        'editorCursor.foreground': '#6366f1',
      }
    });
    // Set theme dynamically
    monaco.editor.setTheme(isDarkMode ? 'devspace-dark' : 'vs');

    // Emit local cursor changes
    editor.onDidChangeCursorPosition((e: any) => {
      if (socketRef.current) {
        socketRef.current.emit('cursor-change', {
          cursor: {
            lineNumber: e.position.lineNumber,
            column: e.position.column
          }
        });
      }
    });
  };

  // Handle local text inputs
  const handleEditorChange = (value: string | undefined) => {
    const nextCode = value || '';

    // Update local state reactively
    setCode(prev => ({ ...prev, [activeTab]: nextCode }));

    // Send code to other room members via Socket.io
    if (socketRef.current) {
      socketRef.current.emit('code-change', {
        language: activeTab,
        code: nextCode
      });
    }
  };

  // Sync active tab changes with Monaco
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setValue(code[activeTab] || '');
    }
  }, [activeTab]);

  // 4. Monaco Custom Cursor Decorations
  const updateCursorDecorations = () => {
    if (!editorRef.current || !monacoRef.current || !socketRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const selfSocketId = socketRef.current.id;

    // For each other user in the room
    users.forEach(user => {
      // Don't draw our own cursor
      if (user.socketId === selfSocketId) return;

      const userColor = getUserColor(user.socketId);
      const styleId = `cursor-style-${user.socketId}`;

      // Injects a CSS class dynamically for this user's cursor flag and color
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        .cursor-col-${user.socketId} {
          border-left: 2px solid ${userColor} !important;
        }
        .cursor-flag-${user.socketId}::after {
          content: "${user.username}";
          position: absolute;
          top: -16px;
          left: 0;
          background: ${userColor};
          color: #fff;
          font-size: 9px;
          font-family: sans-serif;
          padding: 2px 5px;
          border-radius: 4px;
          white-space: nowrap;
          z-index: 50;
          opacity: 0.8;
          pointer-events: none;
        }
      `;

      const oldDecorations = decorationsRef.current[user.socketId] || [];
      let newDecorations: any[] = [];

      if (user.cursor) {
        const { lineNumber, column } = user.cursor;
        newDecorations = [{
          range: new monaco.Range(lineNumber, column, lineNumber, column),
          options: {
            className: `cursor-col-${user.socketId} cursor-flag-${user.socketId}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        }];
      }

      // Apply new decoration range and store decoration IDs
      decorationsRef.current[user.socketId] = editor.deltaDecorations(oldDecorations, newDecorations);
    });
  };

  // 5. Build HTML Compiler
  const getCompiledSource = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            ${code.css}
          </style>
        </head>
        <body>
          ${code.html}
          <script>
            // Capture console.log and forward to top level window if needed
            const _log = console.log;
            console.log = (...args) => {
              _log(...args);
              window.parent.postMessage({ type: 'CONSOLE_LOG', data: args.join(' ') }, '*');
            };
            
            try {
              ${code.js}
            } catch (err) {
              console.error(err);
              window.parent.postMessage({ type: 'CONSOLE_ERROR', data: err.message }, '*');
            }
          </script>
        </body>
      </html>
    `;
  };

  // 6. Handle Chat message submits
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    socketRef.current.emit('send-message', { text: inputText.trim() });
    setInputText('');
  };

  // Leave Room helper
  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
    }
    router.push('/');
  };
  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-200 ${isDarkMode ? 'text-slate-100 bg-[#0b1020]' : 'text-slate-900 bg-slate-50'}`}>
      <div className="absolute inset-0 pointer-events-none opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:70px_70px]" />

      <header className={`h-16 flex items-center justify-between px-6 shrink-0 relative z-20 transition-colors duration-200 ${isDarkMode ? 'bg-[#0f1630]/90 border-b border-white/10 backdrop-blur-xl' : 'bg-white/90 border-b border-slate-200 backdrop-blur-xl'}`}>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_30px_rgba(56,189,248,0.15)] text-cyan-300">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <span className={`font-black tracking-[0.2em] uppercase text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              DevSpace
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span>room:</span>
              <span className={`select-all font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>{roomId}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-cyan-400 animate-pulse' : 'bg-rose-500'}`} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 transition-all cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.14)]"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-cyan-300" />
                <span className="text-cyan-200">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Invite Friends</span>
              </>
            )}
          </button>

          <button
            onClick={toggleTheme}
            className={`p-3 rounded-full transition-all cursor-pointer border ${isDarkMode
              ? 'bg-white/5 border-white/10 text-slate-100 hover:bg-white/10'
              : 'bg-slate-100 border-slate-200 text-slate-900 hover:bg-slate-200'
              }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border border-pink-400/25 bg-pink-500/10 text-pink-200 hover:bg-pink-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Room</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`w-80 border-r flex flex-col shrink-0 transition-colors duration-200 ${isDarkMode ? 'bg-[#0f1630]/80 border-white/10' : 'bg-slate-100/80 border-slate-200'}`}>
          <div className={`grid grid-cols-2 border-b p-2 gap-2 shrink-0 transition-colors duration-200 ${isDarkMode ? 'border-white/10 bg-[#11192f]' : 'border-slate-200/60 bg-slate-50'}`}>
            <button
              onClick={() => setSidebarTab('users')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer border ${sidebarTab === 'users'
                ? isDarkMode ? 'bg-cyan-400/15 border-cyan-400/30 text-cyan-300' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                : isDarkMode ? 'border-transparent text-slate-400 hover:text-white hover:bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
            >
              <Users className="w-4 h-4" />
              <span>Users ({users.length})</span>
            </button>
            <button
              onClick={() => setSidebarTab('chat')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer border ${sidebarTab === 'chat'
                ? isDarkMode ? 'bg-violet-500/15 border-violet-400/30 text-violet-200' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                : isDarkMode ? 'border-transparent text-slate-400 hover:text-white hover:bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat ({messages.filter(m => m.senderId !== 'system').length})</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {sidebarTab === 'users' ? (
              <div className="space-y-3">
                <h3 className={`text-[11px] font-semibold uppercase tracking-[0.25em] mb-2 transition-colors ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Active Collaborators</h3>
                {users.map((u) => {
                  const uColor = getUserColor(u.socketId);
                  const isSelf = u.username === username && u.socketId === socketRef.current?.id;
                  return (
                    <div
                      key={u.socketId}
                      className={`flex items-center gap-3 p-3 rounded-3xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm'}`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold relative shrink-0"
                        style={{ backgroundColor: `${uColor}20`, border: `1px solid ${uColor}50`, color: uColor }}
                      >
                        {u.username.substring(0, 2).toUpperCase()}
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 ${isDarkMode ? 'border-[#0f1630]' : 'border-white'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                          <span>{u.username}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-cyan-400/15 text-cyan-300 border border-cyan-400/25 px-2 py-0.5 rounded-full font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          ID: {u.socketId.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {messages.map((msg) => {
                    const isSys = msg.senderId === 'system';
                    const isSelf = msg.senderId === socketRef.current?.id;
                    const uColor = getUserColor(msg.senderId);

                    if (isSys) {
                      return (
                        <div key={msg.id} className={`text-center text-[10px] font-mono my-2.5 py-1.5 px-3 rounded-full border transition-colors ${isDarkMode ? 'text-slate-500 bg-white/5 border-white/10' : 'text-slate-500 bg-slate-200/60 border-slate-200'}`}>
                          {msg.text}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <span className="text-[10px] text-slate-400 mb-1 flex items-center gap-1 px-1 font-semibold">
                          <span style={{ color: isSelf ? '#38bdf8' : uColor }}>{msg.sender}</span>
                          <span>•</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <div
                          className={`rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)] transition-all ${isSelf
                            ? 'bg-gradient-to-r from-violet-500 to-cyan-400 text-white rounded-br-none'
                            : isDarkMode
                              ? 'bg-white/5 text-slate-200 border border-white/10 rounded-bl-none'
                              : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-none'
                            }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 glass-input rounded-full px-4 py-3 text-xs text-white placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 p-3 flex items-center justify-center text-white transition hover:shadow-[0_0_20px_rgba(56,189,248,0.25)] cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex overflow-hidden">
          <div className={`flex-1 flex flex-col border-r transition-colors duration-200 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
            <div className={`h-14 border-b flex items-center px-4 justify-between shrink-0 select-none transition-colors duration-200 ${isDarkMode ? 'bg-[#11192f] border-white/10' : 'bg-slate-100 border-slate-200'}`}>
              <div className="flex gap-2">
                {(['html', 'css', 'js'] as const).map((tab) => {
                  const isTabActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer border ${isTabActive
                        ? isDarkMode ? 'bg-cyan-400/15 border-cyan-400/30 text-cyan-300' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                        : isDarkMode ? 'border-transparent text-slate-400 hover:text-white hover:bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                        }`}
                    >
                      <FileCode className="w-4 h-4" />
                      <span className="uppercase">{tab}</span>
                    </button>
                  );
                })}
              </div>

              <div className={`text-[10px] font-mono flex items-center gap-1.5 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Sync Active</span>
              </div>
            </div>

            <div className={`flex-1 relative transition-colors duration-200 ${isDarkMode ? 'bg-[#0d1327]' : 'bg-white'}`}>
              <Editor
                height="100%"
                language={activeTab === 'js' ? 'javascript' : activeTab}
                theme={isDarkMode ? 'devspace-dark' : 'vs'}
                value={code[activeTab]}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineHeight: 22,
                  fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                  padding: { top: 12, bottom: 12 },
                  tabSize: 2,
                  wordWrap: 'on',
                }}
                loading={
                  <div className={`absolute inset-0 flex flex-col items-center justify-center text-cyan-300 gap-3 transition-colors ${isDarkMode ? 'bg-[#0d1327]' : 'bg-white'}`}>
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <span className={`text-xs font-semibold font-mono tracking-widest uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Spawning Editor...
                    </span>
                  </div>
                }
              />
            </div>
          </div>

          <div className={`w-[45%] flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-[#11192f]' : 'bg-slate-50'}`}>
            <div className={`h-14 border-b flex items-center justify-between px-4 shrink-0 transition-colors duration-200 ${isDarkMode ? 'bg-[#11192f] border-white/10' : 'bg-slate-100 border-slate-200'}`}>
              <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>
                <Play className="w-4 h-4 text-cyan-400" />
                <span>Live View output</span>
              </div>
              <button
                onClick={() => setPreviewKey(prev => prev + 1)}
                className={`p-2 rounded-full transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                title="Force reload preview"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden bg-[#060915]">
              <iframe
                key={previewKey}
                srcDoc={getCompiledSource()}
                title="DevSpace Compiler Sandbox"
                sandbox="allow-scripts"
                className="w-full h-full border-none bg-[#060915]"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
