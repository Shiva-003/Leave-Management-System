import express from 'express';
import { getUserDetails, login } from '../controllers/auth.controller.js';
import { getHealthStatus } from '../controllers/health.controller.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', getUserDetails);

// health check
router.get('/health', getHealthStatus);


export default router;