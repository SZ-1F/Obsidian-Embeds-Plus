import { App, Modal, Setting } from 'obsidian';

export class ConfirmModal extends Modal {
	constructor(
		AppInstance: App,
		private readonly Title: string,
		private readonly Message: string,
		private readonly ConfirmLabel: string,
		private readonly OnConfirm: () => void
	) {
		super(AppInstance);
	}

	onOpen(): void {
		const { contentEl: ContentElement } = this;
		ContentElement.empty();

		ContentElement.createEl('h2', { text: this.Title });
		ContentElement.createEl('p', { text: this.Message });

		new Setting(ContentElement)
			.addButton((Button) =>
				Button.setButtonText('Cancel').onClick(() => {
					this.close();
				})
			)
			.addButton((Button) =>
				Button.setButtonText(this.ConfirmLabel)
					.setWarning()
					.onClick(() => {
						this.OnConfirm();
						this.close();
					})
			);
	}

	onClose(): void {
		const { contentEl: ContentElement } = this;
		ContentElement.empty();
	}
}
