import express from 'express';

const authRouter = express.Router();

authRouter.post('/login');
authRouter.post('/logout');
authRouter.post('/verify');
authRouter.get('/me');


export default authRouter;