import { resolvePlayerInfo } from "@akashic-extension/resolve-player-info";
import { GameContext } from "../data/gameContext";
import { NotificationManager } from "../manager/notificationManager";
import { adjustLabelWidthToFit } from "../util/labelUtils";
import { LabelButtonE } from "./labelButtonE";
import { RadioButtonGroupE, RadioButtonOption } from "./radioButtonGroupE";

/**
 * Profile data interface
 */
export interface ProfileData {
	name?: string;
	avatar?: string;
}

/**
 * Parameter object for ProfileEditor
 */
export interface ProfileEditorParameterObject extends g.EParameterObject {
	gameContext: GameContext;
	/** Notification manager instance */
	notificationManager: NotificationManager;
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Callback when profile editing is completed */
	onComplete: () => void;
	/** Callback when profile data changes (optional) */
	onProfileChange?: () => void;
	/** Callback when SNS connection is requested */
	onSnsConnectionRequest?: () => void;
	/** Callback when shopping connection is requested */
	onShoppingConnectionRequest?: () => void;
}

/**
 * Profile editor entity for setting user profile information
 */
export class ProfileEditorE extends g.E {
	static assetIds: string[] = [];

	private readonly gameContext: GameContext;
	private readonly notificationManager: NotificationManager;
	private readonly screenWidth: number;
	private readonly screenHeight: number;
	private readonly onComplete: () => void;
	private readonly onProfileChange?: () => void;
	private readonly onSnsConnectionRequest?: () => void;
	private readonly onShoppingConnectionRequest?: () => void;
	private avatarSelection?: RadioButtonGroupE;
	private nameButtonText?: g.Label;
	private submitButton?: LabelButtonE<string>;
	private snsConnectionContainer?: g.E;
	private shoppingConnectionContainer?: g.E;

	/**
	 * Creates a new ProfileEditor instance
	 * @param options Configuration options for the profile editor
	 */
	constructor(options: ProfileEditorParameterObject) {
		super(options);

		this.gameContext = options.gameContext;
		this.notificationManager = options.notificationManager;
		this.screenWidth = options.width;
		this.screenHeight = options.height;
		this.onComplete = options.onComplete;
		this.onProfileChange = options.onProfileChange;
		this.onSnsConnectionRequest = options.onSnsConnectionRequest;
		this.onShoppingConnectionRequest = options.onShoppingConnectionRequest;

		this.createLayout();

		// Initialize name button text with current name if available
		this.initializeNameButtonText();

		// Broadcast current profile on initialization if in multi mode
		this.broadcastProfile();

		// Listen for task achievement events to update connection status
		this.setupTaskAchievementListener();
	}

	/**
	 * Reactivates the submit button for reuse
	 * Call this method before showing the profile editor again
	 */
	reactivateSubmitButton(): void {
		if (this.submitButton) {
			this.submitButton.reactivate();
		}
	}

	/**
	 * Initializes the name button text with current player name if available
	 */
	private initializeNameButtonText(): void {
		if (this.gameContext.currentPlayer.profile.name !== "プレイヤー") {
			this.updateNameButtonText(this.gameContext.currentPlayer.profile.name);
		}
	}

	/**
	 * Updates the name button text to display the current player name
	 */
	private updateNameButtonText(playerName: string): void {
		if (this.nameButtonText) {
			this.nameButtonText.text = playerName;
			this.nameButtonText.invalidate();
			adjustLabelWidthToFit(this.nameButtonText, 384 - 20);
		}
	}

	/**
	 * Sets up listener for task achievement events to update connection status
	 */
	private setupTaskAchievementListener(): void {
		this.gameContext.on("taskAchieved", (taskId: string) => {
			this.updateConnectionStatus(taskId);
		});
	}

	/**
	 * Updates connection status display when a relevant task is achieved
	 */
	private updateConnectionStatus(taskId: string): void {
		if (taskId === "sns" && this.snsConnectionContainer) {
			this.recreateConnectionItem("SNS", "sns", 50, this.snsConnectionContainer);
		} else if (taskId === "shopping" && this.shoppingConnectionContainer) {
			this.recreateConnectionItem("通販", "shopping", 50 + (216 + 16) * 2, this.shoppingConnectionContainer);
		}
	}

