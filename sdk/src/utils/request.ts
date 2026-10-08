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
	retry: { attempts: number; delay: number } = { attempts: 0, delay: 250 },
): Promise<Output> => {
	options.headers =
		typeof options.headers === 'object' && !Array.isArray(options.headers)
			? (options.headers as Record<string, string>)
			: {};

	let attempt = 0;
	while (true) {
		let response: Response | undefined;
		try {
			response = await fetcher(url, options);
			return await extractData(response);
		} catch (reason) {
			const status =
				response?.status ??
				(reason && typeof reason === 'object' && 'status' in reason ? Number(reason.status) : undefined);
			const retryable = status === undefined || status >= 500 || status === 429;
			const shouldRetry = retryable && attempt < retry.attempts;

			if (!shouldRetry) {
				const result: { response: unknown; message: string; errors: any; data?: any } = {
					message: '',
					errors: reason && typeof reason === 'object' && 'errors' in reason ? reason.errors : reason,
					response,
				};

				if (reason && typeof reason === 'object' && 'data' in reason) result.data = reason.data;

				if (Array.isArray(result.errors) && result.errors[0]?.message) {
					result.message = result.errors[0].message;
				}

				throw new RequestError(result.message, {
					response: result.response,
					errors: result.errors,
					data: result.data,
				});
			}

			attempt++;
			await new Promise((resolve) => setTimeout(resolve, retry.delay * 2 ** (attempt - 1)));
		}
	}
};
