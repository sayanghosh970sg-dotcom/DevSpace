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
    <div className="relative min-h-screen overflow-hidden text-white bg-[#050816]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,229,255,0.16),_transparent_24%),radial-gradient(circle_at_10%_20%,_rgba(255,77,157,0.14),_transparent_18%),radial-gradient(circle_at_80%_15%,_rgba(139,92,246,0.12),_transparent_20%)]" />
      <div className="absolute inset-0 pointer-events-none">
        <span className="floating-light left-10 top-20 w-72 h-72 bg-cyan-400/20 animate-float" />
        <span className="floating-light right-16 top-32 w-56 h-56 bg-pink-500/18 animate-float-slow" />
        <span className="floating-light left-1/2 top-10 w-44 h-44 bg-violet-500/22 animate-float" />
      </div>
      <div className="relative z-20 flex h-screen flex-col px-4 py-4 lg:px-8 lg:py-6">
        <div className="glass-panel gradient-border p-5 rounded-[28px] shadow-[0_30px_70px_rgba(0,0,0,0.4)] backdrop-blur-xl border-white/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-white/5 px-4 py-2 text-sm text-cyan-100 shadow-[0_0_30px_rgba(0,229,255,0.12)]">
                <Code className="h-5 w-5 text-cyan-300" />
                <span className="font-semibold tracking-[0.24em] uppercase">DevSpace</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span className="text-slate-400 uppercase tracking-[0.3em] text-[0.68rem]">Room</span>
                <span className="rounded-2xl bg-white/5 px-3 py-2 text-sm font-semibold tracking-wide text-cyan-100 shadow-[0_0_30px_rgba(0,229,255,0.12)]">{roomId}</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#021025] px-3 py-2 text-[0.78rem] font-medium text-cyan-200 shadow-[0_0_20px_rgba(0,229,255,0.18)]">
                  <span className="status-dot animate-pulse" />
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={copyRoomLink}
                className="neon-button rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] shadow-[0_0_18px_rgba(0,229,255,0.18)] transition-all hover:scale-[1.01]"
              >
                {isCopied ? (
                  <span className="inline-flex items-center gap-2 text-cyan-100">
                    <Check className="h-4 w-4" />
                    Link Copied!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 text-cyan-100">
                    <Copy className="h-4 w-4" />
                    Invite Friends
                  </span>
                )}
              </button>
              <button
                onClick={toggleTheme}
                className="glass-panel flex h-12 w-12 items-center justify-center rounded-3xl border border-cyan-300/15 text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-300/40"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={handleLeaveRoom}
                className="neon-button rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-pink-100 shadow-[0_0_18px_rgba(255,77,157,0.2)] transition-all hover:scale-[1.01]"
              >
                <span className="inline-flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Leave Room
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-1 flex-col gap-5 lg:flex-row">
          <aside className="glass-panel w-full rounded-[28px] border border-white/10 bg-[#06121f]/90 p-5 shadow-[0_38px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:w-96">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="panel-heading">Workspace</p>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">Live collaboration</h2>
                </div>
                <div className="rounded-3xl bg-[#071525] px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-200">AI Mode</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSidebarTab('users')}
                  className={`pill-tab flex items-center justify-center gap-2 ${sidebarTab === 'users' ? 'pill-active' : 'text-slate-300/80 border border-white/5 bg-white/5'}`}
                >
                  <Users className="h-4 w-4" />
                  <span>Users</span>
                </button>
                <button
                  onClick={() => setSidebarTab('chat')}
                  className={`pill-tab flex items-center justify-center gap-2 ${sidebarTab === 'chat' ? 'pill-active' : 'text-slate-300/80 border border-white/5 bg-white/5'}`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {sidebarTab === 'users' ? (
                  <div className="space-y-4">
                    <div className="border-b border-white/10 pb-3">
                      <p className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-500">Active collaborators</p>
                    </div>
                    {users.map((u) => {
                      const uColor = getUserColor(u.socketId);
                      const isSelf = u.username === username && u.socketId === socketRef.current?.id;
                      return (
                        <div key={u.socketId} className="user-card flex items-center gap-4 rounded-[24px] p-4 transition duration-300 hover:border-cyan-300/25 hover:bg-white/10">
                          <div className="relative">
                            <div
                              className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 text-lg font-bold"
                              style={{ backgroundColor: `${uColor}20`, color: uColor }}
                            >
                              {u.username.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="status-dot absolute -right-1 -bottom-1 border border-[#050816]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-white truncate">{u.username}</p>
                            <p className="mt-1 text-sm text-slate-400">ID: {u.socketId.substring(0, 8)}...</p>
                          </div>
                          {isSelf ? (
                            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-cyan-100">You</span>
                          ) : (
                            <span className="rounded-full bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-300">Live</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div className="space-y-4 overflow-y-auto pr-1">
                      {messages.map((msg) => {
                        const isSys = msg.senderId === 'system';
                        const isSelf = msg.senderId === socketRef.current?.id;
                        const uColor = getUserColor(msg.senderId);

                        if (isSys) {
                          return (
                            <div key={msg.id} className="chat-bubble rounded-full px-4 py-2 text-center text-xs uppercase tracking-[0.25em] text-slate-400 shadow-[0_0_24px_rgba(0,0,0,0.15)]">
                              {msg.text}
                            </div>
                          );
                        }

                        return (
                          <div key={msg.id} className={`flex flex-col max-w-[88%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                            <div className="flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-slate-400">
                              <span style={{ color: isSelf ? '#00e5ff' : uColor }}>{msg.sender}</span>
                              <span>•</span>
                              <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`chat-bubble mt-2 max-w-[480px] px-5 py-4 text-sm leading-6 ${isSelf ? 'bg-gradient-to-r from-cyan-500/15 to-violet-500/15 text-white border border-cyan-300/20 rounded-br-[4px]' : 'bg-white/5 text-slate-200 border border-white/10 rounded-bl-[4px]'}`}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="mt-2 flex gap-3 rounded-[24px] border border-white/10 bg-[#07101f]/90 p-3 shadow-[inset_0_0_30px_rgba(0,0,0,0.18)]">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="glass-input h-14 rounded-[22px] border-white/10 bg-white/5 px-5 text-sm text-white placeholder:text-slate-500"
                      />
                      <button
                        type="submit"
                        className="neon-button flex h-14 w-14 items-center justify-center rounded-[22px] text-white transition hover:shadow-[0_0_24px_rgba(0,229,255,0.2)]"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="flex flex-1 flex-col gap-5">
            <div className="grid gap-5 lg:grid-cols-[1.45fr_0.95fr]">
              <div className="glass-panel editor-frame border border-white/10 shadow-[0_35px_80px_rgba(0,0,0,0.4)]">
                <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
                  <div className="flex items-center gap-3">
                    {(['html', 'css', 'js'] as const).map((tab) => {
                      const isTabActive = activeTab === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition duration-300 ${isTabActive ? 'bg-[#071828] text-cyan-100 shadow-[0_0_25px_rgba(0,229,255,0.14)]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                        >
                          <FileCode className="h-4 w-4" />
                          <span className="uppercase tracking-[0.2em]">{tab}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-3xl bg-[#02101f] px-4 py-3 text-xs uppercase tracking-[0.24em] text-cyan-200 shadow-[0_0_24px_rgba(0,229,255,0.12)]">
                    <CheckCircle className="h-4 w-4 text-cyan-300 animate-pulse" />
                    Sync Active
                  </div>
                </div>

                <div className="h-[calc(100%-4rem)] bg-[#050816]">
                  <Editor
                    height="100%"
                    language={activeTab === 'js' ? 'javascript' : activeTab}
                    theme={isDarkMode ? 'devspace-dark' : 'vs'}
                    value={code[activeTab]}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 15,
                      lineHeight: 24,
                      fontFamily: 'var(--font-geist-mono), Courier New, monospace',
                      cursorBlinking: 'smooth',
                      cursorSmoothCaretAnimation: 'on',
                      smoothScrolling: true,
                      padding: { top: 16, bottom: 16 },
                      tabSize: 2,
                      wordWrap: 'on',
                    }}
                    loading={
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#050816] text-cyan-300">
                        <RefreshCw className="h-10 w-10 animate-spin" />
                        <span className="text-sm font-semibold tracking-[0.22em] uppercase text-slate-400">
                          Spawning Editor...
                        </span>
                      </div>
                    }
                  />
                </div>
              </div>

              <div className="glass-panel preview-shell border border-white/10 shadow-[0_35px_80px_rgba(0,0,0,0.4)]">
                <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
                  <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">
                    <Play className="h-4 w-4 text-cyan-300" />
                    Live preview
                  </div>
                  <button
                    onClick={() => setPreviewKey(prev => prev + 1)}
                    className="glass-panel flex h-12 w-12 items-center justify-center rounded-3xl border border-cyan-300/15 text-cyan-100 transition hover:bg-white/5"
                    title="Force reload preview"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                </div>
                <div className="h-[calc(100%-4rem)] overflow-hidden bg-[#050816]">
                  <iframe
                    key={previewKey}
                    srcDoc={getCompiledSource()}
                    title="DevSpace Compiler Sandbox"
                    sandbox="allow-scripts"
                    className="h-full w-full border-none bg-[#050816]"
                  />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
