import { Timeline } from "@akashic-extension/akashic-timeline";
import { PlayerData } from "../data/playerData";
import { LabelButtonE } from "./labelButtonE";

/**
 * Score breakdown configuration constants
 */
const BREAKDOWN_CONFIG = {
	// Modal constants
	MODAL_WIDTH: 500,
	MODAL_HEIGHT: 400,
	CONTENT_MARGIN: 20,
	SECTION_SPACING: 25,
	LINE_HEIGHT: 22,

	// Scroll area
	SCROLL_AREA_HEIGHT: 280,
	ITEM_HEIGHT: 25,

	// Button constants
	BUTTON_WIDTH: 100,
	BUTTON_HEIGHT: 35,

	// Colors
	BACKGROUND_COLOR: "white",
	BORDER_COLOR: "#34495e",
	HEADER_COLOR: "#2c3e50",
	CATEGORY_COLOR: "#8e44ad",
	POSITIVE_COLOR: "#27ae60",
	NEGATIVE_COLOR: "#e74c3c",
	NEUTRAL_COLOR: "#7f8c8d",
	SCROLL_BACKGROUND: "#f8f9fa",

	// Animation constants
	FADE_IN_DURATION: 300,
	SCALE_DURATION: 250,
	STAGGER_DELAY: 50,
} as const;

/**
 * Score source interface for breakdown display
 */
interface ScoreSource {
	category: string;
	description: string;
	points: number;
	timestamp?: number;
}

/**
 * Score breakdown modal entity
 * Shows detailed breakdown of how player earned their points
 */
export class ScoreBreakdownE extends g.E {
	private player: PlayerData;
	private onCloseCallback: () => void;
	private scoreItems: ScoreSource[];

	constructor(param: {
		scene: g.Scene;
		player: PlayerData;
		onClose: () => void;
	}) {
		super({
			scene: param.scene,
			width: g.game.width,
			height: g.game.height,
			touchable: true
		});

		this.player = param.player;
		this.onCloseCallback = param.onClose;
		this.scoreItems = [];

		this.calculateScoreBreakdown();
		this.setupBackground();
		this.setupModal();
	}

	/**
	 * Gets score items for testing
	 */
	getScoreItemsForTesting(): ScoreSource[] {
		return this.scoreItems;
	}

	/**
	 * Gets player data for testing
	 */
	getPlayerForTesting(): PlayerData {
		return this.player;
	}

	/**
	 * Calculates score breakdown from player data
	 */
	private calculateScoreBreakdown(): void {
		this.scoreItems = [];

		// Show a simple breakdown with available real data
		this.scoreItems.push({
			category: "総合スコア",
			description: `最終スコア: ${this.player.points}pt`,
			points: this.player.points,
		});

		// Show task completion information if available
		const taskCount = this.player.taskProgress?.size || 0;
		if (taskCount > 0) {
			this.scoreItems.push({
				category: "タスク完了",
				description: `完了タスク数: ${taskCount}個`,
				points: 0, // Points are included in total score
			});
		}

		// Show item information if available
		const itemCount = this.player.preSettlementItemCount ?? (this.player.ownedItems?.length || 0);
		if (itemCount > 0) {
			this.scoreItems.push({
				category: "アイテム取得",
				description: `取得アイテム数: ${itemCount}個`,
				points: 0, // Points are included in total score
			});
		}

		// Add note about detailed tracking
		this.scoreItems.push({
			category: "注意",
			description: "詳細なスコア履歴は未実装です",
			points: 0,
		});
	}

	/**
	 * Sets up overlay background
	 */
	private setupBackground(): void {
		const overlay = new g.FilledRect({
			scene: this.scene,
			width: this.width,
			height: this.height,
			cssColor: "rgba(0, 0, 0, 0.7)",
			touchable: true
		});

		// Prevent clicks from passing through
		overlay.onPointDown.add(() => {
			// Do nothing to block interaction
		});

		this.append(overlay);
	}

