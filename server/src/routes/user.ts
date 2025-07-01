import { Router } from 'express';
import User from '../models/User';
import authMiddleware from '../middleware/auth';

const router = Router();

// Get all users (for 1-to-1 chat sidebar)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err });
  }
});

export default router;
