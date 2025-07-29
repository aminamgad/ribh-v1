const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Create the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const JWT_SECRET = process.env.JWT_SECRET || 'ribh-secret-key-change-in-production';

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create Socket.io server
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = 
        socket.handshake.auth.token || 
        socket.handshake.headers.authorization?.replace('Bearer ', '') ||
        socket.request.headers.cookie?.split('ribh-token=')[1]?.split(';')[0];
      
      if (!token) {
        console.log('Socket connection: No token provided');
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.userEmail = decoded.email;
      
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

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected to socket`);

    // Handle joining specific rooms
    socket.on('join-room', (room) => {
      socket.join(room);
      console.log(`User ${socket.userId} joined room: ${room}`);
      socket.emit('joined-room', { room, message: `انضممت إلى ${room}` });
    });

    // Handle leaving specific rooms
    socket.on('leave-room', (room) => {
      socket.leave(room);
      console.log(`User ${socket.userId} left room: ${room}`);
      socket.emit('left-room', { room, message: `غادرت ${room}` });
    });

    // Handle chat messages
    socket.on('send-message', (data) => {
      console.log(`Message from ${socket.userId}:`, data);
      
      // Emit to specific user or room
      if (data.targetUserId) {
        socket.to(`user:${data.targetUserId}`).emit('new-message', {
          ...data,
          senderId: socket.userId,
          senderRole: socket.userRole,
          timestamp: new Date(),
        });
        
        // Also send back to sender for confirmation
        socket.emit('message-sent', {
          ...data,
          targetUserId: data.targetUserId,
          timestamp: new Date(),
        });
      }
    });

    // Handle notifications
    socket.on('send-notification', (data) => {
      // Only admins or the sender can send notifications
      if (socket.userRole === 'admin' || data.senderId === socket.userId) {
        const notification = {
          ...data,
          senderId: socket.userId,
          senderRole: socket.userRole,
          timestamp: new Date(),
        };

        if (data.targetUserId) {
          socket.to(`user:${data.targetUserId}`).emit('notification', notification);
        } else if (data.targetRole) {
          socket.to(`role:${data.targetRole}`).emit('notification', notification);
        } else {
          // Broadcast to all users
          socket.broadcast.emit('notification', notification);
        }

        socket.emit('notification-sent', notification);
      } else {
        socket.emit('error', { message: 'غير مصرح لك بإرسال الإشعارات' });
      }
    });

    // Handle order status updates (for real-time tracking)
    socket.on('order-update', (data) => {
      if (socket.userRole === 'admin' || socket.userRole === 'supplier') {
        const orderUpdate = {
          ...data,
          updatedBy: socket.userId,
          timestamp: new Date(),
        };

        // Notify customer about order update
        if (data.customerId) {
          socket.to(`user:${data.customerId}`).emit('order-status-update', orderUpdate);
        }

        // Notify all admins
        socket.to('role:admin').emit('order-status-update', orderUpdate);

        socket.emit('order-update-sent', orderUpdate);
      }
    });

    // Handle product approval notifications
    socket.on('product-approved', (data) => {
      if (socket.userRole === 'admin') {
        const notification = {
          type: 'product-approved',
          productId: data.productId,
          productName: data.productName,
          message: `تم اعتماد منتجك: ${data.productName}`,
          approvedBy: socket.userId,
          timestamp: new Date(),
        };

        // Notify the supplier
        if (data.supplierId) {
          socket.to(`user:${data.supplierId}`).emit('notification', notification);
        }

        socket.emit('notification-sent', notification);
      }
    });

    // Handle wallet updates
    socket.on('wallet-update', (data) => {
      const walletUpdate = {
        ...data,
        timestamp: new Date(),
      };

      // Notify the specific user about wallet changes
      if (data.userId) {
        socket.to(`user:${data.userId}`).emit('wallet-updated', walletUpdate);
      }
    });

    // Handle typing indicators for chat
    socket.on('typing', (data) => {
      if (data.targetUserId) {
        socket.to(`user:${data.targetUserId}`).emit('user-typing', {
          userId: socket.userId,
          userRole: socket.userRole,
          isTyping: data.isTyping,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.userId} disconnected: ${reason}`);
      
      // Notify other users that this user went offline
      socket.broadcast.emit('user-offline', {
        userId: socket.userId,
        timestamp: new Date(),
      });
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'تم الاتصال بنجاح بالخادم',
      userId: socket.userId,
      userRole: socket.userRole,
      timestamp: new Date(),
    });

    // Notify others that user came online
    socket.broadcast.emit('user-online', {
      userId: socket.userId,
      userRole: socket.userRole,
      timestamp: new Date(),
    });
  });

  // Store socket.io instance globally for use in API routes
  global.io = io;

  // Helper functions for sending notifications from API routes
  global.sendNotificationToUser = (userId, notification) => {
    io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date(),
    });
  };

  global.sendNotificationToRole = (role, notification) => {
    io.to(`role:${role}`).emit('notification', {
      ...notification,
      timestamp: new Date(),
    });
  };

  global.broadcastNotification = (notification) => {
    io.emit('notification', {
      ...notification,
      timestamp: new Date(),
    });
  };

  // Start the server
  server
    .once('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.io server running`);
    });
}); 