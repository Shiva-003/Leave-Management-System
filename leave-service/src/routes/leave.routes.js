import express from 'express';
import authenticate from '../middleware/authentication.middleware.js';
import authorize from '../middleware/authorize.middleware.js';
import { applyLeave, cancelLeave, getLeaveBalance, getLeaveHistory } from '../controllers/employee.leave.controller.js';
import { getTeamLeaves, approveLeave, rejectLeave } from '../controllers/manager.leave.controller.js';
import { getHealthStatus } from '../controllers/health.controller.js';

const router = express.Router();

// Employee routes
router.get('/balance', authenticate, authorize("Employee"), getLeaveBalance);
router.post('/apply', authenticate, authorize("Employee"), applyLeave);
router.get('/history', authenticate, authorize("Employee"), getLeaveHistory);
router.delete('/:leaveId/cancel', authenticate, authorize("Employee"), cancelLeave);


// // Manager routes
router.get('/requests', authenticate, authorize("Manager"), getTeamLeaves);
router.post('/requests/:leaveId/approve', authenticate, authorize("Manager"), approveLeave);
router.post('/requests/:leaveId/reject', authenticate, authorize("Manager"), rejectLeave);

// health check
router.get('/health', getHealthStatus);

export default router;