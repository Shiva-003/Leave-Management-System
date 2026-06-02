import "dotenv/config";
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import router from "./routes/leave.routes.js";
import globalErrorHandler from './utils/globalErrorHandler.js';
import pool from "./db/pool.js";
import { connectPublisher } from "./publisher.js";
import ApiError from "./utils/ApiError.js";
import logger from './logger.js';
import { registerServiceWithConsul, deregisterServiceFromConsul } from "./services/consul.service.js";

const app = express();
const PORT = process.env.PORT || 3002;
let server;

// Middlewares
app.use(cors({ origin: process.env.ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(cookieParser());
app.use(morgan('combined', { 
  stream: { write: (msg) => logger.info(msg.trim()) } ,
  skip: (req) => req.path.includes('/health')
}));

// Routes
app.use('/leave', router);

app.use((req, res) => {
  throw new ApiError(404, 'Endpoint not found');
});

// Error Handler
app.use(globalErrorHandler);

// Startup 
async function waitForDb(retries = 5, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      logger.info('PostgreSQL is ready.');
      return;
    } catch (err) {
      logger.warn(`DB not ready (attempt ${i}/${retries}): ${err.message}`);
      if (i < retries) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Cannot connect to PostgreSQL after all retries.');
}

async function start() {
  await waitForDb();
  connectPublisher().catch((err) => {
    logger.warn(`RabbitMQ unavailable: ${err.message}`);
  })
  server = app.listen(PORT, async () => {
    logger.info(`Running on port ${PORT}`);

    try {
      await registerServiceWithConsul();
    } catch (err) {
      logger.error('Consul registration failed', { error: err.message });
      process.exitCode = 1;
    }
  });
}
  
const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down...`);

  try {
    await deregisterServiceFromConsul();
  } catch (err) {
    logger.error('Consul deregistration failed', { error: err.message });
  }

  if (server) {
    server.close(() => {
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 5000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((err) => {
  logger.error('Fatal startup error', { error: err.message });
  process.exit(1);
});
