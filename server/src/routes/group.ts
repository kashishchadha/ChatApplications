import { Router } from 'express';
import Group from '../models/Group';
import User from '../models/User';
import authMiddleware from '../middleware/auth';

const router = Router();

// Create a new group
router.post('/create', authMiddleware, async (req: any, res) => {
  const { name, members } = req.body; // members: array of userIds
  try {
    const group = await Group.create({ name, members });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: 'Error creating group', error: err });
  }
});

// Get all groups for a user
router.get('/my', authMiddleware, async (req: any, res) => {
  try {
    const groups = await Group.find({ members: req.userId });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching groups', error: err });
  }
});

export default router;
