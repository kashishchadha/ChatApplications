import { Router } from 'express';
import User from '../models/User';
import authMiddleware from '../middleware/auth';

const router = Router();

// Get all users (for 1-to-1 chat sidebar) with online status
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, '_id username isOnline lastSeen');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err });
  }
});

// Get online status for a specific user
router.get('/:userId/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId, 'isOnline lastSeen');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ isOnline: user.isOnline, lastSeen: user.lastSeen });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user status', error: err });
  }
});

export default router;
