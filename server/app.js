import cors from 'cors';
import express from 'express';
import { fetchBookSynopsis } from './services/bookDetails.js';
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

const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'velora-api',
    activeModel: getCachedModel(),
  });
});

apiRouter.get('/book-details', async (req, res) => {
  const workKey = typeof req.query.workKey === 'string' ? req.query.workKey : '';
  const title = typeof req.query.title === 'string' ? req.query.title : '';
  const author = typeof req.query.author === 'string' ? req.query.author : '';

  if (!workKey && !title) {
    return res.status(400).json({
      error: {
        code: 400,
        message: 'Provide workKey or title to fetch book details.',
      },
    });
  }

  const result = await fetchBookSynopsis({ workKey, title, author });
  return res.json(result);
});

apiRouter.post('/chat', async (req, res) => {
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
    let enrichedBook = book && typeof book === 'object' ? { ...book } : null;
    if (enrichedBook && enrichedBook.title && !String(enrichedBook.description || '').trim()) {
      const details = await fetchBookSynopsis({
        workKey: enrichedBook.workKey,
        title: enrichedBook.title,
        author: Array.isArray(enrichedBook.authors) ? enrichedBook.authors[0] : '',
      });
      if (details.description) {
        enrichedBook.description = details.description;
      }
    }

    const result = await generateBookAssistantReply({
      message,
      history: Array.isArray(history) ? history : [],
      book: enrichedBook,
    });

    return res.json({
      reply: result.reply,
      model: result.model,
    });
  } catch (err) {
    if (err?.isMissingApiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing in environment variables.',
      });
    }

    const status = typeof err?.status === 'number' && err.status >= 400 ? err.status : 500;
    const messageText =
      typeof err?.message === 'string' && err.message.trim()
        ? err.message.trim()
        : 'The AI assistant could not process your request right now.';

    return res.status(status).json({
      error: {
        code: status,
        message: messageText,
      },
    });
  }
});

// JSON 404 for unknown API endpoints
apiRouter.use((req, res) => {
  res.status(404).json({
    error: {
      code: 404,
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    },
  });
});

// Mount under both /api (local dev + Vercel preserved path) and / (in case a rewrite strips /api)
app.use('/api', apiRouter);
app.use('/', apiRouter);

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
