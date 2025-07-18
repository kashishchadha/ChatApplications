"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = (0, express_1.Router)();
// Get all users (for 1-to-1 chat sidebar) with online status
router.get('/', auth_1.default, async (req, res) => {
    try {
        const users = await User_1.default.find({}, '_id username isOnline lastSeen');
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching users', error: err });
    }
});
// Get online status for a specific user
router.get('/:userId/status', auth_1.default, async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.userId, 'isOnline lastSeen');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({ isOnline: user.isOnline, lastSeen: user.lastSeen });
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching user status', error: err });
    }
});
exports.default = router;
