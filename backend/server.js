import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.send({ status: 'ok', time: new Date() });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow connections from frontend
    methods: ['GET', 'POST']
  }
});

// In-memory database of active rooms
// Room structure:
// {
//   roomId: string,
//   code: { html: string, css: string, js: string },
//   users: Array<{ socketId: string, username: string, cursor: object }>,
//   messages: Array<{ id: string, sender: string, text: string, timestamp: number }>
// }
const rooms = new Map();

// Helper to get initial boilerplate code
const getBoilerplate = () => ({
  html: `<!-- DevSpace Playground -->
<div class="playground-card">
  <div class="logo">🚀 DevSpace</div>
  <h1>Real-Time Code Playground</h1>
  <p>Invite your friends using the room ID and start coding together in real-time!</p>
  <button id="actionBtn" class="action-btn">Click Me!</button>
</div>`,
  css: `/* Premium Styling */
body {
  font-family: 'Outfit', sans-serif;
  background: radial-gradient(circle at top, #1e1b4b, #090514);
  color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
  overflow: hidden;
}

.playground-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 3rem;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  animation: fadeIn 1s ease-out;
}

.logo {
  font-size: 1.2rem;
  font-weight: 700;
  color: #818cf8;
  margin-bottom: 1rem;
  letter-spacing: 0.05em;
}

h1 {
  font-size: 1.8rem;
  margin-top: 0;
  background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.action-btn {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  border: none;
  padding: 0.8rem 1.8rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
}

.action-btn:active {
  transform: translateY(0);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}`,
  js: `// Interactive JavaScript
const btn = document.getElementById('actionBtn');
btn.addEventListener('click', () => {
  // Try changing this function!
  btn.innerText = '✨ Magic! ✨';
  btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  btn.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.4)';
  
  // Confetti helper inside client view
  console.log("Button clicked inside the playground!");
});`
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // 1. JOIN ROOM
  socket.on('join-room', ({ roomId, username }) => {
    if (!roomId || !username) return;

    socket.join(roomId);

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        roomId,
        code: getBoilerplate(),
        users: [],
        messages: []
      });
    }

    const room = rooms.get(roomId);

    // Add user to the list if not already there
    const userExists = room.users.some(u => u.socketId === socket.id);
    if (!userExists) {
      room.users.push({
        socketId: socket.id,
        username,
        cursor: null
      });
    }

    // Associate metadata with socket
    socket.roomId = roomId;
    socket.username = username;

    console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);

    // Send the current room state (code, messages, users) back to the joined user
    socket.emit('room-state', {
      code: room.code,
      users: room.users,
      messages: room.messages
    });

    // Notify other users in the room
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      username,
      users: room.users
    });
  });

  // 2. CODE CHANGE (Sync editor content)
  socket.on('code-change', ({ language, code }) => {
    const { roomId, username } = socket;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    if (room.code[language] !== undefined) {
      room.code[language] = code;
    }

    // Broadcast updated code to other users in the room
    socket.to(roomId).emit('code-update', {
      language,
      code,
      senderId: socket.id,
      senderName: username
    });
  });

  // 3. CURSOR CHANGE (Sync user cursor coordinates)
  socket.on('cursor-change', ({ cursor }) => {
    const { roomId } = socket;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const user = room.users.find(u => u.socketId === socket.id);
    if (user) {
      user.cursor = cursor;
    }

    // Broadcast user's cursor details to others
    socket.to(roomId).emit('cursor-update', {
      socketId: socket.id,
      cursor
    });
  });

  // 4. SEND CHAT MESSAGE
  socket.on('send-message', ({ text }) => {
    const { roomId, username } = socket;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const message = {
      id: `${socket.id}-${Date.now()}`,
      sender: username,
      senderId: socket.id,
      text,
      timestamp: Date.now()
    };

    room.messages.push(message);
    // Keep only last 100 messages in memory
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    // Broadcast to EVERYONE in the room including sender
    io.in(roomId).emit('message-received', message);
  });

  // 5. DISCONNECT / LEAVE ROOM
  const handleLeave = () => {
    const { roomId, username } = socket;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    
    // Remove user from the list
    room.users = room.users.filter(u => u.socketId !== socket.id);

    console.log(`User ${username} (${socket.id}) left room: ${roomId}`);

    // If room is empty, delete it after a small buffer to save memory, 
    // or keep it for reconnection unless inactive.
    if (room.users.length === 0) {
      // Clean up room state
      rooms.delete(roomId);
      console.log(`Room ${roomId} cleaned up (empty)`);
    } else {
      // Notify remaining users
      socket.to(roomId).emit('user-left', {
        socketId: socket.id,
        username,
        users: room.users
      });
    }
  };

  socket.on('leave-room', handleLeave);
  socket.on('disconnect', handleLeave);
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`DevSpace server running on port ${PORT}`);
});
