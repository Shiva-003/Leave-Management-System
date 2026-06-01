import { Pool } from 'pg';
import logger from '../logger.js';

const pool = new Pool({
    host:   process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
})

pool.on('connect', ()=>{
    // logger.info(`New client connected to PostgreSQL`);
});

pool.on('error', (err) => {
    logger.error(`Unexpected pool error:`, err.message);
})

export default pool;