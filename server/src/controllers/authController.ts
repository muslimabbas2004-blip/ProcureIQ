import { Request, Response } from 'express';
import { store } from '../db/store.js';

const DEMO_PASSWORD = 'Demo@1234';

export const login = (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = store.users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user || password !== DEMO_PASSWORD) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Set session cookie
  res.cookie('piq_user', user.email, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  return res.json({
    email: user.email,
    name: user.name,
    role: user.role
  });
};

export const getMe = (req: Request, res: Response) => {
  const emailCookie = req.cookies?.piq_user;
  if (!emailCookie) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const user = store.users.find(u => u.email.toLowerCase() === String(emailCookie).toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'User not found.' });
  }

  return res.json({
    email: user.email,
    name: user.name,
    role: user.role
  });
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie('piq_user');
  return res.json({ success: true });
};
