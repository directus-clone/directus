import { URL } from 'url';
import { toArray } from '@directus/utils';
import { getParsedAllowList } from './allowlist-cache.js';
import { matchesAllowListEntry } from './parse-allowlist-entry.js';

/**
 * Check if URL matches allow list either exactly or by origin (protocol+domain+port) + pathname
 *
 * Entries in the allow list may use a `*.` subdomain wildcard, eg `https://*.example.com/path`.
 */
export default function isUrlAllowed(url: string, allowList: string | string[]): boolean {
	const urlAllowList = [...toArray(allowList).filter((entry): entry is string => typeof entry === 'string')];

	if (urlAllowList.includes(url)) return true;

	let parsedUrl: URL;

	try {
		parsedUrl = new URL(url);
	} catch {
		return false;
	}

	const hostname = parsedUrl.hostname.toLowerCase();

	return getParsedAllowList(urlAllowList).some((entry) => {
		if (!matchesAllowListEntry(parsedUrl, hostname, entry)) return false;

		return parsedUrl.pathname === entry.path;
	});
}
