import { Pool } from 'pg';

const pool = new Pool({
    host:   process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
})

pool.on('connect', ()=>{
    console.log(`[${process.env.SERVICE_NAME}] New client connected to PostgreSQL`)
});

pool.on('error', (err) => {
    console.error(`[${process.env.SERVICE_NAME}] Unexpected pool error:`, err.message);
})

export default pool;