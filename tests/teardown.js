import { rmSync } from 'node:fs';
export default function teardown() {
  const file = process.env.WARUNG_TEST_DATABASE;
  if (file?.startsWith('/tmp/warung-raya-e2e-')) for (const suffix of ['', '-wal', '-shm']) rmSync(file + suffix, { force: true });
}
