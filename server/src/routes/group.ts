import { Router, Request, Response } from 'express';
import Group from '../models/Group';
import User from '../models/User';
import authMiddleware from '../middleware/auth';
import mongoose from 'mongoose';

const router = Router();

console.log('Group routes loaded');

// Create a new group
router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  const { name, members } = req.body; 
  try {
    const group = await Group.create({ name, members });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: 'Error creating group', error: err });
  }
});


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

// Update group name
router.put('/:groupId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    group.name = name;
    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: 'Error updating group', error: err });
  }
});

// Delete group
router.delete('/:groupId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    await group.deleteOne();
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting group', error: err });
  }
});

// Remove a member from a group
router.post('/:groupId/remove-member', authMiddleware, async (req, res) => {
  const { memberId } = req.body;
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $pull: { members: new mongoose.Types.ObjectId(memberId) } },
      { new: true }
    ).populate('members', '_id username');
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    res.json(group.members);
  } catch (err) {
    res.status(500).json({ message: 'Error removing member', error: err });
  }
});

router.use((req, res) => {
  res.status(404).json({ message: 'Group route not found', url: req.originalUrl });
});

export default router;
