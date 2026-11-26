# Velora — AI Book Search Engine & Literary Assistant

Velora is a full-stack book discovery and literary assistant web app powered by the **Open Library Search API** and **Google Gemini (`@google/genai`)**, built for both local development and zero-config **Vercel** serverless deployment.

## Project Structure

```text
velora/
├── api/
│   └── index.js                 # Vercel serverless Express entry point
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BookCard.jsx
│   │   │   ├── BookCover.jsx
│   │   │   ├── BookSearchPanel.jsx
│   │   │   └── ChatPanel.jsx
│   │   ├── utils/
│   │   │   ├── errorParser.js   # Clean human-readable error parser (no raw JSON)
│   │   │   └── openLibrary.js   # Open Library search client & normalizer
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── services/
│   │   └── gemini.js            # @google/genai client with retry + dynamic fallback
│   ├── app.js                   # Shared Express app
│   └── index.js                 # Local Express dev server
├── .env.example
├── package.json
└── vercel.json
```

## Local Development

1. Install dependencies for both root/server and client:
   ```bash
   npm run install:all
   ```
2. Create a `.env` file in the root directory from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Set your `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/).
3. Start both the Express API (`localhost:3001`) and Vite frontend (`localhost:5173`):
   ```bash
   npm run dev
   ```

## Vercel Deployment

1. Push this repository to GitHub/GitLab/Bitbucket and import it into Vercel.
2. Add `GEMINI_API_KEY` in **Project Settings → Environment Variables**.
3. Deploy — `vercel.json` builds `client/dist` and routes `/api/*` to `api/index.js`.
