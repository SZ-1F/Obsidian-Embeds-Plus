import { Modal, App, Setting } from 'obsidian';

export class EditEmbedModal extends Modal {
	private FilePath: string;
	private readonly OnSave: (NewPath: string) => void;

	constructor(AppInstance: App, CurrentPath: string, OnSave: (NewPath: string) => void) {
		super(AppInstance);
		this.FilePath = CurrentPath;
		this.OnSave = OnSave;
	}

	onOpen(): void {
		const { contentEl: ContentElement } = this;
		ContentElement.empty();

		ContentElement.createEl('h2', { text: 'Edit HTML Embed' });

		new Setting(ContentElement)
			.setName('File path')
			.setDesc('Enter the path to the HTML file you want to embed')
			.addText((Text) =>
				Text.setPlaceholder('path/to/file.html')
					.setValue(this.FilePath)
					.onChange((Value) => {
						this.FilePath = Value;
					})
			);

		new Setting(ContentElement)
			.addButton((Button) =>
				Button.setButtonText('Cancel').onClick(() => {
					this.close();
				})
			)
			.addButton((Button) =>
				Button.setButtonText('Save')
					.setCta()
					.onClick(() => {
						this.OnSave(this.FilePath);
						this.close();
					})
			);
	}

	onClose(): void {
		const { contentEl: ContentElement } = this;
		ContentElement.empty();
	}
}
