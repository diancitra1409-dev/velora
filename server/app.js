import cors from 'cors';
import express from 'express';
import { generateBookAssistantReply, getCachedModel } from './services/gemini.js';

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true;

app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'velora-api',
    activeModel: getCachedModel(),
  });
});

app.post('/api/chat', async (req, res) => {
  const { message, history, book } = req.body || {};

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      error: {
        code: 400,
        message: 'Please enter a message before sending.',
      },
    });
  }

  if (message.length > 4000) {
    return res.status(400).json({
      error: {
        code: 400,
        message: 'Message is too long. Please keep your question under 4,000 characters.',
      },
    });
  }

  try {
    const result = await generateBookAssistantReply({
      message,
      history: Array.isArray(history) ? history : [],
      book: book && typeof book === 'object' ? book : null,
    });

    return res.json({
      reply: result.reply,
      model: result.model,
    });
  } catch (err) {
    const status = typeof err?.status === 'number' && err.status >= 400 ? err.status : 500;
    const messageText =
      typeof err?.message === 'string' && err.message.trim()
        ? err.message.trim()
        : 'Unable to reach Velora AI right now. Please try again.';

    return res.status(status).json({
      error: {
        code: status,
        message: messageText,
      },
    });
  }
});

// Clean JSON error handler (e.g., malformed JSON payloads)
app.use((err, _req, res, _next) => {
  const status = err?.status || 400;
  res.status(status).json({
    error: {
      code: status,
      message: err?.message || 'Invalid request.',
    },
  });
});

export default app;
