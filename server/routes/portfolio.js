import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create router
const router = express.Router();

// Create uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
console.log('Uploads directory:', uploadsDir);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Create multer instance with memory storage first
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Portfolio router is working' });
});

// Upload route
router.post('/upload', auth, (req, res) => {
  console.log('Starting file upload process');
  console.log('Content-Type:', req.headers['content-type']);
  
  // Use multer middleware
  upload.single('portfolio')(req, res, async function(err) {
    console.log('Inside multer callback');
    
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        error: 'File upload error',
        details: err.message
      });
    }
    
    if (!req.file) {
      console.error('No file in request');
      console.log('Request body:', req.body);
      console.log('Request headers:', req.headers);
      return res.status(400).json({
        error: 'No file uploaded AGAIN',
        details: 'Make sure you are sending a file with field name "portfolio"'
      });
    }
    
    try {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `portfolio-${uniqueSuffix}-${req.file.originalname}`;
      const filepath = path.join(uploadsDir, filename);
      
      // Write file to disk
      await fs.promises.writeFile(filepath, req.file.buffer);
      
      console.log('File saved successfully:', {
        originalname: req.file.originalname,
        filename: filename,
        size: req.file.size,
        path: filepath
      });
      
      res.json({
        message: 'File uploaded successfully',
        file: {
          name: filename,
          originalName: req.file.originalname,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('Error saving file:', error);
      res.status(500).json({
        error: 'Failed to save file',
        details: error.message
      });
    }
  });
});

export { router as default }; 