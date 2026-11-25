import { Router } from 'express';
import { StorageController } from '../controllers/storageController';
import { requireMasterReadKey, requireMasterStorageKey, uploadMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../utils/http';

const router: Router = Router();
router.post('/upload', requireMasterStorageKey, uploadMiddleware.single('file'), asyncHandler(StorageController.upload));
router.get('/internal/files/:fileId', requireMasterReadKey, asyncHandler(StorageController.internalRead));
router.get('/files/:fileId', asyncHandler(StorageController.clientSignedRead));

export default router;
