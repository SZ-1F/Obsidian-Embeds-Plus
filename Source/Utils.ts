import { NON_BLOCKING_RENDER_TIMEOUT_MS } from './Constants';

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
 * Converts a Uint8Array to a string using the provided text encoding.
 */
export function Uint8ArrayToString(Bytes: Uint8Array, EncodingName?: string): string {
	const SafeEncodingName = NormaliseEncodingName(EncodingName);

	try {
		const Decoder = new TextDecoder(SafeEncodingName);
		return Decoder.decode(Bytes);
	} catch {
		const Decoder = new TextDecoder('utf-8');
		return Decoder.decode(Bytes);
	}
}

function NormaliseEncodingName(EncodingName?: string): string {
	if (!EncodingName) {
		return 'utf-8';
	}

	return EncodingName.trim().toLowerCase() || 'utf-8';
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

export function WithTimeout<T>(
	PromiseValue: Promise<T>,
	TimeoutMs: number,
	ErrorMessage: string
): Promise<T> {
	return new Promise<T>((Resolve, Reject) => {
		const Timer = window.setTimeout(() => {
			Reject(new Error(ErrorMessage));
		}, TimeoutMs);

		PromiseValue.then(
			(Result) => {
				window.clearTimeout(Timer);
				Resolve(Result);
			},
			(ErrorValue) => {
				window.clearTimeout(Timer);
				Reject(ErrorValue);
			}
		);
	});
}
