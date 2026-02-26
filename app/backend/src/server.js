require('dotenv').config();

const app = require('./app');
const { startScheduler } = require('./services/scheduler.service');

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`[Server] AlmaDesk-Edu API running on port ${PORT}`);
  try {
    await startScheduler();
    console.log('[Server] Scheduler initialized');
  } catch (err) {
    console.error('[Server] Scheduler initialization failed:', err.message);
  }
});
