import express from 'express';
import authenticate from '../middleware/authentication.middleware.js';
import authorize from '../middleware/authorize.middleware.js';
import { applyLeave, cancelLeave, getLeaveBalance, getLeaveHistory } from '../controllers/employee.leave.controller.js';
import { getTeamLeaves, approveLeave, rejectLeave } from '../controllers/manager.leave.controller.js';

const leaveRouter = express.Router();

// Employee routes
leaveRouter.get('/balance', authenticate, authorize("Employee"), getLeaveBalance);
leaveRouter.post('/apply', authenticate, authorize("Employee"), applyLeave);
leaveRouter.get('/history', authenticate, authorize("Employee"), getLeaveHistory);
leaveRouter.delete('/:leaveId/cancel', authenticate, authorize("Employee"), cancelLeave);


// // Manager routes
leaveRouter.get('/requests', authenticate, authorize("Manager"), getTeamLeaves);
leaveRouter.post('/requests/:leaveId/approve', authenticate, authorize("Manager"), approveLeave);
leaveRouter.post('/requests/:leaveId/reject', authenticate, authorize("Manager"), rejectLeave);

export default leaveRouter;