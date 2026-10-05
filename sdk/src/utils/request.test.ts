import { afterEach, describe, expect, it, test, vi } from 'vitest';
import { RequestError } from './error.js';
import { request } from './request.js';

const fetchMock = vi.fn(async () => ({}));

afterEach(() => {
	vi.clearAllMocks();
	vi.useRealTimers();
});

describe('Request', () => {
	describe('headers', () => {
		it('should default to empty headers object if no header provided', async () => {
			await request('https://example.com', {}, fetchMock);

			expect(fetchMock).toBeCalledWith('https://example.com', { headers: {} });
		});

		it('should default to empty headers object if non object header provided', async () => {
			await request('https://example.com', { headers: [] }, fetchMock);

			expect(fetchMock).toBeCalledWith('https://example.com', { headers: {} });
		});

		it('should leave headers as is if they are object', async () => {
			const options = { headers: { 'Content-Type': 'application/json' } };

			await request('https://example.com', options, fetchMock);

			expect(fetchMock).toBeCalledWith('https://example.com', options);
		});
	});

	describe('error handling', () => {
		it('should handle non object reason', async () => {
			vi.mocked(fetchMock).mockResolvedValue({
				headers: new Headers([['Content-Type', 'application/json']]),
				json: async () => 'Error',
				text: () => {},
				ok: false,
			});

			await expect(async () => await request('https://example.com', {}, fetchMock)).rejects.toThrowError(
				new RequestError('', {
					response: expect.objectContaining({ ok: false }) as unknown as Response,
					errors: 'Error' as any,
				}),
			);
		});

		it('should handle reason with errors array', async () => {
			vi.mocked(fetchMock).mockResolvedValue({ errors: [] });

			await expect(async () => await request('https://example.com', {}, fetchMock)).rejects.toThrowError(
				new RequestError('', {
					response: expect.objectContaining({ errors: [] }) as unknown as Response,
					errors: [],
				}),
			);
		});

		describe('should handle reason with errors array and data property', () => {
			const types = [{}, [], false, 1, '1', null];

			test.each(types)('Check %o', async (type) => {
				vi.mocked(fetchMock).mockResolvedValue({ errors: [], data: type });

				await expect(async () => await request('https://example.com', {}, fetchMock)).rejects.toThrowError(
					new RequestError('', {
						response: expect.objectContaining({ errors: [], data: type }) as unknown as Response,
						errors: [],
						data: type,
					}),
				);
			});
		});

		it('should handle reason with non array errors', async () => {
			vi.mocked(fetchMock).mockResolvedValue({ errors: 'Error' });

			await expect(async () => await request('https://example.com', {}, fetchMock)).rejects.toThrowError(
				new RequestError('', {
					response: expect.objectContaining({ errors: 'Error' }) as unknown as Response,
					errors: 'Error' as any,
				}),
			);
		});

		it('should handle reason with message property in errors array', async () => {
			vi.mocked(fetchMock).mockResolvedValue({ errors: [{ message: 'Error' }] });

			await expect(async () => await request('https://example.com', {}, fetchMock)).rejects.toThrowError(
				new RequestError('Error', {
					response: expect.objectContaining({ errors: [{ message: 'Error' }] }) as unknown as Response,
					errors: [{ message: 'Error' }] as any,
				}),
			);
		});
	});

	describe('retries', () => {
		it('should retry a failed fetch before returning a successful response', async () => {
			const retryingFetch = vi
				.fn()
				.mockRejectedValueOnce(new TypeError('Network error'))
				.mockResolvedValueOnce({ data: 'complete' });

			await expect(
				request('https://example.com', {}, retryingFetch, { attempts: 1, delay: 0 }),
			).resolves.toBe('complete');

			expect(retryingFetch).toHaveBeenCalledTimes(2);
		});

		it('should stop retrying after the configured number of attempts', async () => {
			const retryingFetch = vi.fn().mockRejectedValue(new TypeError('Network error'));

			await expect(
				request('https://example.com', {}, retryingFetch, { attempts: 2, delay: 0 }),
			).rejects.toThrow(RequestError);

			expect(retryingFetch).toHaveBeenCalledTimes(3);
		});

		it('should not retry a client error response', async () => {
			const response = {
				headers: new Headers([['Content-Type', 'application/json']]),
				json: async () => ({ errors: [{ message: 'Invalid request' }] }),
				text: async () => '',
				ok: false,
				status: 400,
			};

			const retryingFetch = vi.fn().mockResolvedValue(response);

			await expect(
				request('https://example.com', {}, retryingFetch, { attempts: 2, delay: 0 }),
			).rejects.toThrow(RequestError);

			expect(retryingFetch).toHaveBeenCalledTimes(1);
		});

		it('should retry a server error response', async () => {
			const response = {
				headers: new Headers([['Content-Type', 'application/json']]),
				json: async () => ({ errors: [{ message: 'Unavailable' }] }),
				text: async () => '',
				ok: false,
				status: 503,
			};

			const retryingFetch = vi.fn().mockResolvedValueOnce(response).mockResolvedValueOnce({ data: 'complete' });

			await expect(
				request('https://example.com', {}, retryingFetch, { attempts: 1, delay: 0 }),
			).resolves.toBe('complete');

			expect(retryingFetch).toHaveBeenCalledTimes(2);
		});

		it('should apply an increasing delay between attempts', async () => {
			vi.useFakeTimers();
			const retryingFetch = vi.fn().mockRejectedValue(new TypeError('Network error'));
			const promise = request('https://example.com', {}, retryingFetch, { attempts: 2, delay: 10 });

			await vi.advanceTimersByTimeAsync(9);
			expect(retryingFetch).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1);
			expect(retryingFetch).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(19);
			expect(retryingFetch).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(1);
			await expect(promise).rejects.toThrow(RequestError);

			expect(retryingFetch).toHaveBeenCalledTimes(3);
		});

		it('should pass the same request options to each attempt', async () => {
			const options = { method: 'GET', headers: { Authorization: 'Bearer token' } };
			const retryingFetch = vi
				.fn()
				.mockRejectedValueOnce(new TypeError('Network error'))
				.mockResolvedValue({ data: [] });

			await request('https://example.com', options, retryingFetch, { attempts: 1, delay: 0 });

			expect(retryingFetch).toHaveBeenNthCalledWith(1, 'https://example.com', options);
			expect(retryingFetch).toHaveBeenNthCalledWith(2, 'https://example.com', options);
		});
	});
});
