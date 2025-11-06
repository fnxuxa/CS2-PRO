import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUser } from './auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    steamId: string;
    steamName: string;
  };
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  const user = getUser(payload.steamId);
  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado.' });
  }

  req.user = {
    steamId: payload.steamId,
    steamName: payload.steamName,
  };

  next();
}



