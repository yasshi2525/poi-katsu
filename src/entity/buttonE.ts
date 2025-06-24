/**
 * Message arguments structure for ButtonE communication
 * @template T Type of the arguments
 */
export interface ButtonEMessageArgs<T> {
	/** Name identifier for the button message */
	name: string;
	/** Arguments payload for the message */
	args: T;
}

/**
 * Parameter object for ButtonE initialization
 * @template T Type of the button's arguments
 */
export interface ButtonEParameterObject<T> extends g.EParameterObject {
	/** Unique name identifier for the button */
	name: string;
	/** Arguments associated with this button */
	args: T;
	/** Button width in pixels */
	width: number;
	/** Button height in pixels */
	height: number;
	/** Optional callback function executed when button action completes */
	onComplete?: (args: T) => void;
}

/**
 * Abstract base class for interactive button entities
 * Provides common button functionality including press handling, sync states, and messaging
 * @template T Type of the button's arguments
 * @template A Type of constructor arguments
 */
export abstract class ButtonE<T, A extends ButtonEParameterObject<T>> extends g.E {
	msgArgs: T;
	readonly name: string;
	readonly onPress: g.Trigger<boolean> = new g.Trigger();
	readonly onSync: g.Trigger<"sending" | "received"> = new g.Trigger();
	private sync: "idle" | "sending" | "received";
	private pressed: boolean;
	private pressedBy?: number;
	private onCompleteHandler?: (args: T) => void;
	private loadingOverlay?: g.E;

	/**
	 * Creates a new ButtonE instance
	 * @param options Configuration options for the button
	 */
	protected constructor(options: A) {
		super({
			...options,
			local: true,
			touchable: true,
		});
		this.name = options.name;
		this.msgArgs = options.args;
		this.sync = "idle";
		this.pressed = false;
		this.onCompleteHandler = options.onComplete;
		this.setupButtonEvents();
		this.createVisualElements(options);
	}

	/**
	 * Gets the current synchronization state of the button
	 * @returns Current sync state ("idle", "sending", or "received")
	 */
	get _sync(): "idle" | "sending" | "received" {
		return this.sync;
	}

	/**
	 * Gets whether the button is currently pressed
	 * @returns True if button is pressed, false otherwise
	 */
	get _pressed(): boolean {
		return this.pressed;
	}

	/**
	 * Gets the ID of the pointer that pressed this button
	 * @returns Pointer ID if button is pressed, undefined otherwise
	 */
	get _isPressedBy(): number | undefined {
		return this.pressedBy;
	}

	/**
	 * Gets the completion handler function
	 * @returns The onComplete callback function if set, undefined otherwise
	 */
	get _onCompleteHandler(): ((args: T) => void) | undefined {
		return this.onCompleteHandler;
	}

	/**
	 * Abstract method to create visual elements for the button
	 * Must be implemented by subclasses to define button appearance
	 * @param options Configuration options for the button, passed from constructor
	 */
	protected abstract createVisualElements(options: A): void;

	/**
	 * Abstract method called when button press state changes
	 * Must be implemented by subclasses to handle visual press feedback
	 * @param pressed Whether the button is pressed
	 */
	protected abstract onPressedStateChange(pressed: boolean): void;

	/**
	 * Abstract method called when button sync state changes
	 * Must be implemented by subclasses to handle visual sync feedback
	 * @param state Current sync state
	 */
	protected abstract onSyncStateChange(state: "sending" | "received"): void;

	/**
	 * Sends the button action/message
	 * In multiplayer mode, broadcasts message to other players
	 * In single player mode, immediately processes the action
	 */
	send(): void {
		if (this.sync !== "idle") {
			return;
		}
		this.sync = "sending";
		this.onSyncStateChange(this.sync);

		// Create loading overlay for multi-mode to prevent multiple interactions
		if ((this.scene.game.vars as GameVars).mode === "multi") {
			this.createLoadingOverlay();

			const message: MessageData<ButtonEMessageArgs<T>> = {
				name: "submit",
				args: {
					name: this.name,
					args: this.msgArgs
				}
			};
			this.scene.game.raiseEvent(new g.MessageEvent(message));
		} else {
			this.onReceive(this.msgArgs);
		}
	}

