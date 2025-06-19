import { ButtonE, ButtonEParameterObject } from "./buttonE";

/**
 * Parameter object for LabelButtonE
 * @template T Type of the button's arguments
 */
export interface LabelButtonEParameterObject<T> extends ButtonEParameterObject<T> {
	/** Text to display on the button */
	text: string;
	/** Background color of the button (default: "#4A90E2") */
	backgroundColor?: string;
	/** Text color of the button (default: "white") */
	textColor?: string;
	/** Font size for the button text (default: 16) */
	fontSize?: number;
	/** Font family for the button text (default: "sans-serif") */
	fontFamily?: string;
}

/**
 * A button entity that displays text with customizable styling
 * Extends ButtonE to provide text-based button functionality with colors and fonts
 * @template T Type of the button's arguments
 */
export class LabelButtonE<T> extends ButtonE<T, LabelButtonEParameterObject<T>> {
	private background!: g.FilledRect;
	private label!: g.Label;
	private font!: g.DynamicFont;
	private options!: LabelButtonEParameterObject<T>;

	/**
	 * Creates a new LabelButtonE instance
	 * @param options Configuration options for the label button
	 */
	constructor(options: LabelButtonEParameterObject<T>) {
		super(options);
		this.options = options;
	}

	/**
	 * Creates and initializes the visual elements (background and text label)
	 * Sets up the filled rectangle background and text label with proper positioning
	 */
	protected createVisualElements(options: LabelButtonEParameterObject<T>): void {
		this.background = new g.FilledRect({
			scene: this.scene,
			cssColor: options.backgroundColor || "#4A90E2",
			width: this.width,
			height: this.height
		});
		this.append(this.background);

		this.font = new g.DynamicFont({
			game: this.scene.game,
			fontFamily: options.fontFamily || "sans-serif",
			size: options.fontSize || 16
		});

		this.label = new g.Label({
			scene: this.scene,
			text: options.text,
			font: this.font,
			fontSize: options.fontSize || 16,
			textColor: options.textColor || "white",
			x: (this.width - options.text.length * (options.fontSize || 16) * 0.6) / 2,
			y: (this.height - (options.fontSize || 16)) / 2
		});
		this.append(this.label);
	}

	/**
	 * Handles visual changes when button press state changes
	 * Changes background color between normal and pressed states
	 * @param pressed Whether the button is currently pressed
	 */
	protected onPressedStateChange(pressed: boolean): void {
		const normalColor = this.options.backgroundColor || "#4A90E2";
		const pressedColor = "#357ABD";

		this.background.cssColor = pressed ? pressedColor : normalColor;
		this.background.modified();
	}

	/**
	 * Handles visual changes when button sync state changes
	 * Changes colors to indicate sending (orange) and received (green) states
	 * @param state Current sync state ("sending" or "received")
	 */
	protected onSyncStateChange(state: "sending" | "received"): void {
		const sendingColor = "#FFA500"; // Orange for sending state
		const receivedColor = "#28A745"; // Green for received state

		if (state === "sending") {
			this.background.cssColor = sendingColor;
			this.label.textColor = "white";
		} else if (state === "received") {
			this.background.cssColor = receivedColor;
			this.label.textColor = "white";
		}

		this.background.modified();
		this.label.invalidate();
	}

	/**
	 * Changes the text displayed on the button
	 * Updates the label and repositions it to center
	 * @param text New text to display
	 */
	setText(text: string): void {
		this.label.text = text;
		this.label.invalidate();

		this.label.x = (this.width - text.length * (this.options.fontSize || 16) * 0.6) / 2;
		this.label.modified();
	}

	/**
	 * Changes the background color of the button
	 * @param color New background color (CSS color string)
	 */
	setBackgroundColor(color: string): void {
		this.options.backgroundColor = color;
		this.background.cssColor = color;
		this.background.modified();
	}

	/**
	 * Changes the text color of the button
	 * @param color New text color (CSS color string)
	 */
	setTextColor(color: string): void {
		this.options.textColor = color;
		this.label.textColor = color;
		this.label.invalidate();
	}
}
