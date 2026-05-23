import pool from './pool.js';

export async function findUserByEmail(email){
    const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.manager_id, u.department,
        ARRAY_AGG(tm.employee_id) FILTER (WHERE tm.employee_id IS NOT NULL) AS team_members
        FROM users u
        LEFT JOIN team_members tm ON tm.manager_id = u.id
        WHERE u.email = $1
        GROUP BY u.id`,
        [email]
    );

    return rows[0] || null;
}


export async function findUserById(id){
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