import "dotenv/config";
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import router from './routes/notification.routes.js';
import globalErrorHandler from './utils/globalErrorHandler.js';
import startConsumer from "./consumer.js";
import ApiError from "./utils/ApiError.js";
import logger from './logger.js';

const app = express();
const PORT = process.env.PORT || 3003;
let server;

// Middlewares
app.use(cors({ origin: process.env.ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(morgan('combined', { 
  stream: { write: (msg) => logger.info(msg.trim()) } ,
  skip: (req) => req.path.includes('/health')
}));

// Routes
app.use('/notification', router);

app.use((req, res) => {
  throw new ApiError(404, 'Endpoint not found');
});

// Error Handler
app.use(globalErrorHandler);

async function start() {
  server = app.listen(PORT, async () => {
    logger.info(`Running on port ${PORT}`);
  });
  await startConsumer();
}
  
const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down...`);
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