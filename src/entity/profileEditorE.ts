import { resolvePlayerInfo } from "@akashic-extension/resolve-player-info";
import { GameContext } from "../data/gameContext";
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
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Callback when profile editing is completed */
	onComplete: () => void;
	/** Callback when profile data changes (optional) */
	onProfileChange?: () => void;
}

/**
 * Profile editor entity for setting user profile information
 */
export class ProfileEditorE extends g.E {
	static assetIds: string[] = [];

	private readonly gameContext: GameContext;
	private readonly screenWidth: number;
	private readonly screenHeight: number;
	private readonly onComplete: () => void;
	private readonly onProfileChange?: () => void;
	private avatarSelection?: RadioButtonGroupE;
	private selectedAvatarId?: string;
	private nameButtonText?: g.Label;

	/**
	 * Creates a new ProfileEditor instance
	 * @param options Configuration options for the profile editor
	 */
	constructor(options: ProfileEditorParameterObject) {
		super(options);

		this.gameContext = options.gameContext;
		this.screenWidth = options.width;
		this.screenHeight = options.height;
		this.onComplete = options.onComplete;
		this.onProfileChange = options.onProfileChange;

		this.createLayout();

		// Initialize name button text with current name if available
		this.initializeNameButtonText();

		// Broadcast current profile on initialization if in multi mode
		this.broadcastProfile();
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
			height: this.screenHeight,
			x: 0,
			y: 0,
			cssColor: "#2c3e50",
		});
		this.append(background);

		// Title
		const titleLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: "white",
			}),
			text: "プロフィール設定",
			x: 50,
			y: 50,
		});
		this.append(titleLabel);

		// Name setting section
		this.createNameSection();

		// Avatar selection section
		this.createAvatarSection();

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
				size: 18,
				fontColor: "white",
			}),
			text: "名前",
			x: 50,
			y: 120,
		});
		this.append(nameLabel);

		// Name setting button background (touchable)
		const nameButtonBg = new g.FilledRect({
			scene: this.scene,
			width: 200,
			height: 40,
			x: 50,
			y: 150,
			cssColor: "#34495e",
			touchable: true,
			local: true,
		});
		nameButtonBg.onPointDown.add(() => {
			if (this.gameContext.gameMode.mode === "multi") {
				// In multi mode, resolvePlayerInfo will trigger onPlayerInfo event
				resolvePlayerInfo({}, (_, playerInfo) => {
					if (playerInfo?.name) {
						this.gameContext.currentPlayer.profile.name = playerInfo.name;
						// Update the name button text to show the new name
						this.updateNameButtonText(playerInfo.name);
						// Broadcast the updated profile to other participants
						this.broadcastProfile();
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
				size: 14,
				fontColor: "white",
			}),
			text: "名前を設定する",
			x: 50 + 10,
			y: 150 + 12,
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
				size: 18,
				fontColor: "white",
			}),
			text: "アバター",
			x: 50,
			y: 220,
		});
		this.append(avatarLabel);

		// Avatar options
		const avatarOptions: RadioButtonOption[] = [
			{ id: "avatar1", label: "😀 笑顔", value: "😀" },
			{ id: "avatar2", label: "😎 クール", value: "😎" },
			{ id: "avatar3", label: "🥰 可愛い", value: "🥰" },
			{ id: "avatar4", label: "🤔 考え中", value: "🤔" },
			{ id: "avatar5", label: "😴 眠い", value: "😴" },
		];

		// Create avatar radio button group
		this.avatarSelection = new RadioButtonGroupE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			x: 50,
			y: 250,
			options: avatarOptions,
			selectedId: "avatar1", // Default selection
			buttonWidth: 150,
			buttonHeight: 35,
			spacing: 10,
			onSelectionChange: (selectedId: string, selectedValue: string) => {
				this.selectedAvatarId = selectedId;
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
	 * Creates the submit button
	 */
	private createSubmitButton(): void {
		const submitButton = new LabelButtonE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			name: "submitProfileButton",
			args: "submit",
			width: 120,
			height: 50,
			x: 50,
			y: 480,
			text: "完了",
			backgroundColor: "#27ae60",
			textColor: "white",
			fontSize: 16,
			onComplete: () => this.handleSubmit(),
		});
		this.append(submitButton);
	}

	/**
	 * Handles form completion
	 */
	private handleSubmit(): void {
		// Profile data is already stored directly in gameVars, so just signal completion
		this.onComplete();
	}
}
