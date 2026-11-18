import { afterEach, describe, expect, it, vi } from 'vitest';
import { stdoutSink } from './stdout-sink.js';

describe('stdoutSink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escreve uma linha JSON por registro', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    stdoutSink({ level: 'info', time: 1, msg: 'ok' });
    expect(write).toHaveBeenCalledWith('{"level":"info","time":1,"msg":"ok"}\n');
  });
});
