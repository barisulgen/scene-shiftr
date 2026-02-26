import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

import fs from 'fs/promises';
import { setLogDir, log, logActivation, logDeactivation } from '../dry-run-logger';

const mockedFs = vi.mocked(fs);

beforeEach(() => {
  vi.clearAllMocks();
  setLogDir('/fake/logs');
});

describe('dry-run-logger', () => {
  describe('log', () => {
    it('creates log directory if it does not exist', async () => {
      mockedFs.access.mockRejectedValue(new Error('ENOENT'));
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockedFs.writeFile.mockResolvedValue();
      mockedFs.mkdir.mockResolvedValue(undefined);

      await log('test:action', { key: 'value' });

      expect(mockedFs.mkdir).toHaveBeenCalledWith('/fake/logs', { recursive: true });
    });

    it('appends to existing log entries', async () => {
      const existing = [
        { timestamp: '2026-01-01T00:00:00.000Z', action: 'old:action', details: {} },
      ];
      mockedFs.access.mockResolvedValue();
      mockedFs.readFile.mockResolvedValue(JSON.stringify(existing));
      mockedFs.writeFile.mockResolvedValue();

      await log('new:action', { foo: 'bar' });

      const writtenData = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
      expect(writtenData).toHaveLength(2);
      expect(writtenData[0].action).toBe('old:action');
      expect(writtenData[1].action).toBe('new:action');
      expect(writtenData[1].details).toEqual({ foo: 'bar' });
    });

    it('creates new log file when none exists', async () => {
      mockedFs.access.mockResolvedValue();
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockedFs.writeFile.mockResolvedValue();

      await log('first:action', { data: 123 });

      const writtenData = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
      expect(writtenData).toHaveLength(1);
      expect(writtenData[0].action).toBe('first:action');
      expect(writtenData[0].details).toEqual({ data: 123 });
      expect(writtenData[0].timestamp).toBeDefined();
    });

    it('writes to a date-stamped file', async () => {
      mockedFs.access.mockResolvedValue();
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockedFs.writeFile.mockResolvedValue();

      await log('test:action', {});

      const filePath = mockedFs.writeFile.mock.calls[0][0] as string;
      expect(filePath).toMatch(/dry-run-\d{4}-\d{2}-\d{2}\.json$/);
    });
  });

  describe('logActivation', () => {
    it('logs workspace activation with all action steps', async () => {
      mockedFs.access.mockResolvedValue();
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockedFs.writeFile.mockResolvedValue();

      const actions = [
        { timestamp: '2026-01-01T00:00:00.000Z', action: 'app:close', details: { name: 'Slack' } },
        { timestamp: '2026-01-01T00:00:01.000Z', action: 'app:launch', details: { name: 'Steam' } },
      ];

      await logActivation('Gaming', actions);

      const writtenData = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
      expect(writtenData).toHaveLength(1);
      expect(writtenData[0].action).toBe('workspace:activate');
      expect(writtenData[0].details.workspace).toBe('Gaming');
      expect(writtenData[0].details.steps).toHaveLength(2);
    });
  });

  describe('logDeactivation', () => {
    it('logs workspace deactivation with action steps', async () => {
      mockedFs.access.mockResolvedValue();
      mockedFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockedFs.writeFile.mockResolvedValue();

      const actions = [
        { timestamp: '2026-01-01T00:00:00.000Z', action: 'app:close', details: { process: 'steam.exe' } },
        { timestamp: '2026-01-01T00:00:01.000Z', action: 'workspace:switch-to-default', details: { workspace: 'Default' } },
      ];

      await logDeactivation(actions);

      const writtenData = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
      expect(writtenData).toHaveLength(1);
      expect(writtenData[0].action).toBe('workspace:deactivate');
      expect(writtenData[0].details.steps).toHaveLength(2);
    });
  });
});
