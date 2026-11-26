import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`Velora API server listening on http://localhost:${PORT}`);
});
