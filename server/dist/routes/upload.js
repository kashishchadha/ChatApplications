"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const imagekit_1 = __importDefault(require("imagekit"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
const imagekit = new imagekit_1.default({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});
const upload = (0, multer_1.default)(); // memory storage
// Upload file endpoint
router.post('/file', auth_1.default, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }
        // Only handle images for ImageKit
        if (req.file.mimetype.startsWith('image/')) {
            const uploadResponse = await imagekit.upload({
                file: req.file.buffer,
                fileName: req.file.originalname,
                folder: '/chatapp',
            });
            res.json({
                message: 'File uploaded successfully',
                file: {
                    url: uploadResponse.url,
                    name: uploadResponse.name,
                    type: req.file.mimetype,
                    size: req.file.size,
                }
            });
        }
        else {
            // Optionally handle non-image files as before, or return error
            res.status(400).json({ message: 'Only image uploads are supported via ImageKit.' });
        }
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});
exports.default = router;
