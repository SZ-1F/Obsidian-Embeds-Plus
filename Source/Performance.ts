/**
 * Performance timing utilities for tracking embed rendering stages.
 */

// Enable debug timing in development.
const EnableDebugTiming = false;

const ActiveTimings = new Map<string, Map<string, number>>();
const StageDurations = new Map<string, number>();

/**
 * Marks the start of a named timing stage for the given file.
 */
export function StartStage(FilePath: string, StageName: string): void {
	if (!EnableDebugTiming) {
		return;
	}

	let FileTimings = ActiveTimings.get(FilePath);
	if (!FileTimings) {
		FileTimings = new Map();
		ActiveTimings.set(FilePath, FileTimings);
	}

	FileTimings.set(StageName, performance.now());
}

/**
 * Marks the end of a timing stage and returns the elapsed milliseconds.
 */
export function EndStage(FilePath: string, StageName: string): number {
	if (!EnableDebugTiming) {
		return 0;
	}

	const FileTimings = ActiveTimings.get(FilePath);
	if (!FileTimings) {
		return 0;
	}

	const StartMs = FileTimings.get(StageName);
	if (StartMs === undefined) {
		return 0;
	}

	const DurationMs = performance.now() - StartMs;
	FileTimings.delete(StageName);

	return DurationMs;
}

/**
 * Records a stage duration directly, when elapsed time has already been measured.
 */
export function RecordStage(
	FilePath: string,
	StageName: string,
	DurationMs: number
): void {
	if (!EnableDebugTiming) {
		return;
	}

	const MetricKey = `${FilePath}:${StageName}`;
	StageDurations.set(MetricKey, DurationMs);
}

/**
 * Log a performance summary for a file render.
 */
export function LogPerformanceSummary(FilePath: string, Context: string): void {
	if (!EnableDebugTiming) {
		return;
	}

	const Prefix = FilePath.split('/').pop() ?? FilePath;
	const Stages: string[] = [];

	for (const [Key, DurationMs] of StageDurations) {
		if (Key.startsWith(`${FilePath}:`)) {
			const StageName = Key.substring(FilePath.length + 1);
			Stages.push(`${StageName}: ${DurationMs.toFixed(1)}ms`);
		}
	}

	for (const Key of StageDurations.keys()) {
		if (Key.startsWith(`${FilePath}:`)) {
			StageDurations.delete(Key);
		}
	}

	ActiveTimings.delete(FilePath);

	if (Stages.length === 0) {
		return;
	}

	console.log(`[Embeds-Plus Perf] ${Prefix} - ${Context}: ${Stages.join(', ')}`);
}
