import { Timeline } from "@akashic-extension/akashic-timeline";
import { GameContext, GamePhase } from "../data/gameContext";
import {
	OwnedItem,
	SetInfo,
	calculateSetInfo,
	calculateTotalSettlementValue,
	groupItemsByCategory,
	getItemCategoryInfo
} from "../data/itemData";
import { ItemManager } from "../manager/itemManager";
import { PointManager } from "../manager/pointManager";
import { ItemConversionE } from "./itemConversionE";
import { ModalE } from "./modalE";
import { SettlementResultE } from "./settlementResultE";

/**
 * Settlement configuration constants
 */
const SETTLEMENT_CONFIG = {
	// Layout constants
	HEADER_HEIGHT: 80,
	CONTENT_Y_OFFSET: 120,
	CONTENT_MARGIN: 20,
	BOTTOM_MARGIN: 200,

	// Category layout
	CATEGORY_SPACING: 350,
	ITEM_SPACING: 60,
	BUTTON_Y_OFFSET: 200,

	// Button constants
	BUTTON_WIDTH: 120,
	BUTTON_HEIGHT: 40,
	BUTTON_SPACING: 140,

	// Colors
	BACKGROUND_COLOR: "#ecf0f1",
	HEADER_COLOR: "#2c3e50",
	CATEGORY_COLOR: "#34495e",
	COMPLETE_COLOR: "#27ae60",
	INCOMPLETE_COLOR: "#e67e22",
	SETTLEMENT_BUTTON_COLOR: "#8e44ad",

	// Animation constants
	FADE_IN_DURATION: 300,
	SLIDE_DURATION: 400,

	// Timing constants
	CONVERSION_DISPLAY_DELAY: 2000, // Delay to let user see conversion details
	RESULT_DISPLAY_DELAY: 1500, // Delay to let user see content before final result
	RANKING_TRANSITION_DELAY: 2000, // Delay before transitioning to ranking
} as const;

/**
 * Settlement screen entity for final item conversion and scoring
 * Based on specification section 2.7 精算画面 (MainScene内)
 */
export class SettlementE extends g.E {
	private gameContext: GameContext;
	private itemManager: ItemManager;
	private ownedItems: OwnedItem[];
	private setInfos: SetInfo[];
	private currentModal: ModalE<string> | null = null;
	private itemConversions: Map<string, ItemConversionE> = new Map();
	private isAutomaticMode: boolean = false;
	private isSettlementCompleting: boolean = false;
	private pointManager: PointManager;
	private transitionToRanking: () => void;

	constructor(param: {
		scene: g.Scene;
		gameContext: GameContext;
		itemManager: ItemManager;
		pointManager: PointManager;
		transitionToRanking: () => void;
	}) {
		super({
			scene: param.scene,
			width: g.game.width,
			height: g.game.height,
			touchable: true
		});

		this.gameContext = param.gameContext;
		this.itemManager = param.itemManager;
		this.transitionToRanking = param.transitionToRanking;
		this.ownedItems = [];
		this.setInfos = [];
		this.pointManager = param.pointManager;

		this.setupBackground();
		this.setupHeader();
		this.refreshContent();
	}

	/**
	 * Refreshes settlement content
	 */
	refreshContent(): void {
		// Remove existing content
		this.itemConversions.clear();
		const children = this.children?.slice() || [];
		for (const child of children) {
			if (child instanceof ItemConversionE) {
				child.destroy();
			}
		}

		// Get current owned items from ItemManager (it has the correct OwnedItem[] format)
		const allItems = this.itemManager.getAvailableItems();
		this.ownedItems = this.itemManager.getOwnedItems();
		this.setInfos = calculateSetInfo(this.ownedItems, allItems);

		// Group items by category
		const itemsByCategory = groupItemsByCategory(this.ownedItems);

		// Create conversion displays for each category
		let categoryIndex = 0;
		for (const [categoryId] of itemsByCategory) {
			const categoryInfo = getItemCategoryInfo(categoryId as "novel" | "manga");
			const setInfo = this.setInfos.find(info => info.category === categoryId);

			if (setInfo) {
				const conversionE = new ItemConversionE({
					scene: this.scene,
					categoryInfo: categoryInfo,
					setInfo: setInfo,
					x: SETTLEMENT_CONFIG.CONTENT_MARGIN + (categoryIndex * SETTLEMENT_CONFIG.CATEGORY_SPACING),
					y: SETTLEMENT_CONFIG.CONTENT_Y_OFFSET
				});

				this.itemConversions.set(categoryId, conversionE);
				this.append(conversionE);

				// Animate entrance
				this.animateConversionEntrance(conversionE, categoryIndex);
				categoryIndex++;
			}
		}

		// Automatically show final score panel after displaying items
		this.scene.setTimeout(() => {
			this.showFinalScorePanel();
		}, SETTLEMENT_CONFIG.CONVERSION_DISPLAY_DELAY);
	}

