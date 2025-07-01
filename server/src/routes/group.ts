import { Router, Request, Response } from 'express';
import Group from '../models/Group';
import User from '../models/User';
import authMiddleware from '../middleware/auth';

const router = Router();

// Create a new group
router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  const { name, members } = req.body; // members: array of userIds
  try {
    const group = await Group.create({ name, members });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: 'Error creating group', error: err });
  }
});

// Get all groups for a user
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId; // userId is set by authMiddleware
    const groups = await Group.find({ members: userId });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching groups', error: err });
  }
});

// Get members of a group
router.get('/:groupId/members', authMiddleware, async (req: Request, res: Response) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('members', '_id username');
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    res.json(group.members);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching group members', error: err });
  }
});

// Add members to a group
router.post('/:groupId/add-members', authMiddleware, async (req: Request, res: Response) => {
  const { members } = req.body; // members: array of userIds to add
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $addToSet: { members: { $each: members } } }, // $addToSet prevents duplicates
      { new: true }
    ).populate('members', '_id username');
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    res.json(group.members);
  } catch (err) {
    res.status(500).json({ message: 'Error adding members', error: err });
  }
});

export default router;
