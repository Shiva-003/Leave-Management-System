import "dotenv/config";
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import router from './routes/auth.routes.js';
import globalErrorHandler from './utils/globalErrorHandler.js';
import pool from "./db/pool.js";
import seed from "./db/seed.js";
import ApiError from "./utils/ApiError.js";
import { registerServiceWithConsul, deregisterServiceFromConsul } from "./services/consul.service.js";

const app = express();
const PORT = process.env.PORT || 3001;
let server;

// Middlewares
app.use(cors({ origin: process.env.ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(cookieParser());
app.use(morgan('combined'));

// Routes
app.use('/auth', router);

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
      console.log(`[${process.env.SERVICE_NAME}] PostgreSQL is ready.`);
      return;
    } catch (err) {
      console.warn(`[${process.env.SERVICE_NAME}] DB not ready (attempt ${i}/${retries}): ${err.message}`);
      if (i < retries) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Cannot connect to PostgreSQL after all retries.');
}

async function start() {
  await waitForDb();
  await seed();
  server = app.listen(PORT, async () => {
    console.log(`[${process.env.SERVICE_NAME}] Running on port ${PORT}`);

    try {
      await registerServiceWithConsul();
    } catch (err) {
      console.error(`[${process.env.SERVICE_NAME}] Consul registration failed:`,err.message);
      process.exitCode = 1;
    }
  });
}

const shutdown = async (signal) => {
  console.log(`[${process.env.SERVICE_NAME}] Received ${signal}, shutting down...`);

  try {
    await deregisterServiceFromConsul();
  } catch (err) {
    console.error(`[${process.env.SERVICE_NAME}] Consul deregistration failed:`,err.message);
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
  console.error(`[${process.env.SERVICE_NAME}] Fatal startup error:`, err.message);
  process.exit(1);
});
