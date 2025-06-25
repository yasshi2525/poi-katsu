import { Timeline } from "@akashic-extension/akashic-timeline";
import { GameContext } from "../data/gameContext";
import { SetInfo } from "../data/itemData";

/**
 * Settlement result configuration constants
 */
const RESULT_CONFIG = {
	// Layout constants
	MODAL_WIDTH: 600,
	MODAL_HEIGHT: 500,
	CONTENT_MARGIN: 20,
	LINE_HEIGHT: 25,
	SECTION_SPACING: 30,

	// Button constants
	BUTTON_WIDTH: 100,
	BUTTON_HEIGHT: 40,
	BUTTON_Y_OFFSET: 50,

	// Colors
	BACKGROUND_COLOR: "white",
	BORDER_COLOR: "#34495e",
	SUCCESS_COLOR: "#27ae60",
	SET_COMPLETE_COLOR: "#8e44ad",
	INDIVIDUAL_COLOR: "#e67e22",
	TEXT_COLOR: "#2c3e50",

	// Animation constants
	FADE_IN_DURATION: 500,
	SCALE_DURATION: 300,
	STAGGER_DELAY: 100,

	// Timing constants
	AUTO_PROCEED_DELAY: 4000, // Auto proceed delay after showing results
} as const;

/**
 * Interface for settlement statistics
 */
interface SettlementStat {
	label: string;
	value: number;
	color: string;
	isCount?: boolean;
	isFinal?: boolean;
}

/**
 * Settlement result display entity
 * Shows detailed breakdown of settlement calculation
 */
export class SettlementResultE extends g.E {
	private totalValue: number;
	private setInfos: SetInfo[];
	private onCompleteCallback: () => void;
	private gameContext: GameContext;

	constructor(param: {
		scene: g.Scene;
		totalValue: number;
		setInfos: SetInfo[];
		onComplete: () => void;
		gameContext: GameContext;
	}) {
		super({
			scene: param.scene,
			width: g.game.width,
			height: g.game.height,
			touchable: true
		});

		this.totalValue = param.totalValue;
		this.setInfos = param.setInfos;
		this.onCompleteCallback = param.onComplete;
		this.gameContext = param.gameContext;

		this.setupBackground();
		this.setupModal();
	}

	/**
	 * Gets total value for testing
	 */
	getTotalValueForTesting(): number {
		return this.totalValue;
	}

	/**
	 * Gets set information for testing
	 */
	getSetInfosForTesting(): SetInfo[] {
		return this.setInfos;
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
	 * Sets up result modal
	 */
	private setupModal(): void {
		const modalX = (this.width - RESULT_CONFIG.MODAL_WIDTH) / 2;
		const modalY = (this.height - RESULT_CONFIG.MODAL_HEIGHT) / 2;

		const modal = new g.FilledRect({
			scene: this.scene,
			width: RESULT_CONFIG.MODAL_WIDTH,
			height: RESULT_CONFIG.MODAL_HEIGHT,
			x: modalX,
			y: modalY,
			cssColor: RESULT_CONFIG.BACKGROUND_COLOR
		});

		// Add border
		const border = new g.FilledRect({
			scene: this.scene,
			width: RESULT_CONFIG.MODAL_WIDTH + 4,
			height: RESULT_CONFIG.MODAL_HEIGHT + 4,
			x: modalX - 2,
			y: modalY - 2,
			cssColor: RESULT_CONFIG.BORDER_COLOR
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
		let currentY: number = RESULT_CONFIG.CONTENT_MARGIN;

		// Title
		const title = new g.Label({
			scene: this.scene,
			text: "精算結果",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: RESULT_CONFIG.TEXT_COLOR
			}),
			x: RESULT_CONFIG.CONTENT_MARGIN,
			y: currentY
		});
		modal.append(title);
		currentY += RESULT_CONFIG.LINE_HEIGHT + RESULT_CONFIG.SECTION_SPACING;

		// Settlement breakdown
		currentY = this.addSettlementBreakdown(modal, currentY) as number;

		// Game statistics
		currentY = this.addGameStatistics(modal, currentY) as number;

		// Total result
		currentY = this.addTotalResult(modal, currentY) as number;

		// Auto-proceed after fixed duration instead of OK button
		this.setupAutomaticProceed();
	}

	/**
	 * Adds settlement breakdown section
	 */
	private addSettlementBreakdown(modal: g.E, startY: number): number {
		let currentY = startY;

		// Section title
		const sectionTitle = new g.Label({
			scene: this.scene,
			text: "精算内訳:",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 18,
				fontColor: RESULT_CONFIG.TEXT_COLOR
			}),
			x: RESULT_CONFIG.CONTENT_MARGIN,
			y: currentY
		});
		modal.append(sectionTitle);
		currentY += RESULT_CONFIG.LINE_HEIGHT;

