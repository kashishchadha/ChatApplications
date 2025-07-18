"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Message_1 = __importDefault(require("../models/Message"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = (0, express_1.Router)();
// Helper to ensure userId is a string
function getUserId(req) {
    if (!req.userId || typeof req.userId !== 'string') {
        throw new Error('Invalid userId');
    }
    return req.userId;
}
// Get messages for a group
router.get('/group/:groupId', auth_1.default, async (req, res) => {
    try {
        const messages = await Message_1.default.find({ group: req.params.groupId }).sort({ createdAt: 1 }).populate('sender', 'username');
        res.json(messages);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching group messages' });
    }
});
// Update a message
router.put('/:messageId', auth_1.default, async (req, res) => {
    try {
        const { content } = req.body;
        const message = await Message_1.default.findById(req.params.messageId);
        const userId = getUserId(req);
        if (!message || message.sender.toString() !== userId) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }
        message.content = content;
        await message.save();
        res.json(message);
    }
    catch (err) {
        res.status(500).json({ message: 'Error updating message' });
    }
});
// Delete a message
router.delete('/:messageId', auth_1.default, async (req, res) => {
    try {
        const message = await Message_1.default.findById(req.params.messageId);
        const userId = getUserId(req);
        if (!message || message.sender.toString() !== userId) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }
        await message.deleteOne();
        res.json({ message: 'Message deleted' });
    }
    catch (err) {
        res.status(500).json({ message: 'Error deleting message' });
    }
});
// Get all messages between the logged-in user and another user
router.get('/user/:userId', auth_1.default, async (req, res) => {
    const myId = getUserId(req);
    const otherId = req.params.userId;
    try {
        const messages = await Message_1.default.find({
            $or: [
                { sender: myId, recipient: otherId },
                { sender: otherId, recipient: myId }
            ]
        })
            .sort({ createdAt: 1 })
            .populate('sender', 'username')
            .populate('recipient', 'username');
        res.json(messages);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
});
// Create a message with optional file attachment
router.post('/', auth_1.default, async (req, res) => {
    try {
        const { content, recipient, group, fileAttachment, forwarded } = req.body;
        const sender = getUserId(req);
        const messageData = {
            sender,
            content: content || '',
            createdAt: new Date()
        };
        if (recipient)
            messageData.recipient = recipient;
        if (group)
            messageData.group = group;
        if (fileAttachment)
            messageData.fileAttachment = fileAttachment;
        if (typeof forwarded !== 'undefined')
            messageData.forwarded = forwarded;
        const message = new Message_1.default(messageData);
        await message.save();
        res.status(201).json(message);
    }
    catch (err) {
        res.status(500).json({ message: 'Error creating message' });
    }
});
// Mark a message as seen (WhatsApp-style read receipt)
router.post('/:messageId/seen', auth_1.default, async (req, res) => {
    try {
        const userId = getUserId(req);
        const { messageId } = req.params;
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        if (!message.seenBy.map(String).includes(userId)) {
            message.seenBy.push(userId);
            await message.save();
        }
        res.json({ success: true, seenBy: message.seenBy });
    }
    catch (err) {
        res.status(500).json({ message: 'Error marking message as seen' });
    }
});
// Mark a message as delivered (WhatsApp-style double tick)
router.post('/:messageId/delivered', auth_1.default, async (req, res) => {
    try {
        const userId = getUserId(req);
        const { messageId } = req.params;
        const message = await Message_1.default.findById(messageId);
        if (!message) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        if (!message.deliveredTo.map(String).includes(userId)) {
            message.deliveredTo.push(userId);
            await message.save();
        }
        res.json({ success: true, deliveredTo: message.deliveredTo });
    }
    catch (err) {
        res.status(500).json({ message: 'Error marking message as delivered' });
    }
});
exports.default = router;
