import express from 'express';
import upload from '../middleware/upload';
import authMiddleware from '../middleware/auth';
import path from 'path';

const router = express.Router();

// Upload file endpoint
router.post('/file', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    // Create file info object
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    };

    res.json({
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Serve uploaded files
router.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../../uploads', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ message: 'File not found' });
    }
  });
});

export default router; 