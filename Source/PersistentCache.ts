import { RootLog } from './Logger';

const ModuleLog = RootLog.getSubLogger({ name: 'PERSISTENT_CACHE' });

export interface PersistentCacheRecord {
	Path: string;
	Mtime: number;
	Version: number;
	Html: string;
	Hash: string;
	LastAccessed: number;
	ByteSize: number;
}

/**
 * Metadata used for pruning cached data.
 */
interface PersistentCacheMetadata {
	Path: string;
	Mtime: number;
	Version: number;
	Hash: string;
	LastAccessed: number;
	ByteSize: number;
}

const DatabaseName = 'EmbedsPlusCache';
const StoreName = 'RenderedHtml';
const DatabaseVersion = 1;
const MaxCacheEntries = 10;
const MaxCacheBytes = 25 * 1024 * 1024;

export class PersistentCache {
  private DatabasePromise: Promise<IDBDatabase | null> | null = null;

	private WriteQueue: Promise<void> = Promise.resolve();

	async Get(Path: string, Mtime: number, Version: number): Promise<PersistentCacheRecord | null> {
		const Database = await this.OpenDatabase();
		if (!Database) {
			return null;
		}

		return new Promise((Resolve) => {
			const Transaction = Database.transaction(StoreName, 'readonly');
			const Store = Transaction.objectStore(StoreName);
			const Request = Store.get(this.BuildKey(Path, Mtime, Version));

			Request.onsuccess = () => {
				const Result = Request.result as (PersistentCacheRecord & { Id?: string }) | undefined;
				if (!Result) {
					Resolve(null);
					return;
				}

				Resolve({
					Path: Result.Path,
					Mtime: Result.Mtime,
					Version: Result.Version,
					Html: Result.Html,
					Hash: Result.Hash,
					LastAccessed: Result.LastAccessed,
					ByteSize: Result.ByteSize,
				});
			};

			Request.onerror = () => {
				ModuleLog.error('Failed to read record from persistent cache', Request.error);
				Resolve(null);
			};
		});
	}

	async Set(Record: PersistentCacheRecord): Promise<void> {
		const Database = await this.OpenDatabase();
		if (!Database) {
			return;
		}

		// Serialise the write & prune through the queue to prevent races.
		this.WriteQueue = this.WriteQueue.then(() => this.SetInternal(Database, Record));
		await this.WriteQueue;
	}

	async DeletePath(Path: string): Promise<void> {
		const Database = await this.OpenDatabase();
		if (!Database) {
			return;
		}

		this.WriteQueue = this.WriteQueue.then(() => this.DeletePathInternal(Database, Path));
		await this.WriteQueue;
	}

	async Prune(): Promise<void> {
		const Database = await this.OpenDatabase();
		if (!Database) {
			return;
		}

		this.WriteQueue = this.WriteQueue.then(() => this.PruneInternal(Database));
		await this.WriteQueue;
	}

	private async SetInternal(Database: IDBDatabase, Record: PersistentCacheRecord): Promise<void> {
		await this.PutRecord(Database, Record);
		await this.PruneInternal(Database);
	}

	private async DeletePathInternal(Database: IDBDatabase, Path: string): Promise<void> {
		const Metadata = await this.GetAllRecordMetadata(Database);
		const Matching = Metadata.filter((Record) => Record.Path === Path);

		if (Matching.length === 0) {
			return;
		}

		await new Promise<void>((Resolve) => {
			const Transaction = Database.transaction(StoreName, 'readwrite');
			const Store = Transaction.objectStore(StoreName);

			for (const Record of Matching) {
				Store.delete(this.BuildKey(Record.Path, Record.Mtime, Record.Version));
			}

			Transaction.oncomplete = () => Resolve();
			Transaction.onerror = () => {
				ModuleLog.error('Failed to delete records from persistent cache', Transaction.error);
				Resolve();
			};
			Transaction.onabort = () => Resolve();
		});
	}

