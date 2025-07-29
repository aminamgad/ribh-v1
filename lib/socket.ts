import { Server as HTTPServer } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';
import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

interface SocketWithAuth extends Socket {
  userId?: string;
}

let io: SocketIOServer | null = null;

export const initSocket = (server: HTTPServer) => {
  if (!io) {
    io = new SocketIOServer(server, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    // Authentication middleware
    io.use(async (socket: SocketWithAuth, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.userId;
        
        // Join user's personal room
        socket.join(`user:${decoded.userId}`);
        
        // Join role-specific room
        socket.join(`role:${decoded.role}`);
        
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    io.on('connection', (socket: SocketWithAuth) => {
      console.log(`User ${socket.userId} connected`);

      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
      });
    });
  }

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

// Helper function to send notification to specific user
export const sendNotificationToUser = (userId: string, notification: any) => {
  const socketIO = getIO();
  if (socketIO) {
    socketIO.to(`user:${userId}`).emit('notification', notification);
  }
};

// Helper function to send notification to all users with specific role
export const sendNotificationToRole = (role: string, notification: any) => {
  const socketIO = getIO();
  if (socketIO) {
    socketIO.to(`role:${role}`).emit('notification', notification);
  }
};

// Helper function to broadcast notification to all users
export const broadcastNotification = (notification: any) => {
  const socketIO = getIO();
  if (socketIO) {
    socketIO.emit('notification', notification);
  }
}; 