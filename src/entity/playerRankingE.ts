import { Timeline } from "@akashic-extension/akashic-timeline";
import { GameContext } from "../data/gameContext";
import { PlayerData } from "../data/playerData";
import { PointManager } from "../manager/pointManager";
import { LabelButtonE } from "./labelButtonE";
import { PlayerDetailE } from "./playerDetailE";

/**
 * Player ranking configuration constants
 */
const RANKING_CONFIG = {
	// Layout constants
	HEADER_HEIGHT: 80,
	CONTENT_Y_OFFSET: 120,
	CONTENT_MARGIN: 20,
	RANK_ITEM_HEIGHT: 60,
	RANK_ITEM_SPACING: 10,

	// Player ranking item layout
	RANK_NUMBER_WIDTH: 50,
	AVATAR_SIZE: 40,
	NAME_X_OFFSET: 100,
	SCORE_X_OFFSET: 300,
	DETAIL_BUTTON_WIDTH: 80,
	DETAIL_BUTTON_HEIGHT: 30,

	// Colors
	BACKGROUND_COLOR: "#ecf0f1",
	HEADER_COLOR: "#2c3e50",
	RANK_ITEM_COLOR: "white",
	RANK_BORDER_COLOR: "#bdc3c7",
	GOLD_COLOR: "#f1c40f",
	SILVER_COLOR: "#95a5a6",
	BRONZE_COLOR: "#cd7f32",
	RANK_TEXT_COLOR: "#2c3e50",
	SCORE_COLOR: "#27ae60",

	// Animation constants
	FADE_IN_DURATION: 300,
	SLIDE_DURATION: 400,
	STAGGER_DELAY: 100,
	INITIAL_DELAY: 600, // Delay before ranking animations start (after scene transition)
} as const;

/**
 * Player ranking display entity for RankingScene
 * Based on specification section 2.8 ランキング画面 (RankingScene)
 */
export class PlayerRankingE extends g.E {
	static assetIds: string[] = [];
	private gameContext: GameContext;
	private pointManager: PointManager;
	private rankedPlayers: PlayerData[];
	private currentDetailModal: PlayerDetailE | null = null;
	private detailButtons: Map<string, LabelButtonE<string>> = new Map();
	private rankingItems: g.E[] = [];
	private animationsStarted: boolean = false;

	constructor(param: {
		scene: g.Scene;
		gameContext: GameContext;
		pointManager: PointManager;
	}) {
		super({
			scene: param.scene,
			width: g.game.width,
			height: g.game.height,
			touchable: true
		});

		this.gameContext = param.gameContext;
		this.pointManager = param.pointManager;
		this.rankedPlayers = [];

		// Start hidden to prevent flash
		this.opacity = 0;
		this.touchable = false;

		this.setupBackground();
		this.setupHeader();
		this.initializeRanking();
	}

	/**
	 * Shows ranking screen
	 */
	override show(): void {
		this.opacity = 1;
		this.touchable = true;

		// Start entrance animations only once
		if (!this.animationsStarted) {
			this.startRankingAnimations();
			this.animationsStarted = true;
		}

		super.show();
	}

	/**
	 * Hides ranking screen
	 */
	override hide(): void {
		this.opacity = 0;
		this.touchable = false;
		this.closePlayerDetail();
		super.hide();
	}

	/**
	 * Gets ranked players for testing
	 */
	getRankedPlayersForTesting(): PlayerData[] {
		return this.rankedPlayers;
	}

	/**
	 * Gets player rank for testing
	 */
	getPlayerRankForTesting(playerName: string): number {
		const index = this.rankedPlayers.findIndex(p => p.profile.name === playerName);
		return index >= 0 ? index + 1 : -1;
	}

	/**
	 * Initializes ranking display (called once during construction)
	 */
	private initializeRanking(): void {
		// Get and sort players by score
		this.rankedPlayers = Array.from(this.gameContext.allPlayers.values())
			.sort((a, b) => b.points - a.points);

		// Create ranking items
		this.createRankingItems();
	}

