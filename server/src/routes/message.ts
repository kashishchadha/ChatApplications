import { Router, Request, Response } from 'express';
import Message from '../models/Message';
import authMiddleware from '../middleware/auth';

const router = Router();

// Get messages for a group
router.get('/group/:groupId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const messages = await Message.find({ group: req.params.groupId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching group messages', error: err });
  }
});

// Update a message
router.put('/:messageId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.messageId);
    // Only allow the sender to edit
    // @ts-ignore
    if (!message || message.sender.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    message.content = content;
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Error updating message', error: err });
  }
});

// Delete a message
router.delete('/:messageId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const message = await Message.findById(req.params.messageId);
    // Only allow the sender to delete
    // @ts-ignore
    if (!message || message.sender.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    await message.deleteOne();
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting message', error: err });
  }
});

// Get all messages between the logged-in user and another user
router.get('/user/:userId', authMiddleware, async (req, res) => {
  // @ts-ignore
  const myId = req.userId;
  const otherId = req.params.userId;
  try {
    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: otherId },
        { sender: otherId, recipient: myId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages', error: err });
  }
});

export default router;

