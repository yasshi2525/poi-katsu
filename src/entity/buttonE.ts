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
		if ((this.scene.game.vars as GameVars).mode === "multi") {
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
		this.sync = "received";
		this.onSyncStateChange(this.sync);
		this.onSync.fire(this.sync);
		if (this.onCompleteHandler) {
			this.onCompleteHandler(args);
		}
	}
}
