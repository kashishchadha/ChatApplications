"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Group_1 = __importDefault(require("../models/Group"));
const auth_1 = __importDefault(require("../middleware/auth"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
console.log('Group routes loaded');
// Create a new group
router.post('/create', auth_1.default, async (req, res) => {
    const { name, members } = req.body;
    try {
        // @ts-ignore
        const creator = req.userId;
        const group = await Group_1.default.create({ name, members, creator });
        res.status(201).json(group);
    }
    catch (err) {
        res.status(500).json({ message: 'Error creating group', error: err });
    }
});
//all groups
router.get('/my', auth_1.default, async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.userId;
        const groups = await Group_1.default.find({ members: userId }).populate('creator', '_id username');
        res.json(groups);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching groups', error: err });
    }
});
// Get members of a group
router.get('/:groupId/members', auth_1.default, async (req, res) => {
    try {
        const group = await Group_1.default.findById(req.params.groupId).populate('members', '_id username');
        if (!group) {
            res.status(404).json({ message: 'Group not found' });
            return;
        }
        res.json(group.members);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching group members', error: err });
    }
});
// Add members to a group
router.post('/:groupId/add-members', auth_1.default, async (req, res) => {
    const { members } = req.body; // members: array of userIds to add
    try {
        const group = await Group_1.default.findByIdAndUpdate(req.params.groupId, { $addToSet: { members: { $each: members } } }, // $addToSet prevents duplicates
        { new: true }).populate('members', '_id username');
        if (!group) {
            res.status(404).json({ message: 'Group not found' });
            return;
        }
        res.json(group.members);
    }
    catch (err) {
        res.status(500).json({ message: 'Error adding members', error: err });
    }
});
// Update group name
router.put('/:groupId', auth_1.default, async (req, res) => {
    try {
        const { name } = req.body;
        const group = await Group_1.default.findById(req.params.groupId);
        if (!group) {
            res.status(404).json({ message: 'Group not found' });
            return;
        }
        group.name = name;
        await group.save();
        res.json(group);
    }
    catch (err) {
        res.status(500).json({ message: 'Error updating group', error: err });
    }
});
// Delete group
router.delete('/:groupId', auth_1.default, async (req, res) => {
    try {
        const group = await Group_1.default.findById(req.params.groupId);
        if (!group) {
            res.status(404).json({ message: 'Group not found' });
            return;
        }
        if (group.creator.toString() !== req.userId) {
            res.status(403).json({ message: 'Only the group creator can delete this group.' });
            return;
        }
        await group.deleteOne();
        res.json({ message: 'Group deleted successfully' });
    }
    catch (err) {
        res.status(500).json({ message: 'Error deleting group', error: err });
    }
});
// Remove a member from a group
router.post('/:groupId/remove-member', auth_1.default, async (req, res) => {
    const { memberId } = req.body;
    try {
        const group = await Group_1.default.findByIdAndUpdate(req.params.groupId, { $pull: { members: new mongoose_1.default.Types.ObjectId(memberId) } }, { new: true }).populate('members', '_id username');
        if (!group) {
            res.status(404).json({ message: 'Group not found' });
            return;
        }
        res.json(group.members);
    }
    catch (err) {
        res.status(500).json({ message: 'Error removing member', error: err });
    }
});
router.use((req, res) => {
    res.status(404).json({ message: 'Group route not found', url: req.originalUrl });
});
exports.default = router;
