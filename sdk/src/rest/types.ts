import type { RequestOptions, RequestTransformer, ResponseTransformer } from '../types/request.js';

export interface RestCommand<_Output extends object | unknown, _Schema> {
	(): RequestOptions;
}

export interface RestClient<Schema> {
	request<Output>(options: RestCommand<Output, Schema>): Promise<Output>;
}

export interface RestConfig {
	credentials?: RequestCredentials;
	timeout?: number;
	// onError?: (error: any) => any;
	onRequest?: RequestTransformer;
	onResponse?: ResponseTransformer;
}
