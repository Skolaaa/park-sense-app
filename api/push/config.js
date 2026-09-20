// GET /api/push/config — tells the client whether push is available and
// hands it the VAPID public key (public by design; it identifies the server
// to the push service and can sign nothing).

import { pushConfig } from '../_lib/push.js';
import { isConfigured as dbConfigured } from '../_lib/db.js';
import { json } from '../_lib/request.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const cfg = pushConfig();
  const enabled = Boolean(cfg) && dbConfigured();
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return json(res, 200, { enabled, publicKey: enabled ? cfg.publicKey : null });
}
