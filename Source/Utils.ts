import { HTML_EMBED_LINK_PATTERN } from './Constants';

/**
 * Returns a Uint8Array so parser code can handle a single binary type.
 */
export function EnsureUint8Array(Data: Uint8Array | ArrayBuffer): Uint8Array {
	if (Data instanceof Uint8Array) {
		return Data;
	}
	return new Uint8Array(Data);
}

/**
 * Converts a Uint8Array to a base64 string.
 */
export function Uint8ArrayToBase64(Bytes: Uint8Array): string {
	const ChunkSize = 0x8000;
	let Binary = '';

	for (let Index = 0; Index < Bytes.length; Index += ChunkSize) {
		const Chunk = Bytes.subarray(Index, Math.min(Index + ChunkSize, Bytes.length));
		Binary += String.fromCharCode(...Chunk);
	}

	return btoa(Binary);
}

/**
 * Converts a Uint8Array to a UTF-8 string.
 */
export function Uint8ArrayToString(Bytes: Uint8Array): string {
	const Decoder = new TextDecoder('utf-8');
	return Decoder.decode(Bytes);
}

export function CreateHtmlEmbedRegex(): RegExp {
	return new RegExp(HTML_EMBED_LINK_PATTERN, 'gi');
}
