import { Request, Response } from 'express';
import { store } from '../db/store.js';
import { askGemini } from '../services/geminiService.js';

export const handleChatQuery = async (req: Request, res: Response) => {
  const { question, history } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question string is required.' });
  }

  const h = Array.isArray(history) ? history.map(String) : [];
  try {
    const answer = await askGemini(question, h, store);
    return res.json(answer);
  } catch (err) {
    console.error('Error in handleChatQuery:', err);
    const fallbackAnswer = store.answerChat(question, h);
    return res.json(fallbackAnswer);
  }
};