	private async PruneInternal(Database: IDBDatabase): Promise<void> {
		// Use metadata records to avoid reading full HTML bodies during prune.
		const Metadata = await this.GetAllRecordMetadata(Database);
		const SortedMetadata = Metadata.sort((A, B) => B.LastAccessed - A.LastAccessed);

		let TotalBytes = 0;
		const ToKeep: PersistentCacheMetadata[] = [];
		const ToDelete: PersistentCacheMetadata[] = [];

		for (const Record of SortedMetadata) {
			const WouldExceedEntryCap = ToKeep.length >= MaxCacheEntries;
			const WouldExceedByteCap = TotalBytes + Record.ByteSize > MaxCacheBytes;

			if (WouldExceedEntryCap || WouldExceedByteCap) {
				ToDelete.push(Record);
				continue;
			}

			ToKeep.push(Record);
			TotalBytes += Record.ByteSize;
		}

		if (ToDelete.length === 0) {
			return;
		}

		await new Promise<void>((Resolve) => {
			const Transaction = Database.transaction(StoreName, 'readwrite');
			const Store = Transaction.objectStore(StoreName);

			for (const Record of ToDelete) {
				Store.delete(this.BuildKey(Record.Path, Record.Mtime, Record.Version));
			}

			Transaction.oncomplete = () => Resolve();
			Transaction.onerror = () => {
				ModuleLog.error('Failed to prune persistent cache', Transaction.error);
				Resolve();
			};
			Transaction.onabort = () => Resolve();
		});
	}

	private async OpenDatabase(): Promise<IDBDatabase | null> {
		if (typeof indexedDB === 'undefined') {
			return null;
		}

		if (!this.DatabasePromise) {
			this.DatabasePromise = new Promise((Resolve) => {
				const Request = indexedDB.open(DatabaseName, DatabaseVersion);

				Request.onupgradeneeded = () => {
					const Database = Request.result;
					if (!Database.objectStoreNames.contains(StoreName)) {
						Database.createObjectStore(StoreName, { keyPath: 'Id' });
					}
				};

				Request.onsuccess = () => Resolve(Request.result);
				Request.onerror = () => {
					ModuleLog.error('Failed to open persistent cache database', Request.error);
					Resolve(null);
				};
			});
		}

		return this.DatabasePromise;
	}

	/**
	 * Reads all records (only the metadata fields), skipping the HTML body.
	 * Used during prune to avoid loading large HTML strings unnecessarily.
	 */
	private async GetAllRecordMetadata(Database: IDBDatabase): Promise<PersistentCacheMetadata[]> {
		return new Promise((Resolve) => {
			const Transaction = Database.transaction(StoreName, 'readonly');
			const Store = Transaction.objectStore(StoreName);
			const Results: PersistentCacheMetadata[] = [];
			const Request = Store.openCursor();

			Request.onsuccess = () => {
				const Cursor = Request.result;
				if (!Cursor) {
					Resolve(Results);
					return;
				}

				const Raw = Cursor.value as Partial<PersistentCacheRecord & { Id?: string }>;
				if (
					typeof Raw.Path === 'string' &&
					typeof Raw.Mtime === 'number' &&
					typeof Raw.Version === 'number' &&
					typeof Raw.Hash === 'string' &&
					typeof Raw.LastAccessed === 'number' &&
					typeof Raw.ByteSize === 'number'
				) {
					Results.push({
						Path: Raw.Path,
						Mtime: Raw.Mtime,
						Version: Raw.Version,
						Hash: Raw.Hash,
						LastAccessed: Raw.LastAccessed,
						ByteSize: Raw.ByteSize,
					});
				}

				Cursor.continue();
			};

			Request.onerror = () => {
				ModuleLog.error('Failed to read metadata from persistent cache', Request.error);
				Resolve(Results);
			};
		});
	}

	private BuildKey(Path: string, Mtime: number, Version: number): string {
		return `${Path}::${Mtime}::v${Version}`;
	}

	private async PutRecord(Database: IDBDatabase, Record: PersistentCacheRecord): Promise<void> {
		await new Promise<void>((Resolve) => {
			const Transaction = Database.transaction(StoreName, 'readwrite');
			const Store = Transaction.objectStore(StoreName);
			Store.put({ ...Record, Id: this.BuildKey(Record.Path, Record.Mtime, Record.Version) });

			Transaction.oncomplete = () => Resolve();
			Transaction.onerror = () => {
				ModuleLog.error('Failed to write record to persistent cache', Transaction.error);
				Resolve();
			};
			Transaction.onabort = () => Resolve();
		});
	}
}
