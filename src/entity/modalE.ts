import { LabelButtonE } from "./labelButtonE";
import { PanelE } from "./panelE";

/**
 * A modal dialog entity that displays overlay content with title, message, and close button
 * Provides a blocking UI element for user interactions and confirmations
 * @template T Type of the modal's arguments
 */
export class ModalE<T> extends g.E {
	static assetIds: string[] = [...PanelE.assetIds];
	readonly overlay: g.FilledRect;
	readonly content: PanelE;
	private _closeButton: LabelButtonE<T>;
	private titleLabel: g.Label;
	private messageLabels: g.Label[];

	/**
	 * Creates a new Modal instance
	 * @param options Configuration options for the modal
	 * @param options.scene The game scene to attach the modal to
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

		const modalWidth = options.width || 400;
		const modalHeight = options.height || 200;

		// Semi-transparent overlay
		this.overlay = new g.FilledRect({
			scene: options.scene,
			cssColor: "rgba(0,0,0,0.5)",
			width: options.scene.game.width,
			height: options.scene.game.height,
			touchable: true,
			local: true
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
		});
		this.append(this.content);

		const font = new g.DynamicFont({
			game: options.scene.game,
			fontFamily: "sans-serif",
			size: 24
		});

		// Title
		this.titleLabel = new g.Label({
			scene: options.scene,
			text: options.title,
			font: font,
			fontSize: 20,
			textColor: "black",
			x: 20,
			y: 20
		});
		this.content.append(this.titleLabel);

		// Message
		this.messageLabels = options.message.split("\n").map((msg, i) => new g.Label({
			scene: options.scene,
			parent: this.content,
			text: msg,
			font: font,
			fontSize: 16,
			textColor: "black",
			x: 20,
			y: 60 + i * 24
		}));

		// Close button
		this._closeButton = new LabelButtonE({
			scene: options.scene,
			name: options.name,
			args: options.args,
			text: "Close",
			width: 80,
			height: 30,
			x: modalWidth - 100,
			y: modalHeight - 50,
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
		x?: number;
		y?: number;
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
		x?: number;
		y?: number;
		onComplete?: () => void;
	}>): void {
		// Remove the existing close button
		this.content.remove(this._closeButton);

		if (buttonsOptions.length === 0) {
			return;
		}

		// Create buttons with automatic positioning if not specified
		const buttonSpacing = 10;
		const defaultButtonWidth = 80;
		const defaultButtonHeight = 30;
		const totalButtonsWidth = buttonsOptions.length * defaultButtonWidth + (buttonsOptions.length - 1) * buttonSpacing;
		const startX = (this.content.width - totalButtonsWidth) / 2;

		buttonsOptions.forEach((buttonOptions, index) => {
			const buttonX = buttonOptions.x !== undefined ?
				buttonOptions.x :
				startX + (index * (defaultButtonWidth + buttonSpacing));

			const buttonY = buttonOptions.y !== undefined ?
				buttonOptions.y :
				this.content.height - 50;

			const button = new LabelButtonE({
				scene: this.scene,
				name: `${this._closeButton.name}_button_${index}`,
				args: this._closeButton.msgArgs,
				text: buttonOptions.text,
				width: buttonOptions.width || defaultButtonWidth,
				height: buttonOptions.height || defaultButtonHeight,
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
}
