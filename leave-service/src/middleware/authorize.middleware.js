import ApiError from "../utils/ApiError.js"

const authorize = (allowedRole) => async (req, res, next) => {
    if (!allowedRole) {
        throw new ApiError(401, 'Unauthorized Request');
    }

    if (req.user.role !== allowedRole) {
        throw new ApiError(403, 'Forbidden: Insufficient Permissions');
    }

    next();
}

export default authorize;