export const getHealthStatus = (_req, res) => {
    return res.status(200).json({
        status: 'healthy',
        service: process.env.SERVICE_NAME,
        timestamp: new Date().toISOString()
    });
}