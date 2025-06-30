import { Timeline } from "@akashic-extension/akashic-timeline";
import { GameContext } from "../data/gameContext";
import { PlayerData } from "../data/playerData";
import { PointManager } from "../manager/pointManager";
import { adjustLabelWidthToFit } from "../util/labelUtils";
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
	AVATAR_SIZE: 48,
	NAME_X_OFFSET: 120,
	SCORE_X_OFFSET: 500,
	DETAIL_BUTTON_WIDTH: 120,
	DETAIL_BUTTON_HEIGHT: 60,

	// Colors
	BACKGROUND_COLOR: "#ecf0f1",
	HEADER_COLOR: "#2c3e50",
	RANK_ITEM_COLOR: "white",
	RANK_BORDER_COLOR: "#bdc3c7",
	SELF_BORDER_COLOR: "#e74c3c",
	SELF_BORDER_WIDTH: 6,
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

	// Scroll constants
	SCROLLABLE_AREA_HEIGHT: 550, // Height of scrollable area
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
	private scrollContainer?: g.Pane;
	private scrollOffset: number = 0;
	private maxScrollOffset: number = 0;
	private lastScrollY: number = 0;
	private isScrolling: boolean = false;

	constructor(param: {
		scene: g.Scene;
		gameContext: GameContext;
		pointManager: PointManager;
	}) {
		super({
			scene: param.scene,
			width: g.game.width,
			height: g.game.height,
			opacity: 0, // Start hidden to prevent flash
		});

		this.gameContext = param.gameContext;
		this.pointManager = param.pointManager;
		this.rankedPlayers = [];

		this.setupBackground();
		this.setupHeader();
		this.setupScrollableContainer();
		this.initializeRanking();
	}

	/**
	 * Shows ranking screen
	 */
	override show(): void {
		// Don't immediately set opacity to 1 - this causes flashing
		// Instead, animate the opacity smoothly to avoid visual artifacts

		// Start entrance animations only once
		if (!this.animationsStarted) {
			this.startRankingAnimations();
			this.animationsStarted = true;
		}

		// Smoothly fade in the entire ranking container
		const timeline = new Timeline(this.scene);
		timeline.create(this)
			.to({ opacity: 1 }, RANKING_CONFIG.FADE_IN_DURATION);

		super.show();
	}

	/**
	 * Hides ranking screen
	 */
	override hide(): void {
		this.opacity = 0;
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
	 * Sets up scrollable container for ranking content
	 */
	private setupScrollableContainer(): void {
		const containerHeight = Math.min(RANKING_CONFIG.SCROLLABLE_AREA_HEIGHT, this.height - RANKING_CONFIG.CONTENT_Y_OFFSET - 20);

		this.scrollContainer = new g.Pane({
			scene: this.scene,
			width: this.width,
			height: containerHeight,
			x: 0,
			y: RANKING_CONFIG.CONTENT_Y_OFFSET,
			touchable: true,
			local: true
		});

		// Add scroll event handling
		this.scrollContainer.onPointDown.add((ev) => this.handleScrollStart(ev));
		this.scrollContainer.onPointMove.add((ev) => this.handleScrollMove(ev));
		this.scrollContainer.onPointUp.add((ev) => this.handleScrollEnd(ev));

		this.append(this.scrollContainer);
	}

	/**
	 * Handles scroll start
	 */
	private handleScrollStart(ev: g.PointDownEvent): void {
		this.isScrolling = true;
		this.lastScrollY = this.scrollOffset;
	}

	/**
	 * Handles scroll movement
	 */
	private handleScrollMove(ev: g.PointMoveEvent): void {
		if (!this.isScrolling || !this.scrollContainer) {
			return;
		}

		const oldScrollOffset = this.scrollOffset;
		const newScrollOffset = this.lastScrollY + ev.startDelta.y;

		// Clamp scroll offset (negative values scroll down, positive scroll up)
		const clampedScrollOffset = Math.max(-this.maxScrollOffset, Math.min(newScrollOffset, 0));

		// Round scroll offset to prevent micro-movements
		const roundedScrollOffset = Math.round(clampedScrollOffset);

		// Only update if scroll offset actually changed significantly
		if (Math.abs(oldScrollOffset - roundedScrollOffset) < 1) {
			return;
		}

		// Update scroll offset
		this.scrollOffset = roundedScrollOffset;

		// Update all ranking items position based on scroll offset
		this.rankingItems.forEach((item, index) => {
			const oldY = item.y;
			const newY = index * (RANKING_CONFIG.RANK_ITEM_HEIGHT + RANKING_CONFIG.RANK_ITEM_SPACING) + this.scrollOffset;

			// Only update if position actually changed
			if (Math.abs(oldY - newY) >= 1) {
				item.y = newY;
				item.modified();
			}
		});
	}

	/**
	 * Handles scroll end
	 */
	private handleScrollEnd(ev: g.PointUpEvent): void {
		this.isScrolling = false;
	}

	/**
	 * Updates the maximum scroll offset based on current content
	 */
	private updateMaxScrollOffset(): void {
		if (!this.scrollContainer) return;

		const totalContentHeight = this.rankingItems.length * (RANKING_CONFIG.RANK_ITEM_HEIGHT + RANKING_CONFIG.RANK_ITEM_SPACING);
		const containerHeight = this.scrollContainer.height;
		this.maxScrollOffset = Math.max(0, totalContentHeight - containerHeight);
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
				size: 40,
				fontColor: "white"
			}),
			x: 20,
			y: header.height / 2,
			anchorY: 0.5
		});

		header.append(title);
		this.append(header);
	}

	/**
	 * Creates ranking items
	 */
	private createRankingItems(): void {
		for (let i = 0; i < this.rankedPlayers.length; i++) {
			const player = this.rankedPlayers[i];
			const rank = i + 1;
			const yPosition = i * (RANKING_CONFIG.RANK_ITEM_HEIGHT + RANKING_CONFIG.RANK_ITEM_SPACING);

			const rankItem = this.createRankingItem(player, rank, yPosition, i);
			this.rankingItems.push(rankItem);
			if (this.scrollContainer) {
				this.scrollContainer.append(rankItem);
			}
		}

		// Update max scroll offset after creating all items
		this.updateMaxScrollOffset();
	}

	/**
	 * Creates a single ranking item
	 */
	private createRankingItem(player: PlayerData, rank: number, yPosition: number, index: number): g.E {
		const containerWidth = this.scrollContainer
			? this.scrollContainer.width - (RANKING_CONFIG.CONTENT_MARGIN * 2)
			: this.width - (RANKING_CONFIG.CONTENT_MARGIN * 2);
		const container = new g.E({
			scene: this.scene,
			width: containerWidth,
			height: RANKING_CONFIG.RANK_ITEM_HEIGHT,
			x: RANKING_CONFIG.CONTENT_MARGIN,
			y: yPosition
		});

		// Check if this is the current player
		const isCurrentPlayer = player.id === this.gameContext.currentPlayer.id;

		// Background with border (different style for current player)
		const borderWidth = isCurrentPlayer ? RANKING_CONFIG.SELF_BORDER_WIDTH : 2;
		const borderColor = isCurrentPlayer ? RANKING_CONFIG.SELF_BORDER_COLOR : RANKING_CONFIG.RANK_BORDER_COLOR;
		const border = new g.FilledRect({
			scene: this.scene,
			width: container.width,
			height: container.height,
			cssColor: borderColor
		});

		const background = new g.FilledRect({
			scene: this.scene,
			x: borderWidth,
			y: borderWidth,
			width: container.width - (borderWidth * 2),
			height: container.height - (borderWidth * 2),
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
				size: 32,
				fontColor: rankColor
			}),
			x: 15,
			y: container.height / 2,
			anchorY: 0.5
		});
		container.append(rankLabel);

		// Player avatar (simplified as colored circle)
		const avatarBackground = new g.FilledRect({
			scene: this.scene,
			width: RANKING_CONFIG.AVATAR_SIZE,
			height: RANKING_CONFIG.AVATAR_SIZE,
			x: RANKING_CONFIG.RANK_NUMBER_WIDTH,
			y: container.height / 2,
			anchorY: 0.5,
			cssColor: isCurrentPlayer ? "#ffe082" : "#95a5a6", // Amber for self-posted, gray for others
		});
		container.append(avatarBackground);

		const avatar = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 28,
			}),
			text: player.profile.avatar || "😀", // Default avatar if undefined
			x: avatarBackground.x + avatarBackground.width / 2,
			y: container.height / 2,
			anchorX: 0.5,
			anchorY: 0.5
		});
		container.append(avatar);

		// Player name with width adjustment
		const displayName = isCurrentPlayer ? `${player.profile.name} （あなた）` : player.profile.name;
		const nameLabel = new g.Label({
			scene: this.scene,
			text: displayName,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 32,
				fontColor: RANKING_CONFIG.RANK_TEXT_COLOR,
				fontWeight: isCurrentPlayer ? "bold" : "normal"
			}),
			x: RANKING_CONFIG.NAME_X_OFFSET,
			y: container.height / 2,
			anchorY: 0.5
		});
		// Adjust name width to fit between NAME_X_OFFSET and SCORE_X_OFFSET
		const maxNameWidth = RANKING_CONFIG.SCORE_X_OFFSET - RANKING_CONFIG.NAME_X_OFFSET - 10;
		adjustLabelWidthToFit(nameLabel, maxNameWidth);
		container.append(nameLabel);

		// Player score
		const formatPoints = player.points.toLocaleString();
		const rightPositionPoints = formatPoints.length <= 6 ?
			(new Array(6).fill(" ").join("") + formatPoints).slice(-6) : formatPoints;
		const scoreLabel = new g.Label({
			scene: this.scene,
			text: `${rightPositionPoints}pt`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "monospace",
				size: 32,
				fontColor: RANKING_CONFIG.SCORE_COLOR
			}),
			x: RANKING_CONFIG.SCORE_X_OFFSET,
			y: container.height / 2,
			anchorY: 0.5
		});
		container.append(scoreLabel);

		// Detail button
		const detailButton = new LabelButtonE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			text: "詳細",
			fontSize: 24,
			fontFamily: "sans-serif",
			width: RANKING_CONFIG.DETAIL_BUTTON_WIDTH,
			height: RANKING_CONFIG.DETAIL_BUTTON_HEIGHT,
			x: container.width - RANKING_CONFIG.DETAIL_BUTTON_WIDTH - 20,
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
		container.modified();

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
