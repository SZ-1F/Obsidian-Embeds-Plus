import {
	HTML_EMBED_LINK_PATTERN,
	NON_BLOCKING_RENDER_TIMEOUT_MS,
} from './Constants';

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
 * Uses a chunked approach to avoid stack overflow on large images.
 */
export function Uint8ArrayToBase64(Bytes: Uint8Array): string {
	const CHUNK_SIZE = 0x8000; // 32KB chunks avoid call stack overflow.
	let Binary = '';

	for (let I = 0; I < Bytes.length; I += CHUNK_SIZE) {
		const Chunk = Bytes.subarray(I, Math.min(I + CHUNK_SIZE, Bytes.length));
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

/**
 * FNV-1a hash for lightweight content comparison.
 * Avoids full string equality checks when detecting file changes.
 */
export function ContentHash(Str: string): string {
	let Hash = 2166136261;
	for (let I = 0; I < Str.length; I++) {
		Hash ^= Str.charCodeAt(I);
		Hash = Math.imul(Hash, 16777619);
	}
	return (Hash >>> 0).toString(36);
}

export function ScheduleNonBlockingRender(
	Callback: () => void,
	TimeoutMs = NON_BLOCKING_RENDER_TIMEOUT_MS
): void {
	const WindowObject = window as unknown as {
		requestIdleCallback?: (Callback: () => void, Options?: { timeout: number }) => number;
	};
	if (typeof WindowObject.requestIdleCallback === 'function') {
		WindowObject.requestIdleCallback(Callback, { timeout: TimeoutMs });
		return;
	}

	requestAnimationFrame(Callback);
}

export function CreateHtmlEmbedRegex(): RegExp {
	return new RegExp(HTML_EMBED_LINK_PATTERN, 'gi');
}
