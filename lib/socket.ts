import { Server as SocketIOServer } from 'socket.io';

declare global {
  var io: SocketIOServer | undefined;
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

// Helper function to broadcast notification
export function broadcastNotification(notification: any) {
  if (global.io) {
    global.io.emit('notification', notification);
  }
} 