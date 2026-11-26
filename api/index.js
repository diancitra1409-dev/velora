import app from '../server/app.js';

/**
 * Vercel Serverless Function handler delegating to the shared Express app
 * without calling app.listen() in production.
 */
export default function handler(req, res) {
  return app(req, res);
}
