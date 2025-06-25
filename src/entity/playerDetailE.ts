import { Timeline } from "@akashic-extension/akashic-timeline";
import { GameContext } from "../data/gameContext";
import { PlayerData } from "../data/playerData";
import { PointManager } from "../manager/pointManager";
import { LabelButtonE } from "./labelButtonE";
import { ScoreBreakdownE } from "./scoreBreakdownE";

/**
 * Player detail configuration constants
 */
const DETAIL_CONFIG = {
	// Modal constants
	MODAL_WIDTH: 600,
	MODAL_HEIGHT: 500,
	CONTENT_MARGIN: 20,
	SECTION_SPACING: 30,
	LINE_HEIGHT: 25,

	// Avatar and profile
	AVATAR_SIZE: 80,
	PROFILE_SECTION_HEIGHT: 120,

	// Score section
	SCORE_SECTION_HEIGHT: 150,

	// Button constants
	BUTTON_WIDTH: 100,
	BUTTON_HEIGHT: 40,
	BUTTON_SPACING: 120,

	// Colors
	BACKGROUND_COLOR: "white",
	BORDER_COLOR: "#34495e",
	HEADER_COLOR: "#2c3e50",
	RANK_COLOR: "#8e44ad",
	SCORE_COLOR: "#27ae60",
	SECTION_BACKGROUND: "#f8f9fa",

	// Animation constants
	FADE_IN_DURATION: 400,
	SCALE_DURATION: 300,
} as const;

/**
 * Player detail modal entity
 * Shows detailed player information and score breakdown
 */
export class PlayerDetailE extends g.E {
	private player: PlayerData;
	private gameContext: GameContext;
	private pointManager: PointManager;
	private rank: number;
	private onCloseCallback: () => void;
	private scoreBreakdown: ScoreBreakdownE | null = null;
	private breakdownButton: LabelButtonE<string> | null = null;

	constructor(param: {
		scene: g.Scene;
		player: PlayerData;
		gameContext: GameContext;
		pointManager: PointManager;
		rank: number;
		onClose: () => void;
	}) {
		super({
			scene: param.scene,
			width: g.game.width,
			height: g.game.height,
			touchable: true
		});

		this.player = param.player;
		this.gameContext = param.gameContext;
		this.pointManager = param.pointManager;
		this.rank = param.rank;
		this.onCloseCallback = param.onClose;

		this.setupBackground();
		this.setupModal();
	}

	/**
	 * Gets player data for testing
	 */
	getPlayerForTesting(): PlayerData {
		return this.player;
	}

	/**
	 * Gets rank for testing
	 */
	getRankForTesting(): number {
		return this.rank;
	}

	/**
	 * Sets up overlay background
	 */
	private setupBackground(): void {
		const overlay = new g.FilledRect({
			scene: this.scene,
			width: this.width,
			height: this.height,
			cssColor: "rgba(0, 0, 0, 0.6)",
			touchable: true
		});

		// Prevent clicks from passing through
		overlay.onPointDown.add(() => {
			// Do nothing to block interaction
		});

		this.append(overlay);
	}

	/**
	 * Sets up detail modal
	 */
	private setupModal(): void {
		const modalX = (this.width - DETAIL_CONFIG.MODAL_WIDTH) / 2;
		const modalY = (this.height - DETAIL_CONFIG.MODAL_HEIGHT) / 2;

		const modal = new g.FilledRect({
			scene: this.scene,
			width: DETAIL_CONFIG.MODAL_WIDTH,
			height: DETAIL_CONFIG.MODAL_HEIGHT,
			x: modalX,
			y: modalY,
			cssColor: DETAIL_CONFIG.BACKGROUND_COLOR
		});

		// Add border
		const border = new g.FilledRect({
			scene: this.scene,
			width: DETAIL_CONFIG.MODAL_WIDTH + 4,
			height: DETAIL_CONFIG.MODAL_HEIGHT + 4,
			x: modalX - 2,
			y: modalY - 2,
			cssColor: DETAIL_CONFIG.BORDER_COLOR
		});

		this.append(border);
		this.append(modal);

		this.setupModalContent(modal);
		this.animateModalEntrance(modal, border);
	}

	/**
	 * Sets up modal content
	 */
	private setupModalContent(modal: g.E): void {
		let currentY: number = DETAIL_CONFIG.CONTENT_MARGIN;

		// Header section
		currentY = this.addHeaderSection(modal, currentY) as number;

		// Profile section
		currentY = this.addProfileSection(modal, currentY) as number;

		// Score section
		currentY = this.addScoreSection(modal, currentY) as number;

		// Action buttons
		this.addActionButtons(modal, currentY);
	}

