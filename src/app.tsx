import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { readNight } from './digest/read.js';
import type { Night } from './digest/types.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

// The one place a night's rows are loaded; the page and the JSON route both call it.
export function loadDigest(config: RigConfig, night: string): Night | null {
  return readNight(config.runsDir, night);
}

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const digest = loadDigest(config, c.req.param('night'));
    if (!digest) return c.notFound();
    return c.html(
      <Layout title={`digest ${digest.night}`} lane={lane()}>
        <DigestPage digest={digest} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const digest = loadDigest(config, c.req.param('night'));
    if (!digest) return c.json({ error: 'not found' }, 404);
    return c.json(digest);
  });

  return app;
}
