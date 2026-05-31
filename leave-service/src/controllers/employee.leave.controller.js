import { createLeaveRequest, getBalanceByType, hasOverlap, getLeaveBalancesByUserId, getLeaveRequestsByUser, cancelLeaveRequest } from "../db/queries.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { publishMessage } from "../publisher.js";

const VALID_LEAVE_TYPES = ['Casual', 'Sick', 'Privilege'];
const VALID_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

// Routing key constants — format: leave.<event>.<recipient>
const RK = {
    APPLIED_LEAVE: 'leave.applied.manager',
    CANCELLED_LEAVE: 'leave.cancelled.manager',
};

export const getLeaveBalance = async (req, res) => {
    const userId = req.user.id;
    try {
        const leaveBalances = await getLeaveBalancesByUserId(userId);
        return res.status(200).json(
            new ApiResponse(200, leaveBalances, 'Leave balances retrieved successfully')
        );
    } catch (err) {
        console.error(`[${process.env.SERVICE_NAME}] Error fetching leave balance:`, err.message);
        throw err;
    }
};

export const applyLeave = async (req, res) => {
    try {
        const user = req.user;
        const { leaveType, startDate, endDate, numberOfDays, reason } = req.body;

        if(!leaveType || !startDate || !endDate || !numberOfDays) {
            throw new ApiError(400, 'Missing required details');
        }

        if (!VALID_LEAVE_TYPES.includes(leaveType)) {
            throw new ApiError(400, 'Invalid leave type');
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
           throw new ApiError(400, 'Invalid date format. Use YYYY-MM-DD.');
        }
        
        if (start < today || end < today) {
            throw new ApiError(400, 'Leave dates cannot be in the past');
        }

        if (end < start) {
            throw new ApiError(400, 'End date cannot be before start date');
        }

        if (numberOfDays <= 0) {
            throw new ApiError(400, 'Number of days must be greater than zero');
        }

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const balance = await getBalanceByType(user.id, leaveType);
        if (!balance || balance.remaining < numberOfDays){
            throw new ApiError(400, `Insufficient ${leaveType} leave balance. Available: ${balance?.remaining ?? 0} day(s), Requested: ${numberOfDays} day(s).`)
        }

        const overlap = await hasOverlap(user.id, startStr, endStr);
        if(overlap){
            throw new ApiError(400, "You already have a Pending or Approved leave overlapping with the requested dates.");
        }

        if(!user.managerId){
            throw new ApiError(400, "No reporting manager assigned to the user.");
        }

        const request = await createLeaveRequest(user.id, user.name, user.managerId, leaveType, startDate, endDate, numberOfDays, reason);

        publishMessage(RK.APPLIED_LEAVE, {
            type: 'LEAVE_APPLIED',
            recipientId: user.managerId,
            message: `${user.name} applied for ${leaveType} leave (${numberOfDays} day(s) from ${startStr} to ${endStr}. Awaiting your approval.)`
        });

        return res.status(201).json(
            new ApiResponse(201, request, "Leave application submitted successfully.")
        );
    } catch(err){
        console.log(`[${process.env.SERVICE_NAME}] Error while applying leave: `, err.message);
        throw err;
    }
}

export const getLeaveHistory = async (req, res) => {
    try{
        const { id: userId } = req.user;
        const { status } = req.query;
        const page = req.query.page
                    ? Math.max(1, parseInt(req.query.page))
                    : null;

        const limit = req.query.limit
                    ? Math.min(100, parseInt(req.query.limit))
                    : null;

        if (status && !VALID_STATUSES.includes(status)) {
            throw new ApiError(400, `Invalid status. Allowed values are: ${VALID_STATUSES.join(', ')}`);
        }

        const {rows, total} = await getLeaveRequestsByUser(userId, status, page, limit);

        const responseData = {
            leaves: rows
        };

        if (page && limit) {
        responseData.pagination = {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
        }
        return res.status(200).json(
            new ApiResponse(200, responseData, "Leave history retrieved successfully.")
        );
    } catch(err){
        throw err;
    }
}

export const cancelLeave = async (req, res) => {
    try{
        const leaveId = req.params.leaveId;
        const userId = req.user.id;
        
        const updated = await cancelLeaveRequest(leaveId, userId);

        const startStr = updated.start_date.toISOString().split('T')[0];
        const endStr = updated.end_date.toISOString().split('T')[0];

        publishMessage(RK.CANCELLED_LEAVE, {
            type: 'LEAVE_CANCELLED',
            recipientId: req.user.managerId,
            message: `${req.user.name} has cancelled ${updated.leave_type} leave from ${startStr} to ${endStr}.`
        });

        return res.status(200).json(
            new ApiResponse(200, updated, "Leave request cancelled successfully.")
        );
    } catch(err){
        throw err;
    }
}