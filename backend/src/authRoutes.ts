import express, { Request, Response } from 'express';
import { createOrUpdateUser, generateToken, getUser, canUseAnalysis, recordAnalysisUsage, addPremiumAnalyses, isPremium } from './auth';

const router = express.Router();

// Endpoint para autenticação Steam (simulado - em produção usar passport-steam)
router.get('/steam', async (req: Request, res: Response) => {
  // Em produção, aqui você faria a autenticação real com Steam
  // Por enquanto, vamos usar um endpoint que aceita steamId como query param para testes
  const { steamId, steamName, avatar } = req.query;

  if (!steamId || typeof steamId !== 'string') {
    return res.status(400).json({ error: 'steamId é obrigatório.' });
  }

  const user = createOrUpdateUser(
    steamId,
    (steamName as string) || 'Steam User',
    (avatar as string) || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
  );

  const token = generateToken({
    steamId: user.steamId,
    steamName: user.steamName,
  });

  // Redirecionar para frontend com token
  res.redirect(`/?token=${token}`);
});

// Endpoint para verificar status do usuário
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const { verifyToken } = require('./auth');
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  const user = getUser(payload.steamId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  res.json({
    steamId: user.steamId,
    steamName: user.steamName,
    avatar: user.avatar,
    plan: user.plan,
    freeAnalysesUsed: user.freeAnalysesUsed,
    premiumAnalysesRemaining: user.premiumAnalysesRemaining,
    isPremium: isPremium(user),
    canUseAnalysis: canUseAnalysis(user),
  });
});

// Endpoint para verificar se pode iniciar análise
router.post('/check-analysis', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const { verifyToken } = require('./auth');
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  const user = getUser(payload.steamId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const check = canUseAnalysis(user);
  res.json(check);
});

// Endpoint para registrar uso de análise
router.post('/record-analysis', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const { verifyToken } = require('./auth');
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  const user = getUser(payload.steamId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const updatedUser = recordAnalysisUsage(user);
  res.json({
    freeAnalysesUsed: updatedUser.freeAnalysesUsed,
    premiumAnalysesRemaining: updatedUser.premiumAnalysesRemaining,
  });
});

// Endpoint para adicionar análises premium (simulado - em produção integrar com gateway de pagamento)
router.post('/purchase', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const { verifyToken } = require('./auth');
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  const user = getUser(payload.steamId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  // Em produção, verificar pagamento real aqui
  // Por enquanto, apenas adicionar 10 análises
  const updatedUser = addPremiumAnalyses(user.steamId, 10);
  res.json({
    plan: updatedUser.plan,
    premiumAnalysesRemaining: updatedUser.premiumAnalysesRemaining,
  });
});

// Endpoint DEV temporário para login rápido
router.post('/dev', async (req: Request, res: Response) => {
  const devSteamId = 'DEV_USER_12345';
  const devUser = createOrUpdateUser(
    devSteamId,
    'Dev User',
    'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
  );

  const token = generateToken({
    steamId: devUser.steamId,
    steamName: devUser.steamName,
  });

  res.json({
    token,
    user: {
      steamId: devUser.steamId,
      steamName: devUser.steamName,
      avatar: devUser.avatar,
      plan: devUser.plan,
      freeAnalysesUsed: devUser.freeAnalysesUsed,
      premiumAnalysesRemaining: devUser.premiumAnalysesRemaining,
      isPremium: isPremium(devUser),
      canUseAnalysis: canUseAnalysis(devUser),
    },
  });
});

// Endpoint DEV para toggle premium
router.post('/dev/toggle-premium', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const { verifyToken } = require('./auth');
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  const user = getUser(payload.steamId);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  // Toggle premium
  if (user.plan === 'premium' && user.premiumAnalysesRemaining > 0) {
    // Remover premium
    user.plan = 'free';
    user.premiumAnalysesRemaining = 0;
  } else {
    // Adicionar premium
    const updatedUser = addPremiumAnalyses(user.steamId, 10);
    return res.json({
      steamId: updatedUser.steamId,
      steamName: updatedUser.steamName,
      avatar: updatedUser.avatar,
      plan: updatedUser.plan,
      freeAnalysesUsed: updatedUser.freeAnalysesUsed,
      premiumAnalysesRemaining: updatedUser.premiumAnalysesRemaining,
      isPremium: isPremium(updatedUser),
      canUseAnalysis: canUseAnalysis(updatedUser),
    });
  }

  // Salvar mudanças para remover premium
  const { loadUsers, saveUsers } = require('./auth');
  const users = loadUsers();
  users[user.steamId] = user;
  saveUsers(users);

  res.json({
    steamId: user.steamId,
    steamName: user.steamName,
    avatar: user.avatar,
    plan: user.plan,
    freeAnalysesUsed: user.freeAnalysesUsed,
    premiumAnalysesRemaining: user.premiumAnalysesRemaining,
    isPremium: isPremium(user),
    canUseAnalysis: canUseAnalysis(user),
  });
});

export default router;

