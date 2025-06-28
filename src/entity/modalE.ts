import { LabelButtonE } from "./labelButtonE";
import { PanelE } from "./panelE";

/**
 * A modal dialog entity that displays overlay content with title, message, and close button
 * Provides a blocking UI element for user interactions and confirmations
 * @template T Type of the modal's arguments
 */
export class ModalE<T> extends g.E {
	static assetIds: string[] = [...PanelE.assetIds];
	readonly multi: boolean;
	readonly overlay: g.FilledRect;
	readonly content: PanelE;
	private _closeButton: LabelButtonE<T>;
	private titleLabel: g.Label;
	private messageLabels: g.Label[];

	/**
	 * Creates a new Modal instance
	 * @param options Configuration options for the modal
	 * @param options.scene The game scene to attach the modal to
	 * @param options.multi Whether this modal is used in multiplayer mode
	 * @param options.name Unique name identifier for the modal
	 * @param options.args Arguments associated with this modal
	 * @param options.title Title text displayed at the top of the modal
	 * @param options.message Main message text displayed in the modal body
	 * @param options.width Optional width of the modal (default: 400)
	 * @param options.height Optional height of the modal (default: 200)
	 * @param options.onClose Optional callback function executed when modal is closed
	 */
	constructor(options: {
		scene: g.Scene;
		name: string;
		multi: boolean;
		args: T;
		title: string;
		message: string;
		width?: number;
		height?: number;
		onClose?: () => void;
	}) {
		super({
			scene: options.scene,
			width: options.scene.game.width,
			height: options.scene.game.height
		});

		this.multi = options.multi;

		const modalWidth = options.width || 400;
		const modalHeight = options.height || 200;

		// Semi-transparent overlay
		this.overlay = new g.FilledRect({
			scene: options.scene,
			cssColor: "rgba(0,0,0,0.5)",
			width: options.scene.game.width,
			height: options.scene.game.height,
			touchable: true,
			local: true,
		});
		this.append(this.overlay);

		// Modal content background
		this.content = new PanelE({
			scene: options.scene,
			width: modalWidth,
			height: modalHeight,
			x: options.scene.game.width / 2,
			y: options.scene.game.height / 2,
			anchorX: 0.5,
			anchorY: 0.5,
			touchable: true,
			local: true,
		});
		this.append(this.content);

		const font = new g.DynamicFont({
			game: options.scene.game,
			fontFamily: "sans-serif",
			size: 48
		});

		// Title
		this.titleLabel = new g.Label({
			scene: options.scene,
			text: options.title,
			font: font,
			fontSize: 48,
			textColor: "black",
			x: 40,
			y: 40
		});
		this.content.append(this.titleLabel);

		// Message
		this.messageLabels = options.message.split("\n").map((msg, i) => new g.Label({
			scene: options.scene,
			parent: this.content,
			text: msg,
			font: font,
			fontSize: 24,
			textColor: "black",
			x: 40,
			y: 120 + i * 36
		}));

		// Check if content needs to be resized based on text width
		this.adjustContentSizeForText();

		// Close button (positioned using new coordinate system for consistency)
		const buttonWidth = 240;
		const buttonHeight = 120;
		this._closeButton = new LabelButtonE({
			scene: options.scene,
			multi: this.multi,
			name: options.name,
			args: options.args,
			text: "閉じる",
			width: buttonWidth,
			height: buttonHeight,
			x: this.content.width / 2 - buttonWidth / 2, // Center horizontally
			y: this.content.height - 50 - buttonHeight, // 50px margin from bottom
			onComplete: () => {
				if (options.onClose) {
					options.onClose();
				}
				this.destroy();
			}
		});
		this.content.append(this._closeButton);

		// Add visual feedback based on close button sync state
		this.setupSyncStateHandling();

		// Close on overlay click
		this.overlay.onPointDown.add(() => {
			this.closeButton.send();
		});
	}

	get closeButton(): LabelButtonE<T> {
		return this._closeButton;
	}

	/**
	 * Replaces the close button with a custom button while maintaining proper closing behavior
	 * @param options Configuration options for the new button
	 */
	replaceCloseButton(options: {
		text: string;
		backgroundColor?: string;
		textColor?: string;
		fontSize?: number;
		width?: number;
		height?: number;
		x?: number; // Relative to content center x
		y?: number; // Relative to content bottom y
		onComplete?: () => void;
	}): void {
		// For backward compatibility, treat single button as array with one element
		this.replaceCloseButtons([options]);
	}

