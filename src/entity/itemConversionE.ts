import { Timeline } from "@akashic-extension/akashic-timeline";
import { ItemCategory, SetInfo } from "../data/itemData";

/**
 * Item conversion configuration constants
 */
const CONVERSION_CONFIG = {
	// Layout constants
	CONTAINER_WIDTH: 500,
	CONTAINER_HEIGHT: 500,
	CONTENT_MARGIN: 15,
	LINE_HEIGHT: 45,
	SECTION_SPACING: 20,

	// Item display
	ITEM_ICON_SIZE: 40,
	ITEM_SPACING: 5,

	// Colors
	BACKGROUND_COLOR: "white",
	BORDER_COLOR: "#bdc3c7",
	HEADER_COLOR: "#34495e",
	COMPLETE_COLOR: "#27ae60",
	INCOMPLETE_COLOR: "#e67e22",
	ITEM_COLOR: "#7f8c8d",
	VALUE_COLOR: "#2c3e50",

	// Animation constants
	PULSE_DURATION: 600,
	SCALE_AMPLITUDE: 0.05,
} as const;

/**
 * Item conversion display entity
 * Shows individual category conversion information
 */
export class ItemConversionE extends g.E {
	private categoryInfo: ItemCategory;
	private setInfo: SetInfo;

	constructor(param: {
		scene: g.Scene;
		categoryInfo: ItemCategory;
		setInfo: SetInfo;
		x: number;
		y: number;
	}) {
		super({
			scene: param.scene,
			width: CONVERSION_CONFIG.CONTAINER_WIDTH,
			height: CONVERSION_CONFIG.CONTAINER_HEIGHT,
			x: param.x,
			y: param.y
		});

		this.categoryInfo = param.categoryInfo;
		this.setInfo = param.setInfo;

		this.setupContainer();
		this.setupContent();

		if (this.setInfo.isComplete) {
			this.animateCompletion();
		}
	}

	/**
	 * Gets category info for testing
	 */
	getCategoryInfoForTesting(): ItemCategory {
		return this.categoryInfo;
	}

	/**
	 * Gets set info for testing
	 */
	getSetInfoForTesting(): SetInfo {
		return this.setInfo;
	}

	/**
	 * Gets final conversion value for testing
	 */
	getFinalValueForTesting(): number {
		return this.setInfo.isComplete ? this.setInfo.setBonus : this.setInfo.individualValue;
	}

	/**
	 * Sets up container background and border
	 */
	private setupContainer(): void {
		// Border
		const border = new g.FilledRect({
			scene: this.scene,
			width: this.width + 4,
			height: this.height + 4,
			x: -2,
			y: -2,
			cssColor: CONVERSION_CONFIG.BORDER_COLOR
		});

		// Background
		const background = new g.FilledRect({
			scene: this.scene,
			width: this.width,
			height: this.height,
			cssColor: CONVERSION_CONFIG.BACKGROUND_COLOR
		});

		this.append(border);
		this.append(background);
	}

	/**
	 * Sets up content display
	 */
	private setupContent(): void {
		let currentY: number = CONVERSION_CONFIG.CONTENT_MARGIN;

		// Category header
		currentY = this.addCategoryHeader(currentY) as number;

		// Item list
		currentY = this.addItemList(currentY) as number;

		// Conversion calculation
		currentY = this.addConversionCalculation(currentY) as number;

		// Final value
		this.addFinalValue(currentY);
	}

