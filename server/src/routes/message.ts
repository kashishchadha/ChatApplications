import { Router } from 'express';
import Message from '../models/Message';
import authMiddleware from '../middleware/auth';

const router = Router();

// Get messages for a group
router.get('/group/:groupId', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ group: req.params.groupId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages', error: err });
  }
});

export default router;

