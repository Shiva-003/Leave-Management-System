import express from 'express';
import { getUserDetails, login } from '../controllers/auth.controller.js';

const authRouter = express.Router();

authRouter.post('/login', login);
authRouter.get('/me', getUserDetails);


export default authRouter;