import type { FetchInterface } from '../index.js';
import { RequestError } from './error.js';
import { extractData } from './extract-data.js';

/**
 * Request helper providing default settings
 *
 * @param url The request URL
 * @param options The request options
 *
 * @returns The API result if successful
 */
export const request = async <Output = any>(
	url: string,
	options: RequestInit,
	fetcher: FetchInterface = globalThis.fetch,
	timeoutMs?: number,
): Promise<Output> => {
	options.headers =
		typeof options.headers === 'object' && !Array.isArray(options.headers)
			? (options.headers as Record<string, string>)
			: {};

	const fetchPromise =
		timeoutMs && timeoutMs > 0
			? (() => {
				const controller = new AbortController();
				if (options.signal?.aborted) {
					controller.abort(options.signal.reason);
				} else {
					options.signal?.addEventListener('abort', () => controller.abort(options.signal?.reason), {
						once: true,
					});
				}

				return Promise.race([
					fetcher(url, { ...options, signal: controller.signal }),
					new Promise((_, reject) => {
						setTimeout(() => {
							const error = new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
							Object.defineProperty(error, 'cause', { value: options.headers });
							reject(error);
							controller.abort(error);
						}, timeoutMs);
					}),
				]);
			})()
			: fetcher(url, options);

	return fetchPromise.then((response) => {
		return extractData(response).catch((reason) => {
			const result: { response: unknown; message: string; errors: any; data?: any } = {
				message: '',
				errors: reason && typeof reason === 'object' && 'errors' in reason ? reason.errors : reason,
				response,
			};

			if (reason && typeof reason === 'object' && 'data' in reason) result.data = reason.data;

			if (Array.isArray(result.errors) && result.errors[0]?.message) {
				result.message = result.errors[0].message;
			}

			return Promise.reject(
				new RequestError(result.message, {
					response: result.response,
					errors: result.errors,
					data: result.data,
				}),
			);
		});
	});
};
