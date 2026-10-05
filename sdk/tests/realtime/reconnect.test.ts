import { describe, expect, test, vi } from 'vitest';
import { getReconnectDelay } from '../../src/realtime/utils/get-reconnect-delay.js';
import { redactUrl } from '../../src/realtime/utils/redact-url.js';

describe('getReconnectDelay', () => {
	test('grows the delay with every attempt', () => {
		const options = { delay: 100, maxDelay: 60_000, jitter: false } as const;

		const delays = [0, 1, 2, 3, 4].map((attempt) => getReconnectDelay(attempt, options));

		for (let index = 1; index < delays.length; index++) {
			expect(delays[index]!).toBeGreaterThan(delays[index - 1]!);
		}
	});

	test('never returns more than the configured maximum delay', () => {
		const options = { delay: 1000, factor: 2, maxDelay: 4000, jitter: false } as const;

		expect(getReconnectDelay(0, options)).toBeLessThanOrEqual(4000);
		expect(getReconnectDelay(3, options)).toBeLessThanOrEqual(4000);
		expect(getReconnectDelay(50, options)).toBe(4000);
	});

	test('keeps the jittered delay within the computed delay', () => {
		const options = { delay: 1000, factor: 2, maxDelay: 4000 };

		vi.spyOn(Math, 'random').mockReturnValue(0.999999);
		const highest = getReconnectDelay(3, options);

		vi.restoreAllMocks();

		expect(highest).toBeGreaterThan(0);
		expect(highest).toBeLessThanOrEqual(4000);
	});
});

describe('redactUrl', () => {
	test('replaces the value of sensitive query parameters', () => {
		expect(redactUrl('wss://example.com/websocket?password=hunter2')).toBe(
			'wss://example.com/websocket?password=[redacted]',
		);
	});

	test('leaves unrelated query parameters intact', () => {
		expect(redactUrl('wss://example.com/websocket?token=abc123&collection=articles')).toBe(
			'wss://example.com/websocket?token=[redacted]&collection=articles',
		);
	});

	test('returns the input when it cannot be parsed', () => {
		expect(redactUrl('not-a-url')).toBe('not-a-url');
	});
});