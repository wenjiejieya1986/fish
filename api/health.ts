import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isConfigured } from '../src/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const configured = isConfigured();

  return res.status(configured ? 200 : 503).json({
    status: configured ? 'ok' : 'not_configured',
    timestamp: new Date().toISOString(),
  });
}
