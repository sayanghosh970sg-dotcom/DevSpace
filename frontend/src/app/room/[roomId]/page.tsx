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
  const colors = ['#1DB954', '#1ED760', '#34D399', '#22C55E', '#4ADE80', '#6EE7B8', '#0EA5E9'];
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
        'editorCursor.foreground': '#1DB954',
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
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-200 ${isDarkMode ? 'text-slate-100 bg-[#06040d]' : 'text-slate-800 bg-slate-50'}`}>
      {/* Dynamic Cursor Styles (Clean up injection styles) */}
      
      {/* 1. Header Navigation Bar */}
      <header className={`h-16 flex items-center justify-between px-6 shrink-0 relative z-20 transition-colors duration-200 ${isDarkMode ? 'bg-[#0c0a15] border-b border-emerald-950/40' : 'bg-white border-b border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <span className={`font-bold tracking-tight ${isDarkMode ? 'bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200 bg-clip-text text-transparent' : 'text-slate-800'}`}>
              DevSpace
            </span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono mt-0.5">
              <span>room:</span>
              <span className={`select-all font-semibold ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>{roomId}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Copy Invite Link */}
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 hover:text-white transition-all cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Invite Friends</span>
              </>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
              isDarkMode 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Leave Button */}
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 hover:text-white transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Room</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Users and Chat */}
        <aside className={`w-80 border-r flex flex-col shrink-0 transition-colors duration-200 ${isDarkMode ? 'bg-[#0a0812] border-emerald-950/40' : 'bg-slate-100 border-slate-200'}`}>
          {/* Sidebar Tabs */}
          <div className={`grid grid-cols-2 border-b p-2 gap-1.5 shrink-0 transition-colors duration-200 ${isDarkMode ? 'border-emerald-950/30' : 'border-slate-200/60'}`}>
            <button
              onClick={() => setSidebarTab('users')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer border ${
                sidebarTab === 'users' 
                  ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-white border-slate-200 text-emerald-600 shadow-sm' 
                  : isDarkMode ? 'border-transparent text-slate-400 hover:text-white hover:bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users ({users.length})</span>
            </button>
            <button
              onClick={() => setSidebarTab('chat')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer border ${
                sidebarTab === 'chat' 
                  ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-white border-slate-200 text-emerald-600 shadow-sm' 
                  : isDarkMode ? 'border-transparent text-slate-400 hover:text-white hover:bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat ({messages.filter(m => m.senderId !== 'system').length})</span>
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {sidebarTab === 'users' ? (
              /* ACTIVE USERS PANEL */
              <div className="space-y-3">
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Active Collaborators</h3>
                {users.map((u) => {
                  const uColor = getUserColor(u.socketId);
                  const isSelf = u.username === username && u.socketId === socketRef.current?.id;
                  return (
                    <div 
                      key={u.socketId} 
                      className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/2 border-white/[0.04] hover:bg-white/[0.05]' : 'bg-white border-slate-200 hover:bg-slate-100/50 text-slate-700 shadow-sm'}`}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold relative shrink-0"
                        style={{ backgroundColor: `${uColor}20`, border: `1px solid ${uColor}50`, color: uColor }}
                      >
                        {u.username.substring(0, 2).toUpperCase()}
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${isDarkMode ? 'border-[#0a0812]' : 'border-white'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                          <span>{u.username}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 px-1.5 py-0.2 rounded-md font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono truncate">
                          ID: {u.socketId.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* CHAT PANEL */
              <div className="flex flex-col h-full">
                {/* Message Logs */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {messages.map((msg) => {
                    const isSys = msg.senderId === 'system';
                    const isSelf = msg.senderId === socketRef.current?.id;
                    const uColor = getUserColor(msg.senderId);

                    if (isSys) {
                      return (
                        <div key={msg.id} className={`text-center text-[10px] font-mono my-2.5 py-1.5 px-3 rounded-lg border transition-colors ${isDarkMode ? 'text-gray-500 bg-white/2 border-white/[0.03]' : 'text-slate-500 bg-slate-200/50 border-slate-200'}`}>
                          {msg.text}
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col max-w-[85%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <span className="text-[10px] text-gray-500 mb-1 flex items-center gap-1 px-1 font-semibold">
                          <span style={{ color: isSelf ? '#818cf8' : uColor }}>{msg.sender}</span>
                          <span>•</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <div 
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-colors ${
                            isSelf 
                              ? 'bg-emerald-600 text-white rounded-tr-none' 
                              : isDarkMode 
                                ? 'bg-white/5 text-slate-200 border border-white/[0.04] rounded-tl-none' 
                                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Form */}
                <form onSubmit={handleSendMessage} className="mt-4 flex gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 glass-input rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500"
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </aside>

        {/* Center/Right Panels: Code Editor and Preview side-by-side */}
        <main className="flex-1 flex overflow-hidden">
          {/* EDITOR AREA */}
          <div className={`flex-1 flex flex-col border-r transition-colors duration-200 ${isDarkMode ? 'border-emerald-950/40' : 'border-slate-200'}`}>
            {/* Editor Tabs Selector */}
            <div className={`h-11 border-b flex items-center px-4 justify-between shrink-0 select-none transition-colors duration-200 ${isDarkMode ? 'bg-[#0c0a15] border-emerald-950/30' : 'bg-slate-100 border-slate-200'}`}>
              <div className="flex gap-2">
                {(['html', 'css', 'js'] as const).map((tab) => {
                  const isTabActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                        isTabActive 
                          ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white border-slate-200 text-emerald-600 shadow-sm' 
                          : isDarkMode ? 'border-transparent text-slate-400 hover:text-white hover:bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span className="uppercase">{tab}</span>
                    </button>
                  );
                })}
              </div>

              {/* Status Indicator */}
              <div className={`text-[10px] font-mono flex items-center gap-1.5 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Sync Active</span>
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div className={`flex-1 relative transition-colors duration-200 ${isDarkMode ? 'bg-[#0c0a15]' : 'bg-white'}`}>
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
                  <div className={`absolute inset-0 flex flex-col items-center justify-center text-emerald-400 gap-3 transition-colors ${isDarkMode ? 'bg-[#0c0a15]' : 'bg-white'}`}>
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <span className={`text-xs font-semibold font-mono tracking-widest uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Spawning Editor...
                    </span>
                  </div>
                }
              />
            </div>
          </div>

          {/* LIVE PREVIEW AREA */}
          <div className={`w-[45%] flex flex-col transition-colors duration-200 ${isDarkMode ? 'bg-[#0c0a15]' : 'bg-slate-50'}`}>
            <div className={`h-11 border-b flex items-center justify-between px-4 shrink-0 transition-colors duration-200 ${isDarkMode ? 'bg-[#090710] border-emerald-950/30' : 'bg-slate-100 border-slate-200'}`}>
              <div className={`flex items-center gap-2 text-xs font-semibold transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live View output</span>
              </div>
              <button
                onClick={() => setPreviewKey(prev => prev + 1)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
                title="Force reload preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 bg-white relative">
              <iframe
                key={previewKey}
                srcDoc={getCompiledSource()}
                title="DevSpace Compiler Sandbox"
                sandbox="allow-scripts"
                className="w-full h-full border-none bg-white"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