	/**
	 * Adds header section with rank and name
	 */
	private addHeaderSection(modal: g.E, startY: number): number {
		// Rank badge
		const rankBadge = new g.FilledRect({
			scene: this.scene,
			width: 60,
			height: 30,
			x: DETAIL_CONFIG.CONTENT_MARGIN,
			y: startY,
			cssColor: DETAIL_CONFIG.RANK_COLOR
		});

		const rankText = new g.Label({
			scene: this.scene,
			text: `${this.rank}位`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: "white"
			}),
			x: 10,
			y: 5
		});

		rankBadge.append(rankText);
		modal.append(rankBadge);

		// Player name
		const playerName = new g.Label({
			scene: this.scene,
			text: this.player.profile.name,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: DETAIL_CONFIG.HEADER_COLOR
			}),
			x: 100,
			y: startY
		});
		modal.append(playerName);

		// Total score
		const totalScore = new g.Label({
			scene: this.scene,
			text: `総合スコア: ${this.player.points}pt`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 18,
				fontColor: DETAIL_CONFIG.SCORE_COLOR
			}),
			x: 100,
			y: startY + 30
		});
		modal.append(totalScore);

		return startY + 80;
	}

	/**
	 * Adds profile section
	 */
	private addProfileSection(modal: g.E, startY: number): number {
		// Section background
		const sectionBg = new g.FilledRect({
			scene: this.scene,
			width: DETAIL_CONFIG.MODAL_WIDTH - (DETAIL_CONFIG.CONTENT_MARGIN * 2),
			height: DETAIL_CONFIG.PROFILE_SECTION_HEIGHT,
			x: DETAIL_CONFIG.CONTENT_MARGIN,
			y: startY,
			cssColor: DETAIL_CONFIG.SECTION_BACKGROUND
		});
		modal.append(sectionBg);

		// Section title
		const sectionTitle = new g.Label({
			scene: this.scene,
			text: "プロフィール",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 18,
				fontColor: DETAIL_CONFIG.HEADER_COLOR
			}),
			x: DETAIL_CONFIG.CONTENT_MARGIN + 10,
			y: startY + 10
		});
		modal.append(sectionTitle);

		// Avatar
		const avatar = new g.FilledRect({
			scene: this.scene,
			width: DETAIL_CONFIG.AVATAR_SIZE,
			height: DETAIL_CONFIG.AVATAR_SIZE,
			x: DETAIL_CONFIG.CONTENT_MARGIN + 20,
			y: startY + 40,
			cssColor: "#3498db" // Default avatar color
		});
		modal.append(avatar);

		// Player stats
		const statsContainer = new g.E({
			scene: this.scene,
			x: DETAIL_CONFIG.CONTENT_MARGIN + 120,
			y: startY + 40
		});

		const completedTasks = this.player.taskProgress?.size || 0;
		const ownedItems = this.player.preSettlementItemCount ?? (this.player.ownedItems?.length || 0);

		const tasksStat = new g.Label({
			scene: this.scene,
			text: `完了タスク: ${completedTasks}個`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: DETAIL_CONFIG.HEADER_COLOR
			})
		});

		const itemsStat = new g.Label({
			scene: this.scene,
			text: `所持アイテム: ${ownedItems}個`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: DETAIL_CONFIG.HEADER_COLOR
			}),
			y: DETAIL_CONFIG.LINE_HEIGHT
		});

		const playTimeStat = new g.Label({
			scene: this.scene,
			text: "プレイ時間: 未実装", // TODO: Implement play time tracking
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: DETAIL_CONFIG.HEADER_COLOR
			}),
			y: DETAIL_CONFIG.LINE_HEIGHT * 2
		});

		statsContainer.append(tasksStat);
		statsContainer.append(itemsStat);
		statsContainer.append(playTimeStat);
		modal.append(statsContainer);

		return startY + DETAIL_CONFIG.PROFILE_SECTION_HEIGHT + DETAIL_CONFIG.SECTION_SPACING;
	}

	/**
	 * Adds score section with breakdown button
	 */
	private addScoreSection(modal: g.E, startY: number): number {
		// Section background
		const sectionBg = new g.FilledRect({
			scene: this.scene,
			width: DETAIL_CONFIG.MODAL_WIDTH - (DETAIL_CONFIG.CONTENT_MARGIN * 2),
			height: DETAIL_CONFIG.SCORE_SECTION_HEIGHT,
			x: DETAIL_CONFIG.CONTENT_MARGIN,
			y: startY,
			cssColor: DETAIL_CONFIG.SECTION_BACKGROUND
		});
		modal.append(sectionBg);

		// Section title
		const sectionTitle = new g.Label({
			scene: this.scene,
			text: "スコア詳細",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 18,
				fontColor: DETAIL_CONFIG.HEADER_COLOR
			}),
			x: DETAIL_CONFIG.CONTENT_MARGIN + 10,
			y: startY + 10
		});
		modal.append(sectionTitle);

		// Score summary
		const baseScore = this.player.points; // TODO: Separate base score from bonuses
		const bonusScore = 0; // TODO: Calculate bonus scores

		const baseScoreLabel = new g.Label({
			scene: this.scene,
			text: `基本スコア: ${baseScore}pt`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: DETAIL_CONFIG.SCORE_COLOR
			}),
			x: DETAIL_CONFIG.CONTENT_MARGIN + 20,
			y: startY + 45
		});
		modal.append(baseScoreLabel);

		const bonusScoreLabel = new g.Label({
			scene: this.scene,
			text: `ボーナス: ${bonusScore}pt`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: DETAIL_CONFIG.SCORE_COLOR
			}),
			x: DETAIL_CONFIG.CONTENT_MARGIN + 20,
			y: startY + 70
		});
		modal.append(bonusScoreLabel);

		// Score breakdown button
		this.breakdownButton = new LabelButtonE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			text: "内訳表示",
			fontSize: 14,
			fontFamily: "sans-serif",
			width: 100,
			height: 30,
			x: DETAIL_CONFIG.CONTENT_MARGIN + 20,
			y: startY + 100,
			backgroundColor: "#3498db",
			textColor: "white",
			name: `score_breakdown_button_${this.player.id}`,
			args: "show_breakdown",
			onComplete: () => this.showScoreBreakdown()
		});
		modal.append(this.breakdownButton);

		return startY + DETAIL_CONFIG.SCORE_SECTION_HEIGHT + DETAIL_CONFIG.SECTION_SPACING;
	}

	/**
	 * Adds action buttons
	 */
	private addActionButtons(modal: g.E, startY: number): void {
		// Close button
		const closeButton = new LabelButtonE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			text: "閉じる",
			fontSize: 16,
			fontFamily: "sans-serif",
			width: DETAIL_CONFIG.BUTTON_WIDTH,
			height: DETAIL_CONFIG.BUTTON_HEIGHT,
			x: (DETAIL_CONFIG.MODAL_WIDTH - DETAIL_CONFIG.BUTTON_WIDTH) / 2,
			y: startY,
			backgroundColor: "#95a5a6",
			textColor: "white",
			name: `player_detail_close_button_${this.player.id}`,
			args: "close_detail",
			onComplete: () => this.handleClose()
		});
		modal.append(closeButton);
	}

	/**
	 * Shows score breakdown
	 */
	private showScoreBreakdown(): void {
		if (this.scoreBreakdown) {
			this.remove(this.scoreBreakdown);
		}

		this.scoreBreakdown = new ScoreBreakdownE({
			scene: this.scene,
			player: this.player,
			gameContext: this.gameContext,
			pointManager: this.pointManager,
			onClose: () => this.closeScoreBreakdown()
		});

		this.append(this.scoreBreakdown);
	}

	/**
	 * Closes score breakdown
	 */
	private closeScoreBreakdown(): void {
		if (this.scoreBreakdown) {
			this.scoreBreakdown.destroy();
			this.scoreBreakdown = null;
		}

		// Reactivate breakdown button for multiple interactions
		if (this.breakdownButton) {
			this.breakdownButton.reactivate();
		}
	}

	/**
	 * Handles close button click
	 */
	private handleClose(): void {
		this.closeScoreBreakdown();
		this.animateExit(() => {
			if (this.parent) {
				this.destroy();
			}
			this.onCloseCallback();
		});
	}

	/**
	 * Animates modal entrance
	 */
	private animateModalEntrance(modal: g.E, border: g.E): void {
		modal.opacity = 0;
		border.opacity = 0;
		modal.scaleX = 0.8;
		modal.scaleY = 0.8;
		border.scaleX = 0.8;
		border.scaleY = 0.8;

		const timeline = new Timeline(this.scene);
		timeline.create(modal)
			.to({
				opacity: 1,
				scaleX: 1,
				scaleY: 1
			}, DETAIL_CONFIG.SCALE_DURATION);

		const borderTimeline = new Timeline(this.scene);
		borderTimeline.create(border)
			.to({
				opacity: 1,
				scaleX: 1,
				scaleY: 1
			}, DETAIL_CONFIG.SCALE_DURATION);
	}

	/**
	 * Animates modal exit
	 */
	private animateExit(onComplete: () => void): void {
		const timeline = new Timeline(this.scene);
		timeline.create(this)
			.to({
				opacity: 0,
				scaleX: 0.9,
				scaleY: 0.9
			}, DETAIL_CONFIG.FADE_IN_DURATION)
			.call(onComplete);
	}
}
