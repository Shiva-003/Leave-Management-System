import pool from "../db/pool.js";
import { getLeaveRequestsByManager, approveLeaveRequest, rejectLeaveRequest } from "../db/queries.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const VALID_STATUSES    = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

export const getTeamLeaves = async (req, res) => {
    try {
        const { status, employeeId, startDate, endDate } = req.query;

        if (status && !VALID_STATUSES.includes(status)) {
            throw new ApiError(400, `Invalid status. Allowed values are: ${VALID_STATUSES.join(', ')}`);
        }  

        const requests = await getLeaveRequestsByManager(req.user.id, status, employeeId, startDate, endDate);

        return res.status(200).json(
            new ApiResponse(200, { total: requests.length, requests }, "Team leave requests retrieved successfully.")
        );
    } catch (err) {
        throw err;
    }
}

export const approveLeave = async (req, res) => {
    try{
        const updated = await approveLeaveRequest(req.params.leaveId, req.user.id);
        return res.status(200).json(
            new ApiResponse(200, updated, "Leave request approved successfully.")
        );
    } catch (err) {
        throw err;
    }
}

export const rejectLeave = async (req, res) => {
    try{
        const { reason } = req.body;
        if (!reason || reason.trim() === '') {
            throw new ApiError(400, 'Rejection reason is required.');
        }

        const updated = await rejectLeaveRequest(req.params.leaveId, req.user.id, reason);
        return res.status(200).json(
            new ApiResponse(200, updated, "Leave request rejected successfully.")
        );
    } catch (err) {
        throw err;
    }
}   