	reactivate(): void {
		if (this.sync === "received") {
			this.sync = "idle";
		}
	}

	/**
	 * Sets up event handlers for button interactions
	 * Handles point down/up events and message processing
	 */
	private setupButtonEvents(): void {
		this.onPointDown.add(e => {
			if (this.sync !== "idle" || this.pressed) {
				return;
			}
			this.pressed = true;
			this.pressedBy = e.pointerId;
			this.onPressedStateChange(true);
			this.onPress.fire(true);
		});

		this.onPointUp.add(e => {
			if (this.sync !== "idle" || !this.pressed || this.pressedBy !== e.pointerId) {
				return;
			}
			this.pressed = false;
			this.pressedBy = undefined;
			this.onPressedStateChange(false);
			this.onPress.fire(false);
			this.send();
		});

		if ((this.scene.game.vars as GameVars).mode === "multi") {
			this.onMessage.add(e => {
				if (e.player?.id === this.scene.game.selfId && e.data.name === "submit" && e.data.args?.name === this.name) {
					this.onReceive(e.data.args?.args);
				}
			});
		}
	}

	/**
	 * Handles receiving the button action response
	 * Updates sync state to "received" and executes completion handler
	 * @param args Arguments received with the response
	 */
	private onReceive(args: T): void {
		if (this.sync === "received") {
			return;
		}

		// Destroy loading overlay before completing
		this.destroyLoadingOverlay();

		this.sync = "received";
		this.onSyncStateChange(this.sync);
		this.onSync.fire(this.sync);
		if (this.onCompleteHandler) {
			this.onCompleteHandler(args);
		}
	}

	/**
	 * Creates a full-screen loading overlay to prevent interactions during multi-mode processing
	 */
	private createLoadingOverlay(): void {
		if (this.loadingOverlay) {
			return; // Already exists
		}

		// Create full-screen overlay
		this.loadingOverlay = new g.E({
			scene: this.scene,
			width: this.scene.game.width,
			height: this.scene.game.height,
			touchable: true,
			local: true,
		});

		// Semi-transparent background
		const background = new g.FilledRect({
			scene: this.scene,
			width: this.scene.game.width,
			height: this.scene.game.height,
			cssColor: "rgba(0,0,0,0.3)",
		});
		this.loadingOverlay.append(background);

		// Loading indicator (simple spinning circle)
		const loadingIcon = new g.FilledRect({
			scene: this.scene,
			width: 40,
			height: 40,
			cssColor: "#3498db",
			x: this.scene.game.width / 2 - 20,
			y: this.scene.game.height / 2 - 20,
		});
		this.loadingOverlay.append(loadingIcon);

		// Add simple rotation animation using scene.onUpdate
		let rotation = 0;
		const rotationHandler = (): void => {
			rotation += 5;
			if (rotation >= 360) rotation = 0;
			loadingIcon.angle = rotation * Math.PI / 180;
			loadingIcon.modified();
		};
		this.scene.onUpdate.add(rotationHandler);

		// Loading text
		const loadingText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: "white",
			}),
			text: "処理中...",
			x: this.scene.game.width / 2 - 30,
			y: this.scene.game.height / 2 + 30,
		});
		this.loadingOverlay.append(loadingText);

		// Append to scene
		this.scene.append(this.loadingOverlay);
	}

	/**
	 * Destroys the loading overlay
	 */
	private destroyLoadingOverlay(): void {
		if (this.loadingOverlay) {
			this.loadingOverlay.destroy();
			this.loadingOverlay = undefined;
		}
	}
}
