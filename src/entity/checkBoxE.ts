import { ButtonE, ButtonEParameterObject } from "./buttonE";

/**
 * Parameter object for CheckBoxE
 */
export interface CheckBoxEParameterObject extends g.EParameterObject {
	/** Unique name identifier for the checkbox */
	name: string;
	/** Image asset for the checkbox frames */
	imageAsset: g.ImageAsset;
	/** Initial checked state (default: false) */
	checked?: boolean;
	/** Optional callback function executed when checkbox state changes */
	onChange?: (checked: boolean) => void;
}

/**
 * A checkbox entity that uses FrameSprite for checked/unchecked states
 * Frame 0 = unchecked, Frame 1 = checked
 * Width is half the asset width to show single frame
 * msgArgs means next state to toggle to
 */
export class CheckBoxE extends ButtonE<boolean, CheckBoxEParameterObject & ButtonEParameterObject<boolean>> {
	/** Trigger fired when checkbox state changes */
	readonly onChange: g.Trigger<boolean> = new g.Trigger();

	private frameSprite!: g.FrameSprite;
	private imageAsset: g.ImageAsset;
	private checked: boolean;
	private onChangeHandler?: (checked: boolean) => void;

	/**
	 * Creates a new CheckBoxE instance
	 * @param options Configuration options for the checkbox
	 */
	constructor(options: CheckBoxEParameterObject) {
		super({
			...options,
			args: !options.checked, // toggled state as args
			width: options.imageAsset.width / 2, // Half width to show single frame
			height: options.imageAsset.height,
			onComplete: (checked) => { // Toggle when button action completes
				this.setChecked(checked);
				this.reactivate();
			}
		});

		this.imageAsset = options.imageAsset;
		this.checked = options.checked || false;
		this.onChangeHandler = options.onChange;
	}

	/**
	 * Gets the current checked state
	 * @returns Whether the checkbox is checked
	 */
	public isChecked(): boolean {
		return this.checked;
	}

	/**
	 * Sets the checked state
	 * Private method - only called internally or through ButtonE's onComplete mechanism
	 * @param checked New checked state
	 */
	private setChecked(checked: boolean): void {
		if (this.checked !== checked) {
			this.checked = checked;
			this.updateFrame();
			if (this.onChangeHandler) {
				this.onChangeHandler(this.checked);
			}
			this.onChange.fire(this.checked);
		}
		// Toggle state for next press
		// msgArgs is used to determine next state to toggle to
		// If currently checked, next state will be unchecked, and vice versa
		this.msgArgs = !checked;
	}

	/**
	 * Creates and initializes the visual frame sprite elements
	 */
	protected createVisualElements(options: CheckBoxEParameterObject & ButtonEParameterObject<boolean>): void {
		this.frameSprite = new g.FrameSprite({
			scene: this.scene,
			src: options.imageAsset,
			width: this.width,
			height: this.height,
			frames: [0, 1], // Frame 0 = unchecked, Frame 1 = checked
		});

		// Set initial frame based on checked state
		this.updateFrame();

		this.append(this.frameSprite);
	}

	/**
	 * Updates the frame sprite to show correct state
	 */
	private updateFrame(): void {
		// Frame 0 = unchecked, Frame 1 = checked
		this.frameSprite.frameNumber = this.checked ? 1 : 0;
		this.frameSprite.modified();
	}

	/**
	 * Handles visual changes when checkbox press state changes
	 * @param pressed Whether the checkbox is currently pressed
	 */
	protected onPressedStateChange(pressed: boolean): void {
		if (pressed) {
			// Slightly darken when pressed
			this.frameSprite.opacity = 0.8;
		} else {
			// Return to normal opacity
			this.frameSprite.opacity = 1.0;
		}
		this.frameSprite.modified();
	}

	/**
	 * Handles visual changes when checkbox sync state changes
	 * @param state Current sync state
	 */
	protected onSyncStateChange(state: "sending" | "received"): void {
		if (state === "sending") {
			// Darken checkbox during sending state
			this.frameSprite.opacity = 0.6;
		} else {
			// Return to normal opacity when received
			this.frameSprite.opacity = 1.0;
		}
		this.frameSprite.modified();
	}
}
