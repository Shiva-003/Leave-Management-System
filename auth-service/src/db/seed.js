import bcrypt from 'bcryptjs';
import pool from './pool.js';
import logger from '../logger.js';

const USERS = [
    {id: 'mgr1', name:'Shivam Jayara', email: 'shivam@company.com', role: 'Manager', managerId: null, department: 'Engineering'},
    {id: 'emp1', name: 'John Doe', email: 'john@company.com', role: 'Employee', managerId: 'mgr1', department: 'Engineering'}
];

const TEAM_MEMBERS = [
    {managerId: 'mgr1', employeeId: 'emp1'}
];

const DEFAULT_BALANCES = [
    { leaveType: 'Casual', allocated: 12 },
    { leaveType: 'Sick', allocated: 10 },
    { leaveType: 'Privilege', allocated: 15 }
];


async function seed() {
    const client = await pool.connect();
    try{
        const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM users');
        if (rows[0].count > 0){
            logger.info('[SEED] Users already exists - skipping seed.');
            return;
        }

        logger.info('[SEED] Seeding database with predefined users');
        const passwordHash = await bcrypt.hash('password123', 10);

        await client.query('BEGIN');

        for (const user of USERS){
            await client.query(
                `INSERT INTO users(id, name, email, password_hash, role, manager_id, department)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [user.id, user.name, user.email, passwordHash, user.role, user.managerId, user.department]
            );
        }

        for (const tm of TEAM_MEMBERS){
            await client.query(
                `INSERT INTO team_members (manager_id, employee_id)
                 VALUES ($1, $2)`,
                [tm.managerId, tm.employeeId]
            );
        }

        const employees = USERS.filter((u) => u.role === 'Employee')
        for (const user of employees){
            for (const balance of DEFAULT_BALANCES){
                await client.query(
                    `INSERT INTO leave_balances (user_id, leave_type, allocated, used)
                     VALUES ($1, $2, $3, 0)`,
                    [user.id, balance.leaveType, balance.allocated]
                );
            }
        }

        await client.query('COMMIT');
        logger.info('[SEED] Database seeded successfully.');
        logger.info('[SEED] Password for all users: password123')
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('[SEED] Seeding failed: ', err.message);
        throw err;
    } finally {
        client.release();
    }
}

export default seed;