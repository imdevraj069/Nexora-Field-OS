import { startEmailConsumer } from './consumers/emailConsumer';

startEmailConsumer().catch((err) => {
  console.error('[worker-service] Fatal startup error:', err);
  process.exit(1);
});