		// Add breakdown for each category
		let lineIndex = 0;
		for (const setInfo of this.setInfos) {
			if (setInfo.items.length > 0) {
				const line = this.createBreakdownLine(setInfo, lineIndex);
				line.x = RESULT_CONFIG.CONTENT_MARGIN + 20;
				line.y = currentY;
				modal.append(line);
				currentY += RESULT_CONFIG.LINE_HEIGHT;
				lineIndex++;
			}
		}

		return currentY + RESULT_CONFIG.SECTION_SPACING;
	}

	/**
	 * Creates a breakdown line for a category
	 */
	private createBreakdownLine(setInfo: SetInfo, index: number): g.E {
		const container = new g.E({
			scene: this.scene
		});

		const categoryName = setInfo.category === "novel" ? "小説シリーズ" : "マンガシリーズ";
		const value = setInfo.isComplete ? setInfo.setBonus : setInfo.individualValue;
		const statusText = setInfo.isComplete ? "(セット完成)" : "(個別計算)";
		const textColor = setInfo.isComplete ? RESULT_CONFIG.SET_COMPLETE_COLOR : RESULT_CONFIG.INDIVIDUAL_COLOR;

		const text = new g.Label({
			scene: this.scene,
			text: `${categoryName}: ${value}pt ${statusText}`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: textColor
			})
		});

		container.append(text);

		// Animate line entrance
		container.opacity = 0;
		const timeline = new Timeline(this.scene);
		timeline.create(container)
			.wait(RESULT_CONFIG.STAGGER_DELAY * index)
			.to({ opacity: 1 }, RESULT_CONFIG.FADE_IN_DURATION);

		return container;
	}

	/**
	 * Adds comprehensive game statistics section
	 */
	private addGameStatistics(modal: g.E, startY: number): number {
		let currentY = startY;

		// Section title
		const sectionTitle = new g.Label({
			scene: this.scene,
			text: "ゲーム統計:",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 18,
				fontColor: RESULT_CONFIG.TEXT_COLOR
			}),
			x: RESULT_CONFIG.CONTENT_MARGIN,
			y: currentY
		});
		modal.append(sectionTitle);
		currentY += RESULT_CONFIG.LINE_HEIGHT;

		// Get current player from GameContext
		const currentPlayer = this.gameContext.currentPlayer;
		if (currentPlayer) {
			// Count completed tasks
			let completedTaskCount = 0;
			for (const progress of currentPlayer.taskProgress.values()) {
				if (progress.completed) {
					completedTaskCount++;
				}
			}

			// Settlement points (what we just calculated)
			const settlementPoints = this.totalValue;

			// Previous points (points earned from activities, purchases, etc.)
			const previousPoints = Math.max(0, currentPlayer.points - settlementPoints);

			// Total final score
			const finalScore = currentPlayer.points;

			const stats: SettlementStat[] = [
				{ label: "完了タスク数", value: completedTaskCount, color: RESULT_CONFIG.TEXT_COLOR, isCount: true },
				{ label: "活動・タスクで獲得", value: previousPoints, color: RESULT_CONFIG.INDIVIDUAL_COLOR },
				{ label: "アイテム精算", value: settlementPoints, color: RESULT_CONFIG.SET_COMPLETE_COLOR },
				{ label: "最終スコア", value: finalScore, color: RESULT_CONFIG.SUCCESS_COLOR, isFinal: true }
			];

			// Add each statistic line
			stats.forEach((stat, index) => {
				const unit = stat.isCount ? "個" : "pt";
				const text = new g.Label({
					scene: this.scene,
					text: `${stat.label}: ${stat.value}${unit}`,
					font: new g.DynamicFont({
						game: this.scene.game,
						fontFamily: "sans-serif",
						size: stat.isFinal ? 18 : 16,
						fontColor: stat.color,
						fontWeight: stat.isFinal ? "bold" : "normal"
					}),
					x: RESULT_CONFIG.CONTENT_MARGIN + 20,
					y: currentY
				});
				modal.append(text);

				// Animate statistics entrance
				text.opacity = 0;
				const timeline = new Timeline(this.scene);
				timeline.create(text)
					.wait(RESULT_CONFIG.STAGGER_DELAY * index)
					.to({ opacity: 1 }, RESULT_CONFIG.FADE_IN_DURATION);

				currentY += RESULT_CONFIG.LINE_HEIGHT;
			});
		}

		return currentY + RESULT_CONFIG.SECTION_SPACING;
	}

	/**
	 * Adds total result section
	 */
	private addTotalResult(modal: g.E, startY: number): number {
		const separator = new g.FilledRect({
			scene: this.scene,
			width: RESULT_CONFIG.MODAL_WIDTH - (RESULT_CONFIG.CONTENT_MARGIN * 2),
			height: 2,
			x: RESULT_CONFIG.CONTENT_MARGIN,
			y: startY,
			cssColor: RESULT_CONFIG.BORDER_COLOR
		});
		modal.append(separator);

		const totalLabel = new g.Label({
			scene: this.scene,
			text: `精算ボーナス: ${this.totalValue}ポイント`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 18,
				fontColor: RESULT_CONFIG.SUCCESS_COLOR
			}),
			x: RESULT_CONFIG.CONTENT_MARGIN,
			y: startY + 15
		});
		modal.append(totalLabel);

		// Animate total with emphasis
		totalLabel.opacity = 0;
		totalLabel.scaleX = 0.8;
		totalLabel.scaleY = 0.8;

		const timeline = new Timeline(this.scene);
		timeline.create(totalLabel)
			.wait(500)
			.to({
				opacity: 1,
				scaleX: 1.1,
				scaleY: 1.1
			}, RESULT_CONFIG.SCALE_DURATION)
			.to({
				scaleX: 1,
				scaleY: 1
			}, RESULT_CONFIG.SCALE_DURATION);

		return startY + 50;
	}

	/**
	 * Sets up automatic proceed after fixed duration
	 */
	private setupAutomaticProceed(): void {
		// Automatically proceed after 4 seconds to give user time to read results
		this.scene.setTimeout(() => {
			this.handleAutomaticProceed();
		}, RESULT_CONFIG.AUTO_PROCEED_DELAY);
	}

	/**
	 * Handles automatic proceed after fixed duration
	 */
	private handleAutomaticProceed(): void {
		this.animateExit(() => {
			this.onCompleteCallback();
			this.destroy();
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
			}, RESULT_CONFIG.SCALE_DURATION);

		const borderTimeline = new Timeline(this.scene);
		borderTimeline.create(border)
			.to({
				opacity: 1,
				scaleX: 1,
				scaleY: 1
			}, RESULT_CONFIG.SCALE_DURATION);
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
			}, RESULT_CONFIG.FADE_IN_DURATION)
			.call(onComplete);
	}
}
