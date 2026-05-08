"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.loginUser = exports.registerUser = void 0;
const prisma_1 = require("../lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const generateToken_1 = __importDefault(require("../utils/generateToken"));
const validation_1 = require("../utils/validation");
const schemas_1 = require("../schemas");
const registerUser = async (req, res) => {
    const validation = schemas_1.UserRegisterSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            error: { message: (0, validation_1.getFirstValidationMessage)(validation.error) },
        });
    }
    const { name, email, password } = validation.data;
    const userExists = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (userExists) {
        return res
            .status(400)
            .json({ error: { message: "User with this email already exists" } });
    }
    //hash password
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(password, salt);
    //Create user
    const user = await prisma_1.prisma.user.create({
        data: {
            username: name,
            email: email,
            passwordHash: hashedPassword,
        },
    });
    const token = (0, generateToken_1.default)(user.id, res);
    res.status(201).json({
        status: "success",
        data: {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
            },
            token,
        },
    });
};
exports.registerUser = registerUser;
const loginUser = async (req, res) => {
    const validation = schemas_1.UserLoginSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            error: { message: (0, validation_1.getFirstValidationMessage)(validation.error) },
        });
    }
    const { email, password } = validation.data;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
        return res
            .status(400)
            .json({ error: { message: "Invalid email or password" } });
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        return res
            .status(400)
            .json({ error: { message: "Invalid email or password" } });
    }
    const token = (0, generateToken_1.default)(user.id, res);
    res.status(200).json({
        status: "success",
        data: {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
            },
            token,
        },
    });
};
exports.loginUser = loginUser;
const logout = async (req, res) => {
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({
        status: "success",
        message: "logged out successfully",
    });
};
exports.logout = logout;
