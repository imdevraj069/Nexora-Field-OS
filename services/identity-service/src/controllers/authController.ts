import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

export const AuthController = {
  superadminLogin: async (req: Request, res: Response) => {
    const result = await AuthService.superadminLogin(req.body.username, req.body.password);
    res.json(result);
  },
  register: async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  },
  verifyEmail: async (req: Request, res: Response) => {
    const result = await AuthService.verifyEmail(req.body.email, req.body.otp);
    res.json(result);
  },
  login: async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body.email, req.body.password, req.body.orgId);
    res.json(result);
  },
  requestReset: async (req: Request, res: Response) => {
    const result = await AuthService.requestReset(req.body.email);
    res.json(result);
  },
  resetPassword: async (req: Request, res: Response) => {
    const result = await AuthService.resetPassword(req.body.email, req.body.resetToken, req.body.newPassword);
    res.json(result);
  },
};
