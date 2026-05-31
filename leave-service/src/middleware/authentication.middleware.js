import jwt from 'jsonwebtoken';
import { getUserById } from '../db/queries.js';
import ApiError from '../utils/ApiError.js';

const authenticate = async (req, res, next) => {
    const expectedConsumer = process.env.KONG_CONSUMER_USERNAME || 'lms-auth';
    const expectedCredential = process.env.JWT_ISSUER || 'lms-issuer';
    const consumerUsername = req.headers['x-consumer-username'];
    const credentialIdentifier = req.headers['x-credential-identifier'];

    if (consumerUsername !== expectedConsumer || credentialIdentifier !== expectedCredential) {
        throw new ApiError(401, 'Unauthorized Request');
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError(401, 'Unauthorized Request');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.userId || !decoded.role) {
            throw new ApiError(401, 'Unauthorized Request');
        }

        const user = await getUserById(decoded.userId);
        if (!user) {
            throw new ApiError(401, 'Unauthorized Request');
        }
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            managerId: user.manager_id || null,
            department: user.department || null,
            teamMembers: user.team_members || []
        };
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        throw new ApiError(401, 'Unauthorized Request');
    }
};

export default authenticate;