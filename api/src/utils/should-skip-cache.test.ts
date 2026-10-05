import { useEnv } from '@directus/env';
import type { Request } from 'express';
import { expect, test, vi } from 'vitest';
import { getIgnoreList, matchesIgnorePattern, parseIgnoreList, shouldSkipCache } from './should-skip-cache.js';

vi.mock('@directus/env');

test.each([
	{ scenario: 'not relative', publicURL: 'http://admin.example.com', refererHost: '' },
	{ scenario: 'relative', publicURL: '/', refererHost: 'http://ignore.domain' },
	{ scenario: 'relative with subdirectory', publicURL: '/test/subfolder', refererHost: 'http://ignore.domain' },
])(
	'should always skip cache for requests coming from data studio when public URL is $scenario and CACHE_AUTO_PURGE is false',
	({ publicURL, refererHost }) => {
		vi.mocked(useEnv).mockReturnValue({
			PUBLIC_URL: publicURL,
			CACHE_SKIP_ALLOWED: false,
			CACHE_AUTO_PURGE: false,
			CACHE_AUTO_PURGE_IGNORE_LIST: ['directus_activity', 'directus_presets'],
		});

		const req = {
			get: vi.fn((str) => {
				switch (str) {
					case 'Referer':
						return `${refererHost}${publicURL}/admin/settings/data-model`;
					default:
						return undefined;
				}
			}),
			originalUrl: 'http://admin.example.com/items/test',
		} as unknown as Request;

		expect(shouldSkipCache(req)).toBe(true);
	},
);

test.each([
	{ scenario: 'not relative', publicURL: 'http://admin.example.com', refererHost: '' },
	{ scenario: 'relative', publicURL: '/', refererHost: 'http://ignore.domain' },
	{ scenario: 'relative with subdirectory', publicURL: '/test/subfolder', refererHost: 'http://ignore.domain' },
])(
	'should not skip cache for requests coming from data studio when public URL is $scenario and CACHE_AUTO_PURGE is true',
	({ publicURL, refererHost }) => {
		vi.mocked(useEnv).mockReturnValue({
			PUBLIC_URL: publicURL,
			CACHE_SKIP_ALLOWED: false,
			CACHE_AUTO_PURGE: true,
			CACHE_AUTO_PURGE_IGNORE_LIST: ['directus_activity', 'directus_presets', 'ignore_collection'],
		});

		const req = {
			get: vi.fn((str) => {
				switch (str) {
					case 'Referer':
						return `${refererHost}${publicURL}/admin/settings/data-model`;
					default:
						return undefined;
				}
			}),
			originalUrl: 'http://admin.example.com/items/some_collection',
		} as unknown as Request;

		expect(shouldSkipCache(req)).toBe(false);
	},
);

test.each([
	{ scenario: 'not relative', publicURL: 'http://admin.example.com', refererHost: '' },
	{ scenario: 'relative', publicURL: '/', refererHost: 'http://ignore.domain' },
	{ scenario: 'relative with subdirectory', publicURL: '/test/subfolder', refererHost: 'http://ignore.domain' },
])(
	'should skip cache for requests with collections in CACHE_AUTO_PURGE_IGNORE_LIST coming from data studio when public URL is $scenario and CACHE_AUTO_PURGE is true',
	({ publicURL, refererHost }) => {
		vi.mocked(useEnv).mockReturnValue({
			PUBLIC_URL: publicURL,
			CACHE_SKIP_ALLOWED: false,
			CACHE_AUTO_PURGE: true,
			CACHE_AUTO_PURGE_IGNORE_LIST: ['directus_activity', 'directus_presets', 'ignore_collection'],
		});

		const req = {
			get: vi.fn((str) => {
				switch (str) {
					case 'Referer':
						return `${refererHost}${publicURL}/admin/settings/data-model`;
					default:
						return undefined;
				}
			}),
			originalUrl: 'http://admin.example.com/items/ignore_collection',
		} as unknown as Request;

		expect(shouldSkipCache(req)).toBe(true);
	},
);

test('should not skip cache for requests coming outside of data studio', () => {
	vi.mocked(useEnv).mockReturnValue({
		PUBLIC_URL: 'http://admin.example.com',
		CACHE_SKIP_ALLOWED: 'false',
	});

	const req = {
		get: vi.fn((str) => {
			switch (str) {
				case 'Referer':
					return `http://elsewhere.example.com/admin/settings/data-model`;
				default:
					return undefined;
			}
		}),
	} as unknown as Request;

	expect(shouldSkipCache(req)).toBe(false);
});

test.each([
	{ scenario: 'accept', value: true },
	{ scenario: 'ignore', value: false },
])(
	'should $scenario Cache-Control request header containing "no-store" when CACHE_SKIP_ALLOWED is $value',
	({ value }) => {
		vi.mocked(useEnv).mockReturnValue({
			PUBLIC_URL: '/',
			CACHE_SKIP_ALLOWED: value,
		});

		const req = {
			get: vi.fn((str) => {
				switch (str) {
					case 'cache-control':
						return 'no-store';
					default:
						return undefined;
				}
			}),
		} as unknown as Request;

		expect(shouldSkipCache(req)).toBe(value);
	},
);

test('matches an exact ignore pattern', () => {
	expect(matchesIgnorePattern('directus_activity', 'directus_activity')).toBe(true);
	expect(matchesIgnorePattern('directus_activit', 'directus_activity')).toBe(false);
});

test('matches a trailing wildcard ignore pattern', () => {
	expect(matchesIgnorePattern('directus_activity', 'directus_*')).toBe(true);
	expect(matchesIgnorePattern('articles', 'directus_*')).toBe(false);
});

test('parses a comma separated ignore list', () => {
	expect(parseIgnoreList('directus_activity,directus_presets')).toEqual([
		'directus_activity',
		'directus_presets',
	]);
});

test('getIgnoreList is stable across repeated calls', () => {
	const list = ['directus_activity', 'directus_presets'];

	expect(getIgnoreList(list)).toEqual(getIgnoreList(list));
});
