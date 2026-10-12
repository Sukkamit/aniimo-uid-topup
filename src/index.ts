import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const PORT = parseInt(process.env.PORT || '3001', 10);

function startServer() {
  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Aniimo UID Top-Up API is running!`);
    console.log(`🌐 Base URL: http://localhost:${PORT}`);
    console.log(`🖥️  Web UI Demo: http://localhost:${PORT}/`);
    console.log(`🇹🇼 Region: Taiwan | Currency: TWD | Gateway: MyCard`);
    console.log(`======================================================\n`);
  });

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (require.main === module) {
  startServer();
}
