import { expect, test } from 'vitest';
import isUrlAllowed from './is-url-allowed.js';

test('isUrlAllowed should allow matching domain', () => {
	const checkUrl = 'https://directus.example.com';
	const allowedUrls = ['https://directus.example.com/'];

	expect(isUrlAllowed(checkUrl, allowedUrls)).toBe(true);
});

test('isUrlAllowed should allow matching path', () => {
	const checkUrl = 'https://directus.example.com/tv';
	const allowedUrls = ['https://directus.example.com/tv'];

	expect(isUrlAllowed(checkUrl, allowedUrls)).toBe(true);
});

test('isUrlAllowed should block different paths', () => {
	const checkUrl = 'http://example.com/test1';
	const allowedUrls = ['http://example.com/test2', 'http://example.com/test3', 'http://example.com/'];

	expect(isUrlAllowed(checkUrl, allowedUrls)).toBe(false);
});

test('isUrlAllowed should block different domains', () => {
	const checkUrl = 'http://directus.example.com/';
	const allowedUrls = ['http://example.com/', 'http://directus.chat'];

	expect(isUrlAllowed(checkUrl, allowedUrls)).toBe(false);
});

test('isUrlAllowed blocks varying protocols', () => {
	const checkUrl = 'http://example.com/';
	const allowedUrls = ['ftp://example.com/', 'https://example.com/'];

	expect(isUrlAllowed(checkUrl, allowedUrls)).toBe(false);
});

test('isUrlAllowed allows a wildcard subdomain entry', () => {
	const allowedUrls = ['https://*.example.com/callback'];

	expect(isUrlAllowed('https://tenant.example.com/callback', allowedUrls)).toBe(true);
	expect(isUrlAllowed('https://deep.tenant.example.com/callback', allowedUrls)).toBe(true);
	expect(isUrlAllowed('https://tenant.example.com/other', allowedUrls)).toBe(false);
	expect(isUrlAllowed('https://tenant.example.com/callback/extra', allowedUrls)).toBe(false);
});

test('isUrlAllowed blocks a wildcard entry on a different port', () => {
	expect(isUrlAllowed('https://tenant.example.com:8443/callback', ['https://*.example.com/callback'])).toBe(false);
});

test('isUrlAllowed ignores unusable allow list entries', () => {
	expect(isUrlAllowed('https://example.com/', ['not a url'])).toBe(false);
	expect(isUrlAllowed('https://example.com/', [''])).toBe(false);
});

test('isUrlAllowed returns false for an unparsable url', () => {
	expect(isUrlAllowed('not-a-url', ['https://example.com/'])).toBe(false);
});
