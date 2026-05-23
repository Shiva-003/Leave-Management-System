import ApiError from "../utils/ApiError.js";
import { findUserByEmail, findUserById } from "../db/queries.js";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import ApiResponse from '../utils/ApiResponse.js';

export const login = async (req, res) => {
    try{
        const {email, password} = req.body;

        if (!email || !password){
            throw new ApiError(400, "Missing required details");
        }

        const user = await findUserByEmail(email);
        if(!user){
            throw new ApiError(400, "Invalid Credentials");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if(!isPasswordValid){
            throw new ApiError(400, "Invalid Credentials");
        }

        const tokenPayload = {
            userId: user.id,
            role: user.role
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY});
        
        return res.status(200).json(
            new ApiResponse(200, { token: token }, "Login successfull")
        );
    } catch(err){
        throw err
    }
}

export const getUserDetails = async(req, res) => {
    try{
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        console.log("Token from header: ", token);
        if(!token){
            throw new ApiError(401, "Unauthorized Request")
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await findUserById(decoded.userId);
        if(!user){
            throw new ApiError(401, "Unauthorized Request");
        }

        const data = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            managerId : user.manager_id,
            teamMembers: user.team_members || []
        }

        return res.status(200).json(
            new ApiResponse(200, data, "User details fetched successfully")
        );
    }catch(err){
        throw err;
    }
}