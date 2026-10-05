import { useLogger } from '../logger/index.js';

export interface AllowListEntry {
	protocol: string;
	hostname: string;
	port: string;
	path: string;
	wildcard: boolean;
}

/**
 * Parse a single allow list entry into its comparable parts.
 *
 * Entries may use a `*.` subdomain wildcard, eg `https://*.example.com/path`.
 *
 * @param entry The raw allow list entry
 *
 * @returns The parsed entry, or null when the entry isn't a usable URL
 */
export function parseAllowListEntry(entry: string): AllowListEntry | null {
	const value = typeof entry === 'string' ? entry.trim() : '';

	if (value === '') return null;

	const wildcard = value.includes('*.');

	let parsed: URL;

	try {
		parsed = new URL(wildcard ? value.replace('*.', '') : value);
	} catch {
		useLogger().warn(`Invalid URL used "${value}"`);
		return null;
	}

	return {
		protocol: parsed.protocol,
		hostname: parsed.hostname.toLowerCase(),
		port: parsed.port,
		path: parsed.pathname,
		wildcard,
	};
}

/**
 * Check a parsed URL against a single allow list entry.
 *
 * @param url The parsed URL to check
 * @param hostname The lowercased hostname of the URL
 * @param entry The allow list entry to match against
 *
 * @returns Whether the URL is covered by the entry
 */
export function matchesAllowListEntry(url: URL, hostname: string, entry: AllowListEntry): boolean {
	if (url.protocol !== entry.protocol) return false;
	if (url.port !== entry.port) return false;

	if (entry.wildcard) {
		if (!hostname.endsWith(entry.hostname)) return false;
	} else if (hostname !== entry.hostname) {
		return false;
	}

	return true;
}