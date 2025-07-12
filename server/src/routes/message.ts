import { Router, Request, Response } from 'express';
import Message from '../models/Message';
import authMiddleware from '../middleware/auth';

const router = Router();

// Extend Request type to include userId
interface AuthRequest extends Request {
  userId?: string;
}

// Helper to ensure userId is a string
function getUserId(req: AuthRequest): string {
  if (!req.userId || typeof req.userId !== 'string') {
    throw new Error('Invalid userId');
  }
  return req.userId;
}

// Get messages for a group
router.get('/group/:groupId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await Message.find({ group: req.params.groupId }).sort({ createdAt: 1 }).populate('sender','username');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching group messages' });
  }
});

// Update a message
router.put('/:messageId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.messageId);
    const userId = getUserId(req);
    if (!message || message.sender.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    message.content = content;
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Error updating message' });
  }
});

// Delete a message
router.delete('/:messageId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.findById(req.params.messageId);
    const userId = getUserId(req);
    if (!message || message.sender.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }
    await message.deleteOne();
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting message' });
  }
});

// Get all messages between the logged-in user and another user
router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const myId = getUserId(req);
  const otherId = req.params.userId;
  try {
    const messages = await Message.find({
      $or: [
        { sender: myId, recipient: otherId },
        { sender: otherId, recipient: myId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username')
      .populate('recipient', 'username');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Create a message with optional file attachment
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, recipient, group, fileAttachment, forwarded } = req.body;
    const sender = getUserId(req);

    const messageData: any = {
      sender,
      content: content || '',
      createdAt: new Date()
    };

    if (recipient) messageData.recipient = recipient;
    if (group) messageData.group = group;
    if (fileAttachment) messageData.fileAttachment = fileAttachment;
    if (typeof forwarded !== 'undefined') messageData.forwarded = forwarded;

    const message = new Message(messageData);
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Error creating message' });
  }
});

// Mark a message as seen (WhatsApp-style read receipt)
router.post('/:messageId/seen', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }
    if (!message.seenBy.map(String).includes(userId)) {
      message.seenBy.push(userId);
      await message.save();
    }
    res.json({ success: true, seenBy: message.seenBy });
  } catch (err) {
    res.status(500).json({ message: 'Error marking message as seen' });
  }
});

// Mark a message as delivered (WhatsApp-style double tick)
router.post('/:messageId/delivered', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }
    if (!message.deliveredTo.map(String).includes(userId)) {
      message.deliveredTo.push(userId);
      await message.save();
    }
    res.json({ success: true, deliveredTo: message.deliveredTo });
  } catch (err) {
    res.status(500).json({ message: 'Error marking message as delivered' });
  }
});

export default router;

