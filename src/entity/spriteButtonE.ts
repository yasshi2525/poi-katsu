import { ButtonE, ButtonEParameterObject } from "./buttonE";

/**
 * Parameter object for SpriteButtonE
 * @template T Type of the button's arguments
 */
export interface SpriteButtonEParameterObject<T> extends ButtonEParameterObject<T> {
	/** Asset ID for the normal (default) image */
	normalImageAssetId: string;
	/** Asset ID for the pressed state image (optional) */
	pressedImageAssetId?: string;
	/** Asset ID for the hover state image (optional) */
	hoverImageAssetId?: string;
	/** Asset ID for the disabled state image (optional) */
	disabledImageAssetId?: string;
	/** X-axis scale factor (default: 1) */
	scaleX?: number;
	/** Y-axis scale factor (default: 1) */
	scaleY?: number;
}

/**
 * A button entity that uses sprite images for visual representation
 * Extends ButtonE to provide image-based button functionality with different states
 * @template T Type of the button's arguments
 */
export class SpriteButtonE<T> extends ButtonE<T, SpriteButtonEParameterObject<T>> {
	private sprite!: g.Sprite;
	private options!: SpriteButtonEParameterObject<T>;
	private normalAsset!: g.ImageAsset;
	private pressedAsset?: g.ImageAsset;
	private hoverAsset?: g.ImageAsset;
	private disabledAsset?: g.ImageAsset;

	/**
	 * Creates a new SpriteButtonE instance
	 * @param options Configuration options for the sprite button
	 */
	constructor(options: SpriteButtonEParameterObject<T>) {
		super(options);
		this.options = options;
	}

	/**
	 * Creates and initializes the visual sprite elements for the button
	 * Loads image assets and creates the main sprite with proper scaling and positioning
	 */
	protected createVisualElements(options: SpriteButtonEParameterObject<T>): void {

		this.normalAsset = this.scene.asset.getImageById(options.normalImageAssetId);

		if (options.pressedImageAssetId) {
			this.pressedAsset = this.scene.asset.getImageById(options.pressedImageAssetId);
		}

		if (options.hoverImageAssetId) {
			this.hoverAsset = this.scene.asset.getImageById(options.hoverImageAssetId);
		}

		if (options.disabledImageAssetId) {
			this.disabledAsset = this.scene.asset.getImageById(options.disabledImageAssetId);
		}

		this.sprite = new g.Sprite({
			scene: this.scene,
			src: this.normalAsset,
			width: this.normalAsset.width,
			height: this.normalAsset.height,
			scaleX: options.scaleX || 1,
			scaleY: options.scaleY || 1
		});

		const centerX = (this.width - this.sprite.width * (options.scaleX || 1)) / 2;
		const centerY = (this.height - this.sprite.height * (options.scaleY || 1)) / 2;
		this.sprite.x = centerX;
		this.sprite.y = centerY;

		this.append(this.sprite);
	}

	/**
	 * Handles visual changes when button press state changes
	 * Switches between normal and pressed sprite images
	 * @param pressed Whether the button is currently pressed
	 */
	protected onPressedStateChange(pressed: boolean): void {
		if (pressed && this.pressedAsset) {
			this.sprite.src = this.pressedAsset;
		} else {
			this.sprite.src = this.normalAsset;
		}
		this.sprite.invalidate();
	}

	/**
	 * Handles visual changes when button sync state changes
	 * Applies opacity changes to indicate sending/received states
	 * @param state Current sync state ("sending" or "received")
	 */
	protected onSyncStateChange(state: "sending" | "received"): void {
		if (state === "sending") {
			// Apply a darker tint when sending
			this.sprite.opacity = 0.7;
		} else if (state === "received") {
			// Apply a green tint when received
			this.sprite.opacity = 1.0;
			// Could add a green overlay effect here if needed
		}
		this.sprite.modified();
	}

	/**
	 * Changes the normal (default) image of the button
	 * Updates the sprite immediately if button is not currently pressed
	 * @param assetId Asset ID of the new normal image
	 */
	setNormalImage(assetId: string): void {
		this.normalAsset = this.scene.asset.getImageById(assetId);
		if (!this._pressed) {
			this.sprite.src = this.normalAsset;
			this.sprite.invalidate();
		}
	}

	/**
	 * Changes the pressed state image of the button
	 * Updates the sprite immediately if button is currently pressed
	 * @param assetId Asset ID of the new pressed image
	 */
	setPressedImage(assetId: string): void {
		this.pressedAsset = this.scene.asset.getImageById(assetId);
		if (this._pressed) {
			this.sprite.src = this.pressedAsset;
			this.sprite.invalidate();
		}
	}

	/**
	 * Updates the scale of the button sprite and repositions it to center
	 * @param scaleX Scale factor for X-axis
	 * @param scaleY Scale factor for Y-axis
	 */
	setScale(scaleX: number, scaleY: number): void {
		this.sprite.scaleX = scaleX;
		this.sprite.scaleY = scaleY;
		this.sprite.modified();

		const centerX = (this.width - this.sprite.width * scaleX) / 2;
		const centerY = (this.height - this.sprite.height * scaleY) / 2;
		this.sprite.x = centerX;
		this.sprite.y = centerY;
		this.sprite.modified();
	}
}
