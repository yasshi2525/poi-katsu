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
		// Remove the existing close button
		this.content.remove(this._closeButton);

		// Create new close button with custom styling but same core functionality
		const newCloseButton = new LabelButtonE({
			scene: this.scene,
			name: this._closeButton.name + "_replaced",
			args: this._closeButton.msgArgs,
			text: options.text,
			width: options.width || 80,
			height: options.height || 30,
			x: options.x !== undefined ? options.x : this._closeButton.x,
			y: options.y !== undefined ? options.y : this._closeButton.y,
			backgroundColor: options.backgroundColor,
			textColor: options.textColor,
			fontSize: options.fontSize,
			onComplete: (args) => {
				// Execute custom completion logic first
				if (options.onComplete) {
					options.onComplete();
				}
				// Then destroy the modal (same as original behavior)
				this.destroy();
			}
		});

		// Replace the reference and append to content
		this._closeButton = newCloseButton;
		this.content.append(newCloseButton);

		// Re-setup sync state handling for the new button
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
