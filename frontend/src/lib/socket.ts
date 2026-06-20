import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (!socket) {
    // Connect to the backend server (defaulting to port 5000)
  socket = io('https://devspace-9o3f.onrender.com',{
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
  }
  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
