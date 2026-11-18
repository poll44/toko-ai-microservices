import type { Request, Response, NextFunction } from 'express';

export function verifyInternalKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    res.status(401).json({ error: 'Unauthorized: Invalid Internal API Key' });
    return;
  }
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.headers['x-user-role'] as string) || 'GUEST';
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: `Forbidden: Role '${userRole}' tidak diizinkan mengakses endpoint ini.`,
      });
      return;
    }
    next();
  };
}