	/**
	 * Broadcasts current player's profile to other participants
	 */
	private broadcastProfile(): void {
		if (!this.scene) return;

		if (this.gameContext.gameMode.mode === "multi") {
			const message = {
				type: "profileUpdate",
				profileData: {
					playerId: this.gameContext.currentPlayer.id,
					...this.gameContext.currentPlayer.profile
				}
			};

			this.scene.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	/**
	 * Creates the profile editor layout
	 */
	private createLayout(): void {
		// Background
		const background = new g.FilledRect({
			scene: this.scene,
			width: this.screenWidth,
			height: this.screenHeight - 69, // Subtract HeaderE height
			x: 0,
			y: 69, // HeaderE height
			cssColor: "#2c3e50",
		});
		this.append(background);

		// Title
		const titleLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 48,
				fontColor: "white",
			}),
			text: "プロフィール設定",
			x: 50,
			y: 69, // + HeaderE height
		});
		this.append(titleLabel);

		// Name setting section
		this.createNameSection();

		// Avatar selection section
		this.createAvatarSection();

		// Connection status section
		this.createConnectionSection();

		// Submit button
		this.createSubmitButton();
	}

	/**
	 * Creates the name setting section
	 */
	private createNameSection(): void {
		// Name section label
		const nameLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 36,
				fontColor: "white",
			}),
			text: "名前",
			x: 50,
			y: 60 + 69, // + HeaderE height
		});
		this.append(nameLabel);

		// Name setting button background (touchable)
		const nameButtonBg = new g.FilledRect({
			scene: this.scene,
			width: 216 + 16 + 216,
			height: 80,
			x: 50,
			y: 110 + 69, // + HeaderE height
			cssColor: "#689f38",
			touchable: true,
			local: true,
		});
		nameButtonBg.onPointDown.add(() => {
			// NOTE: F5 するとボタンが再活性化してしまうが、費用対効果を考え対策しないこととした
			nameButtonBg.touchable = false; // Disable button to prevent multiple clicks
			nameButtonBg.cssColor = "#9e9e9e"; // Change color to indicate it's pressed
			nameButtonBg.modified();
			nameLabel.opacity = 0.3;
			nameLabel.modified();
			if (this.gameContext.gameMode.mode === "multi") {
				// In multi mode, resolvePlayerInfo will trigger onPlayerInfo event
				resolvePlayerInfo({}, (_, playerInfo) => {
					nameButtonBg.cssColor = "#616161";
					nameButtonBg.modified();
					nameLabel.opacity = 0.7;
					nameLabel.modified();
					if (playerInfo?.name) {
						this.gameContext.currentPlayer.profile.name = playerInfo.name;
						// Update the name button text to show the new name
						this.updateNameButtonText(playerInfo.name);
						// Broadcast the updated profile to other participants
						this.broadcastProfile();
						// NOTE: F5 すると名前の変更が自分の端末だけリセットされる。費用対効果を考え対策しないこととした
						// Notify parent component of profile change
						if (this.onProfileChange) {
							this.onProfileChange();
						}
					}
				});
			}
		});
		this.append(nameButtonBg);

		// Name setting button text
		this.nameButtonText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 36,
				fontColor: "white",
			}),
			text: "名前を設定する",
			x: nameButtonBg.x + nameButtonBg.width / 2,
			y: 110 + 40 + 69, // + HeaderE height
			anchorX: 0.5,
			anchorY: 0.5,
		});
		this.append(this.nameButtonText);
	}

	/**
	 * Creates the avatar selection section
	 */
	private createAvatarSection(): void {
		// Avatar section label
		const avatarLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 36,
				fontColor: "white",
			}),
			text: "アバター",
			x: 50,
			y: 190 + 69, // + HeaderE height
		});
		this.append(avatarLabel);

		// Avatar options
		const avatarOptions: RadioButtonOption[] = [
			{ id: "avatar1", label: "笑顔", value: "😀" },
			{ id: "avatar2", label: "クール", value: "😎" },
			{ id: "avatar3", label: "可愛い", value: "🥰" },
			{ id: "avatar4", label: "考え中", value: "🤔" },
			{ id: "avatar5", label: "眠い", value: "😴" },
		];

		// Create avatar radio button group
		this.avatarSelection = new RadioButtonGroupE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			x: 50,
			y: 240 + 69, // + HeaderE height
			options: avatarOptions,
			selectedId: "avatar1", // Default selection
			buttonWidth: 216,
			buttonHeight: 80,
			spacing: 16,
			onSelectionChange: (_selectedId: string, selectedValue: string) => {
				// Update gameVars directly when avatar is selected
				this.gameContext.currentPlayer.profile.avatar = selectedValue;

				// Broadcast the updated profile to other participants
				if (this.gameContext.gameMode.mode === "multi") {
					this.broadcastProfile();
				}

				// Notify parent component of profile change
				if (this.onProfileChange) {
					this.onProfileChange();
				}
			},
		});
		this.append(this.avatarSelection);
	}

	/**
	 * Creates the connection status section
	 */
	private createConnectionSection(): void {
		// Connection section label
		const connectionLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 36,
				fontColor: "white",
			}),
			text: "サービス連携",
			x: 50,
			y: 320 + 69, // + HeaderE height
		});
		this.append(connectionLabel);

		// SNS connection status
		this.snsConnectionContainer = this.createConnectionItem("SNS", "sns", 50);

		// Shopping connection status
		this.shoppingConnectionContainer = this.createConnectionItem("通販", "shopping", 50 + (216 + 16) * 2);
	}

	/**
	 * Creates a single connection status item
	 */
	private createConnectionItem(serviceName: string, taskId: string, xPosition: number): g.E {
		// Create a container for this connection item
		const container = new g.E({
			scene: this.scene,
			x: 0,
			y: 0,
		});
		this.append(container);

		const isConnected = this.gameContext.hasAchievedTask(taskId);

		// Service name label
		const serviceLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 36,
				fontColor: "white",
			}),
			text: `${serviceName}：`,
			x: xPosition + 216 / 2,
			y: 370 + 40 + 69, // + HeaderE height
			anchorX: 0.5,
			anchorY: 0.5
		});
		container.append(serviceLabel);

		if (isConnected) {
			// Show connected status
			const statusLabel = new g.Label({
				scene: this.scene,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 36,
					fontColor: "#27ae60",
				}),
				text: "接続済み ✓",
				x: xPosition + 216 + 16 + 216 / 2,
				y: 370 + 40 + 69, // + HeaderE height
				anchorX: 0.5,
				anchorY: 0.5
			});
			container.append(statusLabel);
		} else {
			// Show connect button
			const connectButton = new LabelButtonE({
				scene: this.scene,
				multi: this.gameContext.gameMode.mode === "multi",
				name: `connect${serviceName}Button`,
				args: taskId,
				width: 216,
				height: 80,
				x: xPosition + 216 + 16,
				y: 370 + 69, // + HeaderE height
				text: "接続",
				backgroundColor: "#689f38",
				textColor: "white",
				fontSize: 36,
				onComplete: (taskId: string) => this.handleConnectionRequest(taskId),
			});
			container.append(connectButton);
		}

		return container;
	}

	/**
	 * Recreates a connection item with updated status
	 */
	private recreateConnectionItem(serviceName: string, taskId: string, xPosition: number, oldContainer: g.E): void {
		// Remove the old container
		this.remove(oldContainer);
		oldContainer.destroy();

		// Create a new container with updated status
		const newContainer = this.createConnectionItem(serviceName, taskId, xPosition);

		// Update the reference
		if (taskId === "sns") {
			this.snsConnectionContainer = newContainer;
		} else if (taskId === "shopping") {
			this.shoppingConnectionContainer = newContainer;
		}
	}

	/**
	 * Handles connection requests
	 */
	private handleConnectionRequest(taskId: string): void {
		if (taskId === "sns" && this.onSnsConnectionRequest) {
			this.onSnsConnectionRequest();
		} else if (taskId === "shopping" && this.onShoppingConnectionRequest) {
			this.onShoppingConnectionRequest();
		}
	}

	/**
	 * Creates the submit button
	 */
	private createSubmitButton(): void {
		this.submitButton = new LabelButtonE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			name: "submitProfileButton",
			args: "submit",
			width: 240,
			height: 120,
			x: this.width / 2,
			y: 480 + 69, // + HeaderE height
			anchorX: 0.5,
			text: "完了",
			onComplete: () => this.handleSubmit(),
		});
		this.append(this.submitButton);
	}

	/**
	 * Handles form completion
	 */
	private handleSubmit(): void {
		// Profile data is already stored directly in gameVars, so just signal completion
		this.onComplete();
	}
}
