import { Router, Request, Response } from 'express';
import { db } from '../database/db';

export const settingsRouter = Router();

// GET /api/settings - Get current application settings
settingsRouter.get('/', (req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// PUT /api/settings - Update application settings
settingsRouter.put('/', (req: Request, res: Response) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});