	/**
	 * Replaces the close button with multiple custom buttons while maintaining proper closing behavior
	 * @param buttonsOptions Array of configuration options for the buttons
	 */
	replaceCloseButtons(buttonsOptions: Array<{
		text: string;
		backgroundColor?: string;
		textColor?: string;
		fontSize?: number;
		width?: number;
		height?: number;
		x?: number; // Relative to content center x
		y?: number; // Relative to content bottom y
		onComplete?: () => void;
	}>): void {
		// Remove the existing close button
		this.content.remove(this._closeButton);

		if (buttonsOptions.length === 0) {
			return;
		}

		// Create buttons with automatic positioning if not specified
		// New coordinate system: center x and bottom y as reference points
		const buttonSpacing = 10;
		const defaultButtonWidth = 240;
		const defaultButtonHeight = 120;
		const contentCenterX = this.content.width / 2;
		const contentBottomY = this.content.height;
		const totalButtonsWidth = buttonsOptions.length * defaultButtonWidth + (buttonsOptions.length - 1) * buttonSpacing;
		const defaultStartXOffset = -totalButtonsWidth / 2; // Center the buttons by default

		buttonsOptions.forEach((buttonOptions, index) => {
			const buttonWidth = buttonOptions.width || defaultButtonWidth;
			const buttonHeight = buttonOptions.height || defaultButtonHeight;

			// Calculate position relative to content center x and bottom y
			const buttonX = buttonOptions.x !== undefined ?
				contentCenterX + buttonOptions.x - buttonWidth / 2 : // Custom x offset from center
				contentCenterX + defaultStartXOffset + (index * (defaultButtonWidth + buttonSpacing)); // Auto-positioned

			const buttonY = buttonOptions.y !== undefined ?
				contentBottomY + buttonOptions.y - buttonHeight : // Custom y offset from bottom
				contentBottomY - 40 - buttonHeight; // Default: 40px margin from bottom

			const button = new LabelButtonE({
				scene: this.scene,
				multi: this.multi,
				name: `${this._closeButton.name}_button_${index}`,
				args: this._closeButton.msgArgs,
				text: buttonOptions.text,
				width: buttonWidth,
				height: buttonHeight,
				x: buttonX,
				y: buttonY,
				backgroundColor: buttonOptions.backgroundColor,
				textColor: buttonOptions.textColor,
				fontSize: buttonOptions.fontSize,
				onComplete: (args) => {
					// Execute custom completion logic first
					if (buttonOptions.onComplete) {
						buttonOptions.onComplete();
					}
					// Then destroy the modal (same as original behavior)
					this.destroy();
				}
			});

			this.content.append(button);

			// Set the first button as the primary close button for overlay click handling
			if (index === 0) {
				this._closeButton = button;
			}
		});

		// Re-setup sync state handling for the primary button
		this.setupSyncStateHandling();
	}

	/**
	 * Sets up visual feedback handling for the close button's sync states
	 * Changes modal and overlay colors based on sending/received states
	 */
	private setupSyncStateHandling(): void {
		this.closeButton.onSync.add((state: "sending" | "received") => {
			// Add modal-specific visual feedback
			if (state === "sending") {
				this.content.opacity = 0.7; // Slightly darker content
				this.overlay.cssColor = "rgba(0,0,0,0.7)"; // Slightly darker overlay
			} else if (state === "received") {
				this.content.opacity = 1.0; // Normal content
				this.overlay.cssColor = "rgba(0,0,0,0.5)"; // Normal overlay
			}

			this.content.modified();
			this.overlay.modified();
		});
	}

	/**
	 * Adjusts the content size based on text width to prevent layout overflow
	 * Resizes the content panel if any label exceeds the available width
	 */
	private adjustContentSizeForText(): void {
		const margin = 40; // x position of labels = margin
		const availableWidth = this.content.width - margin * 2;
		// Calculate available y based on close button position
		// NOTE: ボタンの高さは120という前提を置いている
		const buttonHeight = 120;
		const availableMaxY = this.content.height - margin - buttonHeight - margin;

		// Find the maximum text width among all labels
		let maxTextWidth = 0;

		// Check title label width
		if (this.titleLabel) {
			maxTextWidth = Math.max(maxTextWidth, this.titleLabel.width);
		}

		// Check message labels width
		for (const messageLabel of this.messageLabels) {
			maxTextWidth = Math.max(maxTextWidth, messageLabel.width);
		}

		// If text width exceeds available width, resize content
		if (maxTextWidth > availableWidth) {
			const newContentWidth = maxTextWidth + margin * 2;
			this.content.resize(newContentWidth, this.content.height);
		}

		// Check if content height needs to be adjusted based on message labels
		const maxTextY = Math.max(...this.messageLabels.map(label => label.y + label.height));
		if (maxTextY > availableMaxY) {
			const newContentHeight = maxTextY + margin + buttonHeight + margin;
			this.content.resize(this.content.width, newContentHeight);
			// repositon of close button will be done later
		}
	}
}