	/**
	 * Sets up breakdown modal
	 */
	private setupModal(): void {
		const modalX = (this.width - BREAKDOWN_CONFIG.MODAL_WIDTH) / 2;
		const modalY = (this.height - BREAKDOWN_CONFIG.MODAL_HEIGHT) / 2;

		const modal = new g.FilledRect({
			scene: this.scene,
			width: BREAKDOWN_CONFIG.MODAL_WIDTH,
			height: BREAKDOWN_CONFIG.MODAL_HEIGHT,
			x: modalX,
			y: modalY,
			cssColor: BREAKDOWN_CONFIG.BACKGROUND_COLOR
		});

		// Add border
		const border = new g.FilledRect({
			scene: this.scene,
			width: BREAKDOWN_CONFIG.MODAL_WIDTH + 4,
			height: BREAKDOWN_CONFIG.MODAL_HEIGHT + 4,
			x: modalX - 2,
			y: modalY - 2,
			cssColor: BREAKDOWN_CONFIG.BORDER_COLOR
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
		let currentY: number = BREAKDOWN_CONFIG.CONTENT_MARGIN;

		// Header
		currentY = this.addHeader(modal, currentY) as number;

		// Score items
		currentY = this.addScoreItems(modal, currentY) as number;

		// Total and close button
		this.addFooter(modal, currentY);
	}

	/**
	 * Adds header section
	 */
	private addHeader(modal: g.E, startY: number): number {
		// Title
		const title = new g.Label({
			scene: this.scene,
			text: `${this.player.profile.name} - スコア内訳`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 20,
				fontColor: BREAKDOWN_CONFIG.HEADER_COLOR
			}),
			x: BREAKDOWN_CONFIG.CONTENT_MARGIN,
			y: startY
		});
		modal.append(title);

		// Subtitle
		const subtitle = new g.Label({
			scene: this.scene,
			text: "ポイント獲得内訳",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: BREAKDOWN_CONFIG.NEUTRAL_COLOR
			}),
			x: BREAKDOWN_CONFIG.CONTENT_MARGIN,
			y: startY + 25
		});
		modal.append(subtitle);

		return startY + 60;
	}

	/**
	 * Adds score items list
	 */
	private addScoreItems(modal: g.E, startY: number): number {
		// Scroll area background
		const scrollBg = new g.FilledRect({
			scene: this.scene,
			width: BREAKDOWN_CONFIG.MODAL_WIDTH - (BREAKDOWN_CONFIG.CONTENT_MARGIN * 2),
			height: BREAKDOWN_CONFIG.SCROLL_AREA_HEIGHT,
			x: BREAKDOWN_CONFIG.CONTENT_MARGIN,
			y: startY,
			cssColor: BREAKDOWN_CONFIG.SCROLL_BACKGROUND
		});
		modal.append(scrollBg);

		// Add score items
		let itemY = startY + 10;
		for (let i = 0; i < this.scoreItems.length; i++) {
			const scoreItem = this.scoreItems[i];
			const itemContainer = this.createScoreItem(scoreItem, i);
			itemContainer.x = BREAKDOWN_CONFIG.CONTENT_MARGIN + 10;
			itemContainer.y = itemY;
			modal.append(itemContainer);
			itemY += BREAKDOWN_CONFIG.ITEM_HEIGHT;
		}

		return startY + BREAKDOWN_CONFIG.SCROLL_AREA_HEIGHT + BREAKDOWN_CONFIG.SECTION_SPACING;
	}

	/**
	 * Creates a single score item display
	 */
	private createScoreItem(scoreItem: ScoreSource, index: number): g.E {
		const container = new g.E({
			scene: this.scene,
			width: BREAKDOWN_CONFIG.MODAL_WIDTH - (BREAKDOWN_CONFIG.CONTENT_MARGIN * 3),
			height: BREAKDOWN_CONFIG.ITEM_HEIGHT
		});

		// Category label
		const categoryLabel = new g.Label({
			scene: this.scene,
			text: scoreItem.category,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: BREAKDOWN_CONFIG.CATEGORY_COLOR
			}),
			x: 0,
			y: 0
		});
		container.append(categoryLabel);

		// Description
		const description = new g.Label({
			scene: this.scene,
			text: scoreItem.description,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 11,
				fontColor: BREAKDOWN_CONFIG.NEUTRAL_COLOR
			}),
			x: 100,
			y: 0
		});
		container.append(description);

		// Points
		const pointsColor = scoreItem.points > 0 ? BREAKDOWN_CONFIG.POSITIVE_COLOR : BREAKDOWN_CONFIG.NEGATIVE_COLOR;
		const pointsText = scoreItem.points > 0 ? `+${scoreItem.points}pt` : `${scoreItem.points}pt`;

		const points = new g.Label({
			scene: this.scene,
			text: pointsText,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: pointsColor
			}),
			x: container.width - 80,
			y: 0
		});
		container.append(points);

		// Animate item entrance
		container.opacity = 0;
		const timeline = new Timeline(this.scene);
		timeline.create(container)
			.wait(index * BREAKDOWN_CONFIG.STAGGER_DELAY)
			.to({ opacity: 1 }, BREAKDOWN_CONFIG.FADE_IN_DURATION);

		return container;
	}

	/**
	 * Adds footer with total and close button
	 */
	private addFooter(modal: g.E, startY: number): void {
		// Separator line
		const separator = new g.FilledRect({
			scene: this.scene,
			width: BREAKDOWN_CONFIG.MODAL_WIDTH - (BREAKDOWN_CONFIG.CONTENT_MARGIN * 2),
			height: 2,
			x: BREAKDOWN_CONFIG.CONTENT_MARGIN,
			y: startY,
			cssColor: BREAKDOWN_CONFIG.BORDER_COLOR
		});
		modal.append(separator);

		// Total score
		const totalLabel = new g.Label({
			scene: this.scene,
			text: `合計スコア: ${this.player.points}pt`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: BREAKDOWN_CONFIG.POSITIVE_COLOR
			}),
			x: BREAKDOWN_CONFIG.CONTENT_MARGIN,
			y: startY + 15
		});
		modal.append(totalLabel);

		// Close button
		const closeButton = new LabelButtonE({
			scene: this.scene,
			text: "閉じる",
			fontSize: 14,
			fontFamily: "sans-serif",
			width: BREAKDOWN_CONFIG.BUTTON_WIDTH,
			height: BREAKDOWN_CONFIG.BUTTON_HEIGHT,
			x: BREAKDOWN_CONFIG.MODAL_WIDTH - BREAKDOWN_CONFIG.BUTTON_WIDTH - BREAKDOWN_CONFIG.CONTENT_MARGIN,
			y: startY + 10,
			backgroundColor: "#95a5a6",
			textColor: "white",
			name: `score_breakdown_close_button_${this.player.id}`,
			args: "close_breakdown",
			onComplete: () => this.handleClose()
		});
		modal.append(closeButton);

		// Animate total with emphasis
		totalLabel.opacity = 0;
		const timeline = new Timeline(this.scene);
		timeline.create(totalLabel)
			.wait(this.scoreItems.length * BREAKDOWN_CONFIG.STAGGER_DELAY + 200)
			.to({ opacity: 1 }, BREAKDOWN_CONFIG.FADE_IN_DURATION);
	}

	/**
	 * Handles close button click
	 */
	private handleClose(): void {
		this.animateExit(() => {
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
			}, BREAKDOWN_CONFIG.SCALE_DURATION);

		const borderTimeline = new Timeline(this.scene);
		borderTimeline.create(border)
			.to({
				opacity: 1,
				scaleX: 1,
				scaleY: 1
			}, BREAKDOWN_CONFIG.SCALE_DURATION);
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
			}, BREAKDOWN_CONFIG.FADE_IN_DURATION)
			.call(onComplete);
	}

}
