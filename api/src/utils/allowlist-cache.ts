import type { AllowListEntry } from './parse-allowlist-entry.js';
import { parseAllowListEntry } from './parse-allowlist-entry.js';

const MAX_CACHE_ENTRIES = 100;

const entryCache = new Map<string, AllowListEntry[]>();

/**
 * Get the parsed form of an allow list, reusing previously parsed entries.
 *
 * @param allowList The raw allow list
 *
 * @returns The parsed entries, excluding any that could not be parsed
 */
export function getParsedAllowList(allowList: string[]): AllowListEntry[] {
	const cacheKey = allowList.join(',');

	const cached = entryCache.get(cacheKey);

	if (cached) return cached;

	const entries = allowList
		.map((entry) => parseAllowListEntry(entry))
		.filter((entry): entry is AllowListEntry => entry !== null);

	if (entryCache.size >= MAX_CACHE_ENTRIES) {
		const oldest = entryCache.keys().next().value;

		if (oldest !== undefined) entryCache.delete(oldest);
	}

	entryCache.set(cacheKey, entries);

	return entryCache.get(cacheKey) as AllowListEntry[];
}