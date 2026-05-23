import express from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/auth.middleware';
import { createMemory, getMemories, getTrash, softDeleteMemory, restoreMemory, hardDeleteMemory, deleteMemoryFile } from '../controllers/memory.controller';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
});

router.use(verifyToken);

router.post('/', upload.array('files'), createMemory);
router.get('/', getMemories);
router.get('/trash', getTrash);
router.delete('/file/:fileId', deleteMemoryFile);
router.delete('/:id', softDeleteMemory);
router.put('/:id/restore', restoreMemory);
router.delete('/:id/hard', hardDeleteMemory);

export default router;