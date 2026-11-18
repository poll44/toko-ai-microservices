import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function extractUserFromJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.headers['x-user-id'] = '';
    req.headers['x-user-role'] = 'GUEST';
    next();
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-role'] = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: Token JWT tidak valid atau kedaluwarsa' });
  }
}