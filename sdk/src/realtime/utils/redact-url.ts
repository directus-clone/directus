const SENSITIVE_PARAMS = ['token', 'password', 'secret', 'api_key'];

/**
 * Strip the values of sensitive query parameters from a url so it can be logged safely.
 *
 * @param url The url to redact
 *
 * @returns The url with sensitive values replaced, or the input when it cannot be parsed
 */
export const redactUrl = (url: string): string => {
	let params: URLSearchParams;

	try {
		params = new URL(url).searchParams;
	} catch {
		return url;
	}

	let redacted = url;

	for (const key of params.keys()) {
		if (!SENSITIVE_PARAMS.includes(key)) continue;

		const value = params.get(key);

		redacted = redacted.replace(`${key}=${value}`, `${key}=[redacted]`);
	}

	return redacted;
};
