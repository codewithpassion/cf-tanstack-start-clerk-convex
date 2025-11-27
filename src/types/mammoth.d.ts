/**
 * Type declarations for mammoth library.
 * Mammoth extracts raw text from Word documents (doc/docx).
 */
declare module "mammoth" {
	export interface ExtractRawTextResult {
		value: string;
		messages: Message[];
	}

	export interface Message {
		type: string;
		message: string;
	}

	export interface ExtractRawTextOptions {
		buffer?: Buffer;
		path?: string;
		arrayBuffer?: ArrayBuffer;
	}

	const mammoth: {
		extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>;
	};

	export default mammoth;
}
