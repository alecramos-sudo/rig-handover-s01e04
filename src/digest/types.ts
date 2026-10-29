export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job in a night. Times are the log's own strings, offset kept.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  // Most recent error the job logged that night, even if a later run succeeded.
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  // Sorted by job. Empty when the file exists but nothing ran.
  rows: DigestRow[];
  // Lines that didn't parse or didn't match RunLine. Counted, never thrown.
  badLines: number;
};

// null when runs/<night>.jsonl doesn't exist (or night isn't YYYY-MM-DD).
export type ReadNight = (runsDir: string, night: string) => Night | null;