	/**
	 * Shows settlement screen
	 */
	override show(): void {
		this.opacity = 1;
		this.touchable = true;
		this.refreshContent();
		super.show();

		// If in automatic mode, show final score panel immediately after items are displayed
		if (this.isAutomaticMode) {
			this.scene.setTimeout(() => {
				this.showFinalScorePanel();
			}, SETTLEMENT_CONFIG.RESULT_DISPLAY_DELAY);
		}
	}

	/**
	 * Sets automatic mode for settlement execution
	 */
	setAutomaticMode(isAutomatic: boolean): void {
		this.isAutomaticMode = isAutomatic;
	}

	/**
	 * Hides settlement screen
	 */
	override hide(): void {
		this.opacity = 0;
		this.touchable = false;
		this.closeModal();
		super.hide();
	}

	/**
	 * Gets current settlement value for testing
	 */
	getCurrentSettlementValueForTesting(): number {
		return calculateTotalSettlementValue(this.setInfos);
	}

	/**
	 * Gets set information for testing
	 */
	getSetInfosForTesting(): SetInfo[] {
		return this.setInfos;
	}

	/**
	 * Force closes all modals when time reaches zero
	 */
	forceCloseAllModals(): void {
		this.closeModal();
	}

	/**
	 * Sets up background
	 */
	private setupBackground(): void {
		const background = new g.FilledRect({
			scene: this.scene,
			width: this.width,
			height: this.height,
			cssColor: SETTLEMENT_CONFIG.BACKGROUND_COLOR
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
			height: SETTLEMENT_CONFIG.HEADER_HEIGHT,
			cssColor: SETTLEMENT_CONFIG.HEADER_COLOR
		});

		const title = new g.Label({
			scene: this.scene,
			text: "精算画面",
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: "white"
			}),
			x: 20,
			y: 25
		});

		header.append(title);
		this.append(header);
	}

	/**
	 * Animates conversion entrance
	 */
	private animateConversionEntrance(conversionE: ItemConversionE, index: number): void {
		conversionE.opacity = 0;
		conversionE.x += 50;

		const timeline = new Timeline(this.scene);
		timeline.create(conversionE)
			.wait(index * 100)
			.to({
				opacity: 1,
				x: conversionE.x - 50
			}, SETTLEMENT_CONFIG.FADE_IN_DURATION);
	}

	/**
	 * Shows final score panel automatically without button interaction
	 */
	private showFinalScorePanel(): void {
		const totalValue = calculateTotalSettlementValue(this.setInfos);

		// Execute settlement directly and show result
		this.confirmSettlement(totalValue);
	}



	/**
	 * Confirms and executes settlement
	 */
	private confirmSettlement(totalValue: number): void {
		this.closeModal();

		// Convert items to points and clear owned items after settlement
		const player = this.gameContext.currentPlayer;
		if (player) {
			const newScore = player.points + totalValue;
			const updatedPlayer = {
				...player,
				points: newScore,
				ownedItems: [], // Clear items after settlement
				preSettlementItemCount: player.ownedItems.length // Store count before clearing
			};
			this.gameContext.updateCurrentPlayer(updatedPlayer);

			// Broadcast the new score to other players so they see the settlement value
			this.pointManager.broadcastScore(newScore);
		}

		// Show settlement result
		this.showSettlementResult(totalValue);
	}

	/**
	 * Shows settlement result
	 */
	private showSettlementResult(totalValue: number): void {
		const resultE = new SettlementResultE({
			scene: this.scene,
			totalValue: totalValue,
			setInfos: this.setInfos,
			onComplete: () => this.onSettlementComplete(),
			gameContext: this.gameContext
		});

		this.append(resultE);
	}

	/**
	 * Handles settlement completion
	 */
	private onSettlementComplete(): void {
		// Prevent multiple calls during animation timing conflicts
		if (this.isSettlementCompleting) {
			return;
		}
		this.isSettlementCompleting = true;

		// Trigger game phase transition to ranking
		this.gameContext.updateGamePhase(GamePhase.ENDED);

		// Add delay before ranking scene transition for user to absorb the results
		this.scene.setTimeout(() => {
			// Refresh content to show empty state before transitioning
			this.refreshContent();

			// Transition to ranking scene via callback
			this.transitionToRanking();
		}, SETTLEMENT_CONFIG.RANKING_TRANSITION_DELAY);
	}

	/**
	 * Closes current modal
	 */
	private closeModal(): void {
		if (this.currentModal) {
			this.currentModal.destroy();
			this.currentModal = null;
		}
	}
}
