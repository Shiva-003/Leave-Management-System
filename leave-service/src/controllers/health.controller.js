import pool from "../db/pool.js";

export const getHealthStatus = async(req, res) => {
    try{
        await pool.query('SELECT 1');
        return res.status(200).json({
            status: 'healthy',
            service: process.env.SERVICE_NAME,
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch{
        return res.status(503).json({
            status: 'Unhealthy',
            service: process.env.SERVICE_NAME,
            database: 'disconnected',
            timestamp: new Date().toISOString()
        });
    }
}