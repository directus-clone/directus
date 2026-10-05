export interface ReconnectBackoff {
	/** Base delay before the first retry, in ms */
	delay: number;
	/** Upper bound for the backoff, in ms */
	maxDelay?: number;
	/** Multiplier applied to the delay on every attempt */
	factor?: number;
	/** Randomize the delay to keep clients from reconnecting in lockstep */
	jitter?: boolean;
}

const DEFAULT_FACTOR = 2;
const DEFAULT_MAX_DELAY = 30_000;

/**
 * Calculate the delay before the next reconnection attempt using exponential backoff.
 *
 * @param attempt The amount of attempts that already failed, starting at 0
 * @param options The backoff options
 *
 * @returns The delay in milliseconds
 */
export const getReconnectDelay = (attempt: number, options: ReconnectBackoff): number => {
	const factor = options.factor ?? DEFAULT_FACTOR;
	const maxDelay = options.maxDelay ?? DEFAULT_MAX_DELAY;
	const base = options.delay;

	const exponential = base * factor ** Math.max(0, attempt);
	const capped = Math.min(exponential, maxDelay);

	if (options.jitter === false) return Math.round(capped);

	return Math.round(capped * Math.random());
};
