import express from 'express';

const healthRouter = express.Router();

healthRouter.get('/');

export default healthRouter;