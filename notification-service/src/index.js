import "dotenv/config";
import express from 'express';
// import cors from 'cors';
// import cookieParser from 'cookie-parser';
import morgan from 'morgan';
// import notificationRouter from "./routes/notification.routes";
import healthRouter from './routes/health.routes.js';
import globalErrorHandler from './utils/globalErrorHandler.js';
// import pool from "./db/pool";
import startConsumer from "./consumer.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
// app.use(cors({ origin: process.env.ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: "16kb" }));
// app.use(express.urlencoded({ limit: "16kb", extended: true }));
// app.use(cookieParser());
app.use(morgan('combined'));

// Routes
// app.use('/notifications', notificationRouter);
app.use('/health', healthRouter);

// Error Handler
app.use(globalErrorHandler);

// Startup 
// async function waitForDb(retries = 5, delay = 3000) {
//   for (let i = 1; i <= retries; i++) {
//     try {
//       await pool.query('SELECT 1');
//       console.log(`[${process.env.SERVICE_NAME}] PostgreSQL is ready.`);
//       return;
//     } catch (err) {
//       console.warn(`[${process.env.SERVICE_NAME}] DB not ready (attempt ${i}/${retries}): ${err.message}`);
//       if (i < retries) await new Promise((r) => setTimeout(r, delay));
//     }
//   }
//   throw new Error('Cannot connect to PostgreSQL after all retries.');
// }

async function start() {
  // await waitForDb();
  app.listen(PORT, () => {
    console.log(`[${process.env.SERVICE_NAME}] Running on port ${PORT}`);
  });
  await startConsumer();
}

start().catch((err) => {
  console.error(`[${process.env.SERVICE_NAME}] Fatal startup error:`, err.message);
  process.exit(1);
});