	/**
	 * Adds category header
	 */
	private addCategoryHeader(startY: number): number {
		// Category emoji and name
		const headerContainer = new g.E({
			scene: this.scene,
			x: CONVERSION_CONFIG.CONTENT_MARGIN,
			y: startY
		});

		const emoji = new g.Label({
			scene: this.scene,
			text: this.categoryInfo.emoji,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 40,
				fontColor: "black"
			})
		});

		const categoryName = new g.Label({
			scene: this.scene,
			text: this.categoryInfo.name,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 40,
				fontColor: CONVERSION_CONFIG.HEADER_COLOR
			}),
			x: 70
		});

		headerContainer.append(emoji);
		headerContainer.append(categoryName);
		this.append(headerContainer);

		// Status indicator
		const statusText = this.setInfo.isComplete ? "セット完成!" : "セット未完成";
		const statusColor = this.setInfo.isComplete ? CONVERSION_CONFIG.COMPLETE_COLOR : CONVERSION_CONFIG.INCOMPLETE_COLOR;

		const status = new g.Label({
			scene: this.scene,
			text: statusText,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 32,
				fontColor: statusColor
			}),
			x: CONVERSION_CONFIG.CONTENT_MARGIN + 70,
			y: startY + CONVERSION_CONFIG.LINE_HEIGHT
		});

		this.append(status);

		return startY + (CONVERSION_CONFIG.LINE_HEIGHT * 2) + CONVERSION_CONFIG.SECTION_SPACING;
	}

	/**
	 * Adds item list display
	 */
	private addItemList(startY: number): number {
		let currentY = startY;

		// Items header
		const itemsHeader = new g.Label({
			scene: this.scene,
			text: "所持アイテム:",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 32,
				fontColor: CONVERSION_CONFIG.HEADER_COLOR
			}),
			x: CONVERSION_CONFIG.CONTENT_MARGIN,
			y: currentY
		});
		this.append(itemsHeader);
		currentY += CONVERSION_CONFIG.LINE_HEIGHT;

		// Display each owned item
		for (let i = 1; i < this.categoryInfo.numberOfSeries + 1; i++) {
			const item = this.setInfo.items.find(item => item.seriesNumber === i);
			const text = item ? "✅️" + item.name.replace(this.categoryInfo.name.replace("シリーズ", "") + " ", "") : "❌️";
			const itemDisplay = new g.Label({
				scene: this.scene,
				text: text,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 24,
					fontColor: CONVERSION_CONFIG.ITEM_COLOR
				}),
				x: CONVERSION_CONFIG.CONTENT_MARGIN * 4 + (i - 1) * 80,
				y: currentY
			});
			this.append(itemDisplay);
		}
		return currentY + CONVERSION_CONFIG.LINE_HEIGHT + CONVERSION_CONFIG.SECTION_SPACING;
	}

	/**
	 * Adds conversion calculation display
	 */
	private addConversionCalculation(startY: number): number {
		let currentY = startY;

		// Calculation header
		const calcHeader = new g.Label({
			scene: this.scene,
			text: "精算計算:",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 32,
				fontColor: CONVERSION_CONFIG.HEADER_COLOR
			}),
			x: CONVERSION_CONFIG.CONTENT_MARGIN,
			y: currentY
		});
		this.append(calcHeader);
		currentY += CONVERSION_CONFIG.LINE_HEIGHT;

		// Show calculation method
		if (this.setInfo.isComplete) {
			// Set bonus calculation
			const setBonusText = new g.Label({
				scene: this.scene,
				text: `セットボーナス: ${this.setInfo.setBonus}pt`,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 24,
					fontColor: CONVERSION_CONFIG.COMPLETE_COLOR
				}),
				x: CONVERSION_CONFIG.CONTENT_MARGIN * 2,
				y: currentY
			});
			this.append(setBonusText);
			currentY += CONVERSION_CONFIG.LINE_HEIGHT;
		} else {
			// Individual calculation
			const individualText = new g.Label({
				scene: this.scene,
				text: `換金単価: ${this.categoryInfo.individualPrice}pt ✕ ${this.setInfo.items.length}アイテム`,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 24,
					fontColor: CONVERSION_CONFIG.INCOMPLETE_COLOR
				}),
				x: CONVERSION_CONFIG.CONTENT_MARGIN * 2,
				y: currentY
			});
			this.append(individualText);
			currentY += CONVERSION_CONFIG.LINE_HEIGHT;
		}

		return currentY + CONVERSION_CONFIG.SECTION_SPACING;
	}

	/**
	 * Adds final value display
	 */
	private addFinalValue(startY: number): void {
		const finalValue = this.setInfo.isComplete ? this.setInfo.setBonus : this.setInfo.individualValue;

		// Separator line
		const separator = new g.FilledRect({
			scene: this.scene,
			width: this.width - (CONVERSION_CONFIG.CONTENT_MARGIN * 2),
			height: 1,
			x: CONVERSION_CONFIG.CONTENT_MARGIN,
			y: startY,
			cssColor: CONVERSION_CONFIG.BORDER_COLOR
		});
		this.append(separator);

		// Final value
		const valueColor = this.setInfo.isComplete ? CONVERSION_CONFIG.COMPLETE_COLOR : CONVERSION_CONFIG.INCOMPLETE_COLOR;
		const finalLabel = new g.Label({
			scene: this.scene,
			text: `精算額: +${finalValue}pt`,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 40,
				fontColor: valueColor
			}),
			x: CONVERSION_CONFIG.CONTENT_MARGIN,
			y: startY + 10
		});
		this.append(finalLabel);

		// Animate final value if set is complete
		if (this.setInfo.isComplete) {
			this.animateFinalValue(finalLabel);
		}
	}

	/**
	 * Animates completion state
	 */
	private animateCompletion(): void {
		// Add subtle pulsing animation for completed sets
		const timeline = new Timeline(this.scene);
		timeline.create(this)
			.wait(500)
			.to({
				scaleX: 1 + CONVERSION_CONFIG.SCALE_AMPLITUDE,
				scaleY: 1 + CONVERSION_CONFIG.SCALE_AMPLITUDE
			}, CONVERSION_CONFIG.PULSE_DURATION)
			.to({
				scaleX: 1,
				scaleY: 1
			}, CONVERSION_CONFIG.PULSE_DURATION);
	}

	/**
	 * Animates final value display
	 */
	private animateFinalValue(valueLabel: g.E): void {
		valueLabel.scaleX = 0.8;
		valueLabel.scaleY = 0.8;
		valueLabel.modified();

		const timeline = new Timeline(this.scene);
		timeline.create(valueLabel)
			.wait(200)
			.to({
				scaleX: 1.1,
				scaleY: 1.1
			}, 200)
			.to({
				scaleX: 1,
				scaleY: 1
			}, 200);
	}
}
