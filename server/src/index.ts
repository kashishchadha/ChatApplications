import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import Message from './models/Message';
import Group from './models/Group';
import User from './models/User';
import groupRoutes from './routes/group';
import messageRoutes from './routes/message';
import userRoutes from './routes/user';
import uploadRoutes from './routes/upload';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Store online users
const onlineUsers = new Map<string, string>(); // userId -> socketId

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

mongoose.connect(process.env.MONGO_URI || '')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


app.get('/', (req, res) => {
  res.send('Server is running!');
});


app.use('/api/auth', authRoutes);


app.use('/api/groups', groupRoutes);


app.use('/api/messages', messageRoutes);


app.use('/api/users', userRoutes);

app.use('/api/upload', uploadRoutes);



io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle user authentication and online status
  socket.on('userOnline', async (userId: string) => {
    try {
      // Update user's online status in database
      await User.findByIdAndUpdate(userId, { 
        isOnline: true, 
        lastSeen: new Date() 
      });
      
      // Store in memory for quick access
      onlineUsers.set(userId, socket.id);
      
      // Emit to all clients that this user is online
      io.emit('userStatusChange', { userId, isOnline: true });
      
      console.log(`User ${userId} is now online`);
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  });

  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.id} joined group ${groupId}`);
  });

  socket.on('joinUser', (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined their own room ${userId}`);
  });

 
  socket.on('sendMessage', async (msg) => {
    if (msg.group) {
      // Save the message to DB
      const newMsg = await Message.create({
        sender: msg.sender,
        content: msg.content,
        group: msg.group,
        createdAt: new Date(),
        fileAttachment: msg.fileAttachment || undefined,
        forwarded: msg.forwarded || false
      });
      // Populate sender's username
      const populatedMsg = await newMsg.populate('sender', 'username');
      io.to(msg.group).emit('receiveMessage', populatedMsg);
    } else if (msg.recipient) {
      // Save the message to DB
      const newMsg = await Message.create({
        sender: msg.sender,
        content: msg.content,
        recipient: msg.recipient,
        createdAt: new Date(),
        fileAttachment: msg.fileAttachment || undefined,
        forwarded: msg.forwarded || false
      });
      // Populate sender and recipient usernames (Mongoose 7+)
      let populatedMsg = await newMsg.populate('sender', 'username');
      populatedMsg = await populatedMsg.populate('recipient', 'username');
      // Emit to both sender and recipient rooms
      io.to(msg.recipient).to(msg.sender).emit('receiveMessage', populatedMsg);
    }
  });

  // Handle message delivered (double tick)
  socket.on('messageDelivered', async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && !message.deliveredTo.includes(userId)) {
        message.deliveredTo.push(userId);
        await message.save();
        // Notify sender
        io.to(message.sender.toString()).emit('messageDelivered', { messageId, userId });
      }
    } catch (err) {
      console.error('Error updating deliveredTo:', err);
    }
  });

  // Handle message seen (blue double tick)
  socket.on('messageSeen', async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && !message.seenBy.includes(userId)) {
        message.seenBy.push(userId);
        await message.save();
        // Notify sender
        io.to(message.sender.toString()).emit('messageSeen', { messageId, userId });
      }
    } catch (err) {
      console.error('Error updating seenBy:', err);
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    // Find the user ID for this socket
    let disconnectedUserId: string | null = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }
    
    if (disconnectedUserId) {
      try {
        // Update user's offline status in database
        await User.findByIdAndUpdate(disconnectedUserId, { 
          isOnline: false, 
          lastSeen: new Date() 
        });
        
        // Remove from memory
        onlineUsers.delete(disconnectedUserId);
        
        // Emit to all clients that this user is offline
        io.emit('userStatusChange', { userId: disconnectedUserId, isOnline: false });
        
        console.log(`User ${disconnectedUserId} is now offline`);
      } catch (error) {
        console.error('Error updating user offline status:', error);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
