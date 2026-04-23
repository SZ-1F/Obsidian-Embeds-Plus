export interface PersistentCacheRecord {
	Path: string;
	Mtime: number;
	Version: number;
	Html: string;
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

			Request.onerror = () => Resolve(null);
		});
	}

	async Set(Record: PersistentCacheRecord): Promise<void> {
		const Database = await this.OpenDatabase();
		if (!Database) {
			return;
		}

		await this.PutRecord(Database, Record);

		await this.Prune();
	}

	async DeletePath(Path: string): Promise<void> {
		const Database = await this.OpenDatabase();
		if (!Database) {
			return;
		}

		const Records = await this.GetAllRecords(Database);
		const MatchingRecords = Records.filter((Record) => Record.Path === Path);

		if (MatchingRecords.length === 0) {
			return;
		}

		await new Promise<void>((Resolve) => {
			const Transaction = Database.transaction(StoreName, 'readwrite');
			const Store = Transaction.objectStore(StoreName);

			for (const Record of MatchingRecords) {
				Store.delete(this.BuildKey(Record.Path, Record.Mtime, Record.Version));
			}

			Transaction.oncomplete = () => Resolve();
			Transaction.onerror = () => Resolve();
			Transaction.onabort = () => Resolve();
		});
	}

	async Prune(): Promise<void> {
		const Database = await this.OpenDatabase();
		if (!Database) {
			return;
		}

		const Records = await this.GetAllRecords(Database);
		const SortedRecords = Records.sort((A, B) => B.LastAccessed - A.LastAccessed);

		let TotalBytes = 0;
		const RecordsToKeep: PersistentCacheRecord[] = [];
		const RecordsToDelete: PersistentCacheRecord[] = [];

		for (const Record of SortedRecords) {
			const WouldExceedEntryCap = RecordsToKeep.length >= MaxCacheEntries;
			const WouldExceedByteCap = TotalBytes + Record.ByteSize > MaxCacheBytes;

			if (WouldExceedEntryCap || WouldExceedByteCap) {
				RecordsToDelete.push(Record);
				continue;
			}

			RecordsToKeep.push(Record);
			TotalBytes += Record.ByteSize;
		}

		if (RecordsToDelete.length === 0) {
			return;
		}

		await new Promise<void>((Resolve) => {
			const Transaction = Database.transaction(StoreName, 'readwrite');
			const Store = Transaction.objectStore(StoreName);

			for (const Record of RecordsToDelete) {
				Store.delete(this.BuildKey(Record.Path, Record.Mtime, Record.Version));
			}

			Transaction.oncomplete = () => Resolve();
			Transaction.onerror = () => Resolve();
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
				Request.onerror = () => Resolve(null);
			});
		}

		return this.DatabasePromise;
	}

	private async GetAllRecords(Database: IDBDatabase): Promise<PersistentCacheRecord[]> {
		return new Promise((Resolve) => {
			const Transaction = Database.transaction(StoreName, 'readonly');
			const Store = Transaction.objectStore(StoreName);
			const Request = Store.getAll();

			Request.onsuccess = () => {
				const Results = (Request.result as Array<Partial<PersistentCacheRecord> & { Id?: string }>) ?? [];
				Resolve(
					Results
						.map(({ Id: _Id, ...Record }) => ({
							Path: Record.Path,
							Mtime: Record.Mtime,
							Version:
								typeof Record.Version === 'number'
									? Record.Version
									: 0,
							Html: Record.Html,
							Hash: Record.Hash,
							LastAccessed: Record.LastAccessed,
							ByteSize: Record.ByteSize,
						}))
						.filter(IsPersistentCacheRecord)
				);
			};

			Request.onerror = () => Resolve([]);
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
			Transaction.onerror = () => Resolve();
			Transaction.onabort = () => Resolve();
		});
	}
}

function IsPersistentCacheRecord(Record: Partial<PersistentCacheRecord>): Record is PersistentCacheRecord {
	return (
		typeof Record.Path === 'string' &&
		typeof Record.Mtime === 'number' &&
		typeof Record.Version === 'number' &&
		typeof Record.Html === 'string' &&
		typeof Record.Hash === 'string' &&
		typeof Record.LastAccessed === 'number' &&
		typeof Record.ByteSize === 'number'
	);
}
