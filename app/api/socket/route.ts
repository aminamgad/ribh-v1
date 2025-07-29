import { NextRequest, NextResponse } from 'next/server';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

declare global {
  var io: SocketIOServer | undefined;
}

const JWT_SECRET = process.env.JWT_SECRET || 'ribh-secret-key-change-in-production';

// Initialize Socket.io server
function initializeSocket(server: NetServer) {
  if (!global.io) {
    global.io = new SocketIOServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Authentication middleware
    global.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.replace('Bearer ', '') ||
                     socket.request.headers.cookie?.split('ribh-token=')[1]?.split(';')[0];
        
        if (!token) {
          console.log('Socket connection: No token provided');
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        socket.data.userId = decoded.userId;
        socket.data.role = decoded.role;
        socket.data.email = decoded.email;
        
        console.log(`Socket authenticated: User ${decoded.userId} (${decoded.role})`);
        
        // Join user's personal room
        socket.join(`user:${decoded.userId}`);
        
        // Join role-specific room
        socket.join(`role:${decoded.role}`);
        
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Invalid token'));
      }
    });

    global.io.on('connection', (socket) => {
      console.log(`User ${socket.data.userId} connected to socket`);

      // Handle joining specific rooms
      socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`User ${socket.data.userId} joined room: ${room}`);
      });

      // Handle leaving specific rooms
      socket.on('leave-room', (room) => {
        socket.leave(room);
        console.log(`User ${socket.data.userId} left room: ${room}`);
      });

      // Handle chat messages
      socket.on('send-message', (data) => {
        console.log(`Message from ${socket.data.userId}:`, data);
        // Emit to specific user or room
        if (data.targetUserId) {
          socket.to(`user:${data.targetUserId}`).emit('new-message', {
            ...data,
            senderId: socket.data.userId,
            timestamp: new Date()
          });
        }
      });

      // Handle notifications
      socket.on('send-notification', (data) => {
        if (socket.data.role === 'admin' || data.senderId === socket.data.userId) {
          if (data.targetUserId) {
            socket.to(`user:${data.targetUserId}`).emit('notification', {
              ...data,
              timestamp: new Date()
            });
          } else if (data.targetRole) {
            socket.to(`role:${data.targetRole}`).emit('notification', {
              ...data,
              timestamp: new Date()
            });
          }
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`User ${socket.data.userId} disconnected: ${reason}`);
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'تم الاتصال بنجاح',
        userId: socket.data.userId,
        timestamp: new Date()
      });
    });

    console.log('Socket.io server initialized');
  }

  return global.io;
}

// GET handler - for Socket.io handshake
export async function GET(req: NextRequest) {
  try {
    // This is a basic endpoint that confirms Socket.io is available
    return NextResponse.json({
      success: true,
      message: 'Socket.io server is running',
      path: '/api/socket',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Socket.io GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Socket.io server error' },
      { status: 500 }
    );
  }
}

// POST handler - for manual socket events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data, targetUserId, targetRole } = body;

    if (!global.io) {
      return NextResponse.json(
        { success: false, error: 'Socket.io server not initialized' },
        { status: 500 }
      );
    }

    // Emit event based on target
    if (targetUserId) {
      global.io.to(`user:${targetUserId}`).emit(event, data);
    } else if (targetRole) {
      global.io.to(`role:${targetRole}`).emit(event, data);
    } else {
      global.io.emit(event, data);
    }

    return NextResponse.json({
      success: true,
      message: 'Event sent successfully'
    });
  } catch (error) {
    console.error('Socket.io POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send event' },
      { status: 500 }
    );
  }
}

// Helper function to get Socket.io instance
export function getSocketIO() {
  return global.io;
}

// Helper function to send notification to user
export function sendNotificationToUser(userId: string, notification: any) {
  if (global.io) {
    global.io.to(`user:${userId}`).emit('notification', notification);
  }
}

// Helper function to send notification to role
export function sendNotificationToRole(role: string, notification: any) {
  if (global.io) {
    global.io.to(`role:${role}`).emit('notification', notification);
  }
}

// Export the initialization function for use in custom server
export { initializeSocket }; 