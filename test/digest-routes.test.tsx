import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const tmp = mkdtempSync(join(tmpdir(), 'rig-routes-'));
const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: tmp,
};
const app = createApp(config);

const line = (job: string, status: string, at: string) =>
  JSON.stringify({ at, job, status, owner: 'rook' });

writeFileSync(
  join(tmp, '2026-02-01.jsonl'),
  [
    line('zeta/job', 'ok', '2026-02-01T23:00:00+01:00'),
    line('alpha/job', 'ok', '2026-02-01T23:05:00+01:00'),
    line('mid/job', 'fail', '2026-02-02T01:00:00+01:00'),
  ].join('\n') + '\n',
);
writeFileSync(join(tmp, '2026-02-02.jsonl'), '');
writeFileSync(
  join(tmp, '2026-02-03.jsonl'),
  [line('a/job', 'ok', '2026-02-03T23:00:00+01:00'), 'not json'].join('\n') + '\n',
);

const jobsInPage = (html: string, jobs: string[]) =>
  jobs.map((j) => ({ j, i: html.indexOf(`<td>${j}</td>`) })).sort((a, b) => a.i - b.i).map((x) => x.j);

describe('GET /digest/:night', () => {
  it('answers 200 for a night with data', async () => {
    const res = await app.request('/digest/2026-02-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest · 2026-02-01');
    expect(html).toContain('alpha/job');
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-02-09');
    expect(res.status).toBe(404);
  });

  it('says nothing ran for the empty night', async () => {
    const res = await app.request('/digest/2026-02-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('shows the bad-line count and still renders the night', async () => {
    const res = await app.request('/digest/2026-02-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('bad lines: 1');
    expect(html).toContain('a/job');
  });
});

describe('GET /api/digest/:night', () => {
  it('answers 200 with the night for a night with data', async () => {
    const res = await app.request('/api/digest/2026-02-01');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-02-01');
    expect(body.rows).toHaveLength(3);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-02-09');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });

  it('returns no rows for the empty night', async () => {
    const res = await app.request('/api/digest/2026-02-02');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
  });

  it('reports one bad line and still returns the night', async () => {
    const res = await app.request('/api/digest/2026-02-03');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['a/job']);
  });
});

describe('digest page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const body = (await (await app.request('/api/digest/2026-02-01')).json()) as Night;
    const html = await (await app.request('/digest/2026-02-01')).text();
    const jsonJobs = body.rows.map((r) => r.job);
    expect(jsonJobs).toEqual(['alpha/job', 'mid/job', 'zeta/job']);
    expect(jobsInPage(html, [...jsonJobs].reverse())).toEqual(jsonJobs);
  });
});
