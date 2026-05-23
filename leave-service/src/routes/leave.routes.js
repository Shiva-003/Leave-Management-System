import express from 'express';

const leaveRouter = express.Router();

// Employee routes
leaveRouter.get('/balance');
leaveRouter.post('/apply');
leaveRouter.get('/history');
leaveRouter.delete('/cancel/:id');


// Manager routes
leaveRouter.get('/requests');
leaveRouter.get('/requests/:id');
leaveRouter.post('/requests/:id/approve');
leaveRouter.post('/requests/:id/reject');

export default leaveRouter;