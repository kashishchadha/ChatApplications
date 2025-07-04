import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import Message from './models/Message';
import Group from './models/Group';
import groupRoutes from './routes/group';
import messageRoutes from './routes/message';
import userRoutes from './routes/user';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());


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



io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

 
  socket.on('joinGroup', (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.id} joined group ${groupId}`);
  });

 
  socket.on('sendMessage', async (data) => {
    
    const { sender, content, group, recipient } = data;
    try {
      const message = await Message.create({ sender, content, group, recipient });
      if (group) {
        io.to(group).emit('receiveMessage', message);
      } else if (recipient) {
        // For 1-to-1, emit to both sender and recipient (use user-specific rooms)
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
