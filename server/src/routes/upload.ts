import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import multer from 'multer';
import ImageKit from 'imagekit';
import authMiddleware from '../middleware/auth';

const router = express.Router();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

const upload = multer(); // memory storage

// Upload file endpoint
router.post('/file', authMiddleware, upload.single('file'), async (req, res) => {
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
    } else {
      // Optionally handle non-image files as before, or return error
      res.status(400).json({ message: 'Only image uploads are supported via ImageKit.' });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

export default router; 