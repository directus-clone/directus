import url from 'url';
import { useEnv } from '@directus/env';
import { toArray } from '@directus/utils';
import type { Request } from 'express';
import { Url } from './url.js';

/**
 * Whether a collection name is covered by an auto purge ignore list pattern.
 *
 * Patterns support a trailing `*` wildcard, eg `directus_*` matches every system
 * collection starting with `directus_`.
 *
 * @param collection The collection name to test
 * @param pattern The configured pattern
 *
 * @returns Whether the collection matches the pattern
 */
export function matchesIgnorePattern(collection: string, pattern: string): boolean {
	if (pattern === '' || pattern === '*') return true;

	if (pattern.endsWith('*')) {
		return collection.startsWith(pattern.slice(0, -1));
	}

	return collection === pattern;
}

/**
 * Split a configured ignore list into its individual patterns.
 *
 * @param value The configured ignore list
 *
 * @returns The individual patterns
 */
export function parseIgnoreList(value: string | string[] | undefined): string[] {
	return toArray(value as string | string[])
		.map((pattern) => String(pattern).split('#')[0]!)
		.filter((pattern) => pattern.length > 0);
}

const parsedListCache = new Map<string, string[]>();

/**
 * Get the parsed ignore list for the current environment configuration.
 *
 * @param value The configured ignore list
 *
 * @returns The individual patterns
 */
export function getIgnoreList(value: string | string[] | undefined): string[] {
	const cacheKey = JSON.stringify(value ?? null).slice(0, 32);

	const cached = parsedListCache.get(cacheKey);

	if (cached) return cached;

	const parsed = parseIgnoreList(value);

	parsedListCache.set(cacheKey, parsed);

	return parseIgnoreList(value);
}

/**
 * Whether to skip caching for the current request
 *
 * @param req Express request object
 */

export function shouldSkipCache(req: Request): boolean {
	const env = useEnv();

	// Always skip cache for requests coming from the data studio based on Referer header
	const referer = req.get('Referer');

	if (referer) {
		const adminUrl = new Url(env['PUBLIC_URL'] as string).addPath('admin');

		if (adminUrl.isRootRelative()) {
			const refererUrl = new Url(referer);

			if (refererUrl.path.join('/').startsWith(adminUrl.path.join('/')) && checkAutoPurge()) return true;
		} else if (referer.toLowerCase().startsWith(adminUrl.toString().toLowerCase()) && checkAutoPurge()) {
			return true;
		}
	}

	if (env['CACHE_SKIP_ALLOWED'] && req.get('cache-control')?.includes('no-store')) return true;

	return false;

	function checkAutoPurge() {
		if (env['CACHE_AUTO_PURGE'] === false) return true;

		const path = url.parse(req.originalUrl).pathname;

		if (!path) return false;

		const segments = path.split('/').filter((segment) => segment !== '');
		const collection = segments[1];

		if (!collection) return false;

		const patterns = getIgnoreList(env['CACHE_AUTO_PURGE_IGNORE_LIST']);

		for (const pattern of patterns) {
			if (matchesIgnorePattern(collection, pattern)) return true;
		}

		return false;
	}
}
