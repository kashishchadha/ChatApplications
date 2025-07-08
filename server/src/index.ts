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
import groupRoutes from './routes/group';
import messageRoutes from './routes/message';
import userRoutes from './routes/user';
import uploadRoutes from './routes/upload';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

mongoose.connect('mongodb://localhost:27017/chatapp')
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

 
  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.id} joined group ${groupId}`);
  });

  socket.on('joinUser', (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined their own room ${userId}`);
  });

 
  socket.on('sendMessage', async (data) => {
    
    const { sender, content, group, recipient, fileAttachment } = data;
    try {
      const messageData: any = { sender, content, group, recipient };
      if (fileAttachment) {
        messageData.fileAttachment = fileAttachment;
      }
      
      const message = await Message.create(messageData);
      
      // Emit to all relevant users
      if (group) {
        io.to(group).emit('receiveMessage', message);
      } else if (recipient) {
        // For 1-to-1, emit to both sender and recipient
        io.to(sender).emit('receiveMessage', message);
        io.to(recipient).emit('receiveMessage', message);
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