	/**
	 * Starts the entrance animations for all ranking items
	 */
	private startRankingAnimations(): void {
		for (let i = 0; i < this.rankingItems.length; i++) {
			this.animateRankItemEntrance(this.rankingItems[i], i);
		}
	}

	/**
	 * Sets up background
	 */
	private setupBackground(): void {
		const background = new g.FilledRect({
			scene: this.scene,
			width: this.width,
			height: this.height,
			cssColor: RANKING_CONFIG.BACKGROUND_COLOR
		});
		this.append(background);
	}

	/**
	 * Sets up header
	 */
	private setupHeader(): void {
		const header = new g.FilledRect({
			scene: this.scene,
			width: this.width,
			height: RANKING_CONFIG.HEADER_HEIGHT,
			cssColor: RANKING_CONFIG.HEADER_COLOR
		});

		const title = new g.Label({
			scene: this.scene,
			text: "最終ランキング",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: "white"
			}),
			x: 20,
			y: 10
		});

		const subtitle = new g.Label({
			scene: this.scene,
			text: "ポイ活ウォーズ結果発表",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: "white"
			}),
			x: 20,
			y: 35
		});

		// Calculate game statistics
		const gameStats = this.calculateGameStatistics();
		const statsText = new g.Label({
			scene: this.scene,
			text: `達成タスク: ${gameStats.totalTasks}個 | 取得アイテム: ${gameStats.totalItems}個`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "white"
			}),
			x: 20,
			y: 58
		});

		header.append(title);
		header.append(subtitle);
		header.append(statsText);
		this.append(header);
	}

	/**
	 * Creates ranking items
	 */
	private createRankingItems(): void {
		for (let i = 0; i < this.rankedPlayers.length; i++) {
			const player = this.rankedPlayers[i];
			const rank = i + 1;
			const yPosition = RANKING_CONFIG.CONTENT_Y_OFFSET + (i * (RANKING_CONFIG.RANK_ITEM_HEIGHT + RANKING_CONFIG.RANK_ITEM_SPACING));

			const rankItem = this.createRankingItem(player, rank, yPosition, i);
			this.rankingItems.push(rankItem);
			this.append(rankItem);
		}
	}

	/**
	 * Creates a single ranking item
	 */
	private createRankingItem(player: PlayerData, rank: number, yPosition: number, index: number): g.E {
		const container = new g.E({
			scene: this.scene,
			width: this.width - (RANKING_CONFIG.CONTENT_MARGIN * 2),
			height: RANKING_CONFIG.RANK_ITEM_HEIGHT,
			x: RANKING_CONFIG.CONTENT_MARGIN,
			y: yPosition
		});

		// Background with border
		const border = new g.FilledRect({
			scene: this.scene,
			width: container.width + 4,
			height: container.height + 4,
			x: -2,
			y: -2,
			cssColor: RANKING_CONFIG.RANK_BORDER_COLOR
		});

		const background = new g.FilledRect({
			scene: this.scene,
			width: container.width,
			height: container.height,
			cssColor: RANKING_CONFIG.RANK_ITEM_COLOR
		});

		container.append(border);
		container.append(background);

		// Rank number with medal colors for top 3
		const rankColor = this.getRankColor(rank);
		const rankLabel = new g.Label({
			scene: this.scene,
			text: `${rank}`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: rankColor
			}),
			x: 15,
			y: 15
		});
		container.append(rankLabel);

		// Player avatar (simplified as colored circle)
		const avatar = new g.FilledRect({
			scene: this.scene,
			width: RANKING_CONFIG.AVATAR_SIZE,
			height: RANKING_CONFIG.AVATAR_SIZE,
			x: RANKING_CONFIG.RANK_NUMBER_WIDTH,
			y: 10,
			cssColor: "#3498db" // Default avatar color
		});
		container.append(avatar);

		// Player name
		const nameLabel = new g.Label({
			scene: this.scene,
			text: player.profile.name + `(${player.id})`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 18,
				fontColor: RANKING_CONFIG.RANK_TEXT_COLOR
			}),
			x: RANKING_CONFIG.NAME_X_OFFSET,
			y: 20
		});
		container.append(nameLabel);

		// Player score
		const scoreLabel = new g.Label({
			scene: this.scene,
			text: `${player.points}pt`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 18,
				fontColor: RANKING_CONFIG.SCORE_COLOR
			}),
			x: RANKING_CONFIG.SCORE_X_OFFSET,
			y: 20
		});
		container.append(scoreLabel);

		// Detail button
		const detailButton = new LabelButtonE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			text: "詳細",
			fontSize: 14,
			fontFamily: "sans-serif",
			width: RANKING_CONFIG.DETAIL_BUTTON_WIDTH,
			height: RANKING_CONFIG.DETAIL_BUTTON_HEIGHT,
			x: container.width - RANKING_CONFIG.DETAIL_BUTTON_WIDTH - 20,
			y: 15,
			backgroundColor: "#3498db",
			textColor: "white",
			name: `player_detail_button_${player.id}`,
			args: player.id,
			onComplete: (playerId: string) => this.showPlayerDetail(playerId)
		});
		container.append(detailButton);

		// Store button for reactivation after modal close
		this.detailButtons.set(player.id, detailButton);

		// Set initial state - hidden
		container.opacity = 0;
		container.x += 50;

		return container;
	}

	/**
	 * Gets rank color for top 3 positions
	 */
	private getRankColor(rank: number): string {
		switch (rank) {
			case 1:
				return RANKING_CONFIG.GOLD_COLOR;
			case 2:
				return RANKING_CONFIG.SILVER_COLOR;
			case 3:
				return RANKING_CONFIG.BRONZE_COLOR;
			default:
				return RANKING_CONFIG.RANK_TEXT_COLOR;
		}
	}

	/**
	 * Animates rank item entrance
	 */
	private animateRankItemEntrance(rankItem: g.E, index: number): void {
		const timeline = new Timeline(this.scene);
		timeline.create(rankItem)
			.wait(RANKING_CONFIG.INITIAL_DELAY + (index * RANKING_CONFIG.STAGGER_DELAY))
			.to({
				opacity: 1,
				x: rankItem.x - 50
			}, RANKING_CONFIG.FADE_IN_DURATION);
	}

	/**
	 * Shows player detail modal
	 */
	private showPlayerDetail(playerId: string): void {
		const player = this.rankedPlayers.find(p => p.id === playerId);
		if (!player) return;

		// Close existing modal if any
		this.closePlayerDetail();

		// Calculate rank
		const rank = this.rankedPlayers.indexOf(player) + 1;

		// Create detail modal
		this.currentDetailModal = new PlayerDetailE({
			scene: this.scene,
			player: player,
			gameContext: this.gameContext,
			pointManager: this.pointManager,
			rank: rank,
			onClose: () => this.closePlayerDetail()
		});

		this.append(this.currentDetailModal);
	}

	/**
	 * Closes player detail modal
	 */
	private closePlayerDetail(): void {
		if (this.currentDetailModal) {
			this.currentDetailModal.destroy();
			this.currentDetailModal = null;
		}

		// Reactivate all detail buttons after modal close, but only if buttons exist
		if (this.detailButtons.size > 0) {
			this.reactivateDetailButtons();
		}
	}

	/**
	 * Reactivates all detail buttons after modal close
	 */
	private reactivateDetailButtons(): void {
		this.detailButtons.forEach(button => {
			button.reactivate();
		});
	}

	/**
	 * Calculates overall game statistics across all players
	 */
	private calculateGameStatistics(): { totalTasks: number; totalItems: number } {
		let totalTasks = 0;
		let totalItems = 0;

		for (const playerData of this.gameContext.allPlayers.values()) {
			totalTasks += playerData.taskProgress?.size || 0;
			totalItems += playerData.preSettlementItemCount ?? (playerData.ownedItems?.length || 0);
		}

		return { totalTasks, totalItems };
	}
}
