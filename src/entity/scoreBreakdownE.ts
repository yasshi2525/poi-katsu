import { Timeline } from "@akashic-extension/akashic-timeline";
import { GameContext } from "../data/gameContext";
import { PlayerData } from "../data/playerData";
import { getAllTaskMetadata } from "../data/taskConstants";
import { PointManager, PointTransaction } from "../manager/pointManager";
import { adjustLabelWidthToFit } from "../util/labelUtils";
import { LabelButtonE } from "./labelButtonE";

/**
 * Score breakdown configuration constants
 */
const BREAKDOWN_CONFIG = {
	// Modal constants
	MODAL_WIDTH: 750,
	MODAL_HEIGHT: 610,
	CONTENT_MARGIN: 30,
	SECTION_SPACING: 35,
	LINE_HEIGHT: 32,

	// Scroll area
	SCROLL_AREA_HEIGHT: 350,
	ITEM_HEIGHT: 32,

	// Button constants
	BUTTON_WIDTH: 180,
	BUTTON_HEIGHT: 120,

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
	private gameContext: GameContext;
	private pointManager: PointManager;
	private onCloseCallback: () => void;
	private scoreItems: ScoreSource[];
	private otherPlayerTransactions?: PointTransaction[];

	constructor(param: {
		scene: g.Scene;
		player: PlayerData;
		gameContext: GameContext;
		pointManager: PointManager;
		onClose: () => void;
		otherPlayerTransactions?: PointTransaction[];
	}) {
		super({
			scene: param.scene,
			width: g.game.width,
			height: g.game.height
		});

		this.player = param.player;
		this.gameContext = param.gameContext;
		this.pointManager = param.pointManager;
		this.onCloseCallback = param.onClose;
		this.scoreItems = [];
		this.otherPlayerTransactions = param.otherPlayerTransactions;

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

		// 他プレイヤーのトランザクション詳細が渡されている場合はそれを使用
		if (this.otherPlayerTransactions && this.otherPlayerTransactions.length > 0) {
			this.calculateFromTransactionHistory(this.otherPlayerTransactions);
		} else {
			// 現在プレイヤーの場合は既存の方法を使用
			this.calculateFromCurrentPlayer();
		}
	}

	/**
	 * 他プレイヤーのトランザクション履歴からスコア詳細を計算
	 */
	private calculateFromTransactionHistory(transactions: PointTransaction[]): void {
		// トランザクションをソース別にグループ化
		const sourceGroups = new Map<string, PointTransaction[]>();

		transactions.forEach(transaction => {
			const existing = sourceGroups.get(transaction.source) || [];
			existing.push(transaction);
			sourceGroups.set(transaction.source, existing);
		});

		// 各ソースの詳細を表示
		sourceGroups.forEach((transactionList, source) => {
			const totalPoints = transactionList.reduce((sum, t) => sum + t.amount, 0);

			if (totalPoints !== 0) {
				this.scoreItems.push({
					category: this.getSourceCategoryName(source),
					description: this.getSourceDescription(source, transactionList.length),
					points: totalPoints,
					timestamp: Math.max(...transactionList.map(t => t.timestamp))
				});
			}
		});

		// タイムスタンプ順でソート
		this.scoreItems.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
	}

	/**
	 * 現在プレイヤーのスコア詳細を計算（既存のロジック）
	 */
	private calculateFromCurrentPlayer(): void {
		// Use centralized task metadata instead of duplicated lookup
		const taskMetadata = getAllTaskMetadata();

		// Show achieved tasks with their reward points
		const achievedTaskIds = this.gameContext.getAchievedTaskIds();

		if (achievedTaskIds.length > 0) {
			for (const taskId of achievedTaskIds) {
				const taskInfo = taskMetadata[taskId];
				if (taskInfo) {
					this.scoreItems.push({
						category: "タスク報酬",
						description: `${taskInfo.title}`,
						points: taskInfo.rewardPoints,
						timestamp: Date.now() // Placeholder for task completion time
					});
				}
			}
		}

		// Show item information if available
		const itemCount = this.player.preSettlementItemCount ?? (this.player.ownedItems?.length || 0);
		if (itemCount > 0) {
			this.scoreItems.push({
				category: "ショッピング",
				description: `アイテム購入数: ${itemCount}個`,
				points: 0, // Points are included in total score, but shows spending activity
			});
		}

		// Calculate specific point source categories from PointManager transaction history
		// Use actual transaction data instead of estimation
		const actualBreakdown = this.estimatePointSourceBreakdown(0); // Parameter is not used when getting actual data

		actualBreakdown.forEach(item => {
			// Include both positive and negative points (earnings and spending)
			if (item.points !== 0) {
				this.scoreItems.push(item);
			}
		});

		// Total is shown separately in footer, not in the breakdown list
	}

	/**
	 * Gets actual point source breakdown from PointManager transaction history
	 */
	private estimatePointSourceBreakdown(totalNonTaskPoints: number): ScoreSource[] {
		const breakdown: ScoreSource[] = [];

		// Get actual point summary by source from PointManager
		const pointSummary = this.pointManager.getPointSummaryBySource();

		// Map source categories to Japanese descriptions
		const sourceDescriptions: Record<string, string> = {
			"ads": "広告クリック",
			"affiliate": "アフィリエイト",
			"shopping": "ショッピング",
			"join": "サービス参加",
			"settlement": "アイテム精算",
			"other": "その他活動"
		};

		// Convert point summary to breakdown format with Japanese descriptions
		pointSummary.forEach((points, source) => {
			if (source !== "tasks" && points !== 0) {
				// Exclude tasks as they're handled separately, but include both positive and negative points
				breakdown.push({
					category: sourceDescriptions[source] || source,
					description: this.getSourceDescription(source, 1),
					points: points,
				});
			}
		});

		// If no transaction history available, fall back to estimation
		if (breakdown.length === 0 && totalNonTaskPoints !== 0) {
			breakdown.push({
				category: "その他",
				description: totalNonTaskPoints > 0 ? "各種活動による獲得ポイント" : "各種活動による支出",
				points: totalNonTaskPoints,
			});
		}

		return breakdown;
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
			touchable: true,
			local: true
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
		// Title with width adjustment
		const title = new g.Label({
			scene: this.scene,
			text: `${this.player.profile.name} - スコア内訳`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 32,
				fontColor: BREAKDOWN_CONFIG.HEADER_COLOR
			}),
			x: BREAKDOWN_CONFIG.CONTENT_MARGIN,
			y: startY
		});
		// Adjust title width to fit within modal
		const maxTitleWidth = BREAKDOWN_CONFIG.MODAL_WIDTH - BREAKDOWN_CONFIG.CONTENT_MARGIN * 2;
		adjustLabelWidthToFit(title, maxTitleWidth);
		modal.append(title);

		// Subtitle
		const subtitle = new g.Label({
			scene: this.scene,
			text: "ポイント獲得内訳",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: BREAKDOWN_CONFIG.NEUTRAL_COLOR
			}),
			x: BREAKDOWN_CONFIG.CONTENT_MARGIN,
			y: startY + 40
		});
		modal.append(subtitle);

		return startY + 80;
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
			itemContainer.x = BREAKDOWN_CONFIG.CONTENT_MARGIN;
			itemContainer.y = itemY;
			modal.append(itemContainer);
			itemY += BREAKDOWN_CONFIG.ITEM_HEIGHT;
		}

		return startY + BREAKDOWN_CONFIG.SCROLL_AREA_HEIGHT + BREAKDOWN_CONFIG.SECTION_SPACING - 50;
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
				size: 28,
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
				size: 24,
				fontColor: BREAKDOWN_CONFIG.NEUTRAL_COLOR
			}),
			x: 200,
			y: 0
		});
		container.append(description);

		// Points
		const pointsColor = scoreItem.points > 0 ? BREAKDOWN_CONFIG.POSITIVE_COLOR : BREAKDOWN_CONFIG.NEGATIVE_COLOR;
		const formatPoints = Math.abs(scoreItem.points).toLocaleString();
		const rightPositionPoints = formatPoints.length <= 6 ?
			(new Array(6).fill(" ").join("") + formatPoints).slice(-6) : formatPoints;
		const pointsText = scoreItem.points > 0 ? `+${rightPositionPoints}pt` : `-${rightPositionPoints}pt`;

		const points = new g.Label({
			scene: this.scene,
			text: pointsText,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "monospace",
				size: 24,
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
			text: `合計スコア: ${this.player.points.toLocaleString()}pt`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 32,
				fontColor: BREAKDOWN_CONFIG.POSITIVE_COLOR
			}),
			x: BREAKDOWN_CONFIG.CONTENT_MARGIN,
			y: startY + 15
		});
		modal.append(totalLabel);

		// Close button
		const closeButton = new LabelButtonE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			text: "閉じる",
			fontFamily: "sans-serif",
			width: BREAKDOWN_CONFIG.BUTTON_WIDTH,
			height: BREAKDOWN_CONFIG.BUTTON_HEIGHT,
			x: BREAKDOWN_CONFIG.MODAL_WIDTH - BREAKDOWN_CONFIG.BUTTON_WIDTH - BREAKDOWN_CONFIG.CONTENT_MARGIN,
			y: startY + 10,
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

	/**
	 * ソース名を日本語カテゴリ名に変換
	 */
	private getSourceCategoryName(source: string): string {
		const categoryNames: Record<string, string> = {
			"tasks": "タスク報酬",
			"ads": "広告クリック",
			"affiliate": "アフィリエイト",
			"shopping": "ショッピング",
			"join": "サービス参加",
			"settlement": "アイテム精算",
			"sns": "SNS活動",
			"banner": "バナー広告",
			"other": "その他活動"
		};

		return categoryNames[source] || source;
	}

	/**
	 * ソースの説明文を生成
	 */
	private getSourceDescription(source: string, transactionCount: number): string {
		const descriptions: Record<string, string> = {
			"tasks": `タスク完了報酬 (${transactionCount}回)`,
			"ads": `広告クリック報酬 (${transactionCount}回)`,
			"affiliate": `アフィリエイト報酬 (${transactionCount}回)`,
			"shopping": `ショッピング支出 (${transactionCount}回)`,
			"join": `サービス参加報酬 (${transactionCount}回)`,
			"settlement": `アイテム精算報酬 (${transactionCount}回)`,
			"sns": `SNS活動報酬 (${transactionCount}回)`,
			"banner": `バナー広告報酬 (${transactionCount}回)`,
			"other": `その他活動 (${transactionCount}回)`
		};

		return descriptions[source] || `${source} (${transactionCount}回)`;
	}

}
