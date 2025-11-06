import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'cs2-pro-secret-key-change-in-production';
const USERS_FILE = path.join(process.cwd(), 'storage', 'users.json');

export interface User {
  steamId: string;
  steamName: string;
  avatar: string;
  plan: 'free' | 'premium';
  freeAnalysesUsed: number;
  premiumAnalysesRemaining: number;
  createdAt: string;
  lastLogin: string;
}

export interface JwtPayload {
  steamId: string;
  steamName: string;
}

// Inicializar arquivo de usuários se não existir
if (!fs.existsSync(path.dirname(USERS_FILE))) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
}

export function loadUsers(): Record<string, User> {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function saveUsers(users: Record<string, User>) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function getUser(steamId: string): User | null {
  const users = loadUsers();
  return users[steamId] || null;
}

export function createOrUpdateUser(steamId: string, steamName: string, avatar: string): User {
  const users = loadUsers();
  const existing = users[steamId];

  if (existing) {
    // Atualizar informações
    existing.steamName = steamName;
    existing.avatar = avatar;
    existing.lastLogin = new Date().toISOString();
    saveUsers(users);
    return existing;
  }

  // Criar novo usuário
  const newUser: User = {
    steamId,
    steamName,
    avatar,
    plan: 'free',
    freeAnalysesUsed: 0,
    premiumAnalysesRemaining: 0,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  users[steamId] = newUser;
  saveUsers(users);
  return newUser;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function canUseAnalysis(user: User): { allowed: boolean; reason?: string } {
  // Se tem análises premium restantes, pode usar
  if (user.plan === 'premium' && user.premiumAnalysesRemaining > 0) {
    return { allowed: true };
  }

  // Se é free, pode usar 1 análise grátis
  if (user.plan === 'free' && user.freeAnalysesUsed < 1) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: user.plan === 'free'
      ? 'Você já usou sua análise gratuita. Faça upgrade para continuar.'
      : 'Você não tem análises restantes. Compre mais análises.',
  };
}

export function recordAnalysisUsage(user: User): User {
  const users = loadUsers();

  if (user.plan === 'premium' && user.premiumAnalysesRemaining > 0) {
    user.premiumAnalysesRemaining -= 1;
  } else if (user.plan === 'free' && user.freeAnalysesUsed < 1) {
    user.freeAnalysesUsed = 1;
  }

  users[user.steamId] = user;
  saveUsers(users);
  return user;
}

export function addPremiumAnalyses(steamId: string, count: number): User {
  const users = loadUsers();
  const user = users[steamId];

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  user.plan = 'premium';
  user.premiumAnalysesRemaining = (user.premiumAnalysesRemaining || 0) + count;
  saveUsers(users);
  return user;
}

export function isPremium(user: User): boolean {
  return user.plan === 'premium' && user.premiumAnalysesRemaining > 0;
}

