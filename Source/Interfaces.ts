export interface WebResource {
	WebResourceData?: Uint8Array | ArrayBuffer;
	WebResourceURL?: string;
	WebResourceMIMEType?: string;
	WebResourceTextEncodingName?: string;
	WebResourceFrameName?: string;
}

export interface WebArchiveData {
	WebMainResource?: WebResource;
	WebSubresources?: WebResource[];
	WebSubframeArchives?: WebArchiveData[];
}
