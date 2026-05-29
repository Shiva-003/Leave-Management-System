import ApiError from "../utils/ApiError.js";
import pool from "./pool.js";

export const getUserById = async (id) => {
    const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.manager_id, u.department,
        ARRAY_AGG(tm.employee_id) FILTER (WHERE tm.employee_id IS NOT NULL) AS team_members
        FROM users u
        LEFT JOIN team_members tm ON tm.manager_id = u.id
        WHERE u.id = $1
        GROUP BY u.id`,
        [id]
    );

    return rows[0] || null;
}

export const getLeaveBalancesByUserId = async (userId) => {
    const { rows } = await pool.query(
        `SELECT leave_type AS "leaveType", allocated, used,
        (allocated - used) AS remaining
        FROM leave_balances
        WHERE user_id = $1
        ORDER BY leave_type`,
        [userId]
    );

    return rows;
}

export const getBalanceByType = async (userId, leaveType) => {
    const { rows } = await pool.query(
        `SELECT leave_type AS "leaveType",
        allocated, used, (allocated - used) AS remaining
        FROM leave_balances
        WHERE user_id = $1 AND leave_type = $2`,
        [userId, leaveType]
    );

    return rows[0] || null;
}


export const hasOverlap = async (userId, startDate, endDate) => {
    const { rows } = await pool.query(
        `SELECT id from leave_requests
        WHERE user_id = $1
         AND status IN ('Pending', 'Approved')
         AND start_date <= $3
         AND end_date >= $2
        LIMIT 1`,
        [userId, startDate, endDate] 
    );

    return rows.length > 0
}

export const createLeaveRequest = async (userId, userName, managerId, leaveType, startDate, endDate, numberOfDays, reason='') => {
    const { rows } = await pool.query(
    `INSERT INTO leave_requests
       (user_id, user_name, manager_id, leave_type, start_date, end_date, number_of_days, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, userName, managerId, leaveType, startDate, endDate, numberOfDays, reason]
  );
  return rows[0];
}

export const getLeaveRequestsByUser = async (userId, status, page = null, limit = null) => {
    const params = [userId];
    let whereClause = 'WHERE user_id = $1';

    if(status){
        params.push(status);
        whereClause += ` AND status = $${params.length}`;
    }

    const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM leave_requests ${whereClause}`,
        params
    );
    const total = countResult.rows[0].total;
      let paginationClause = '';

    if (page && limit) {
        const offset = (page - 1) * limit;

        params.push(limit, offset);

        paginationClause = `
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
        `;
    }

    const { rows } = await pool.query(
        `SELECT id, leave_type, start_date, end_date, number_of_days, reason, status, applied_at
        FROM leave_requests
        ${whereClause}
        ORDER BY applied_at DESC
        ${paginationClause}`,
        params
    );

    return { rows, total };
}

export const cancelLeaveRequest = async (leaveId, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: reqRows } = await client.query(
            `SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE`,
            [leaveId]
        );
        const request = reqRows[0];
        if (!request) {
            throw new ApiError(404, 'Leave request not found.');
        }
        if (request.user_id !== userId) {
            throw new ApiError(403, 'You can only cancel your own leave.');
        }
        if (request.status !== 'Pending'){
            throw new ApiError(400, `Only Pending leaves can be cancelled. Current status: ${request.status}`);
        } 

        const { rows: updated } = await client.query(
            `UPDATE leave_requests SET status = 'Cancelled' WHERE id = $1 RETURNING id, leave_type, start_date, end_date, number_of_days, reason, status, applied_at`,
            [leaveId]
        );

        await client.query('COMMIT');
        return updated[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
    
export const getLeaveRequestsByManager = async (managerId, status=null, employeeId=null, startDate=null, endDate=null) => {
  const params = [managerId];
  const conditions = ['manager_id = $1'];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (employeeId) {
    params.push(employeeId);
    conditions.push(`user_id = $${params.length}`);
  }
  if (startDate) {
    params.push(startDate);
    conditions.push(`start_date >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`end_date <= $${params.length}`);
  }

  const { rows } = await pool.query(
    `SELECT * FROM leave_requests
     WHERE ${conditions.join(' AND ')}
     ORDER BY applied_at DESC`,
    params
  );
  return rows;
}

export const approveLeaveRequest = async (leaveId, managerId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: reqRows } = await client.query(
        `SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE`,
        [leaveId]
        );
        const request = reqRows[0];
        if (!request){
            throw new ApiError(404, 'Leave request not found.');
        } 
        if (request.manager_id !== managerId){
            throw new ApiError(403, 'Access denied.');
        }
        if (request.status !== 'Pending'){
            throw new ApiError(400, `Cannot approve a leave with status: ${request.status}`);
        } 

        const { rows: balRows } = await client.query(
            `SELECT allocated, used, (allocated - used) AS remaining
            FROM leave_balances
            WHERE user_id = $1 AND leave_type = $2
            FOR UPDATE`,
            [request.user_id, request.leave_type]
        );

        const balance = balRows[0];
        if (!balance || balance.remaining < request.number_of_days) {
            throw new ApiError(400, `Insufficient ${request.leave_type} balance. Remaining: ${balance?.remaining ?? 0}, Required: ${request.number_of_days}`);
        }

        await client.query(
            `UPDATE leave_balances SET used = used + $1 WHERE user_id = $2 AND leave_type = $3`,
            [request.number_of_days, request.user_id, request.leave_type]
        );

        const { rows: updated } = await client.query(
            `UPDATE leave_requests SET status = 'Approved' WHERE id = $1 RETURNING id, user_id, user_name, leave_type, start_date, end_date, number_of_days, reason, status, applied_at`,
            [leaveId]
        );

        await client.query('COMMIT');
        return updated[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export const rejectLeaveRequest = async (leaveId, managerId, reason) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: reqRows } = await client.query(
        `SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE`,
        [leaveId]
        );
        const request = reqRows[0];
        if (!request){
            throw new ApiError(404, 'Leave request not found.');
        } 
        if (request.manager_id !== managerId){
            throw new ApiError(403, 'Access denied.');
        }
        if (request.status !== 'Pending'){
            throw new ApiError(400, `Cannot reject a leave with status: ${request.status}`);
        }

        const { rows: updated } = await client.query(
            `UPDATE leave_requests SET status = 'Rejected', rejection_reason = $1 WHERE id = $2 
             RETURNING id, user_id, user_name, leave_type, start_date, end_date, number_of_days, reason, status, rejection_reason, applied_at`,
            [reason, leaveId]
        );

        await client.query('COMMIT');
        return updated[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}