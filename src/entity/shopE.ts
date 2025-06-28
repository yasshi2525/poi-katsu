import { AFFILIATE_CONFIG } from "../config/affiliateConfig";
import { ItemData } from "../data/itemData";
import { ItemManager } from "../manager/itemManager";
import { MarketManager } from "../manager/marketManager";
import { POINT_CONSTANTS } from "../manager/pointManager";
import { LabelButtonE } from "./labelButtonE";
import { ModalE } from "./modalE";

/**
 * Shop configuration constants
 */
const SHOP_CONFIG = {
	// Layout constants
	HEADER_HEIGHT: 69, // HeaderE height
	PRODUCT_GRID_Y_OFFSET: 69 + 69 + 20,
	PRODUCT_GRID_SPACING: 230,
	PRODUCT_GRID_MARGIN: 20,
	PRODUCT_GRID_BOTTOM_MARGIN: 200,

	// Product layout
	NOVEL_COLUMN_OFFSET: 230, // 戻るボタンのレイアウトの都合により左側に表示
	MANGA_ROW_OFFSET: 260, // Increased offset to prevent row overlap

	// Modal constants
	MODAL_WIDTH: 600,
	MODAL_HEIGHT: 250,
	MODAL_BUTTON_WIDTH: 180,
	MODAL_BUTTON_HEIGHT: 120,

	// Colors
	BACKGROUND_COLOR: "#ecf0f1",
	HEADER_COLOR: "#2c3e50",
	OWNED_BUTTON_COLOR: "#616161",
	BUY_BUTTON_COLOR: "#689f38",
	CANCEL_BUTTON_COLOR: "#95a5a6",
	SUCCESS_COLOR: "#0288d1",
	ERROR_COLOR: "#e74c3c",

	// Point back system
	POINT_BACK_RATE: POINT_CONSTANTS.SHOPPING_POINT_BACK_RATE, // 10% point back rate
} as const;

/**
 * Layout configuration interface
 */
interface LayoutConfig {
	x: number;
	y: number;
	width: number;
	height: number;
	children?: { [key: string]: LayoutConfig };
}

/**
 * Parameter object for Shop
 */
export interface ShopParameterObject extends g.EParameterObject {
	/** Whether multiplayer mode or not */
	multi: boolean;
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Item manager instance */
	itemManager: ItemManager;
	/** Market manager instance */
	marketManager: MarketManager;
	/** Callback to check if player has enough points */
	onCheckPoints: () => number;
	/** Callback to deduct points for purchase */
	onDeductPoints: (amount: number) => void;
	/** Callback when item is purchased successfully */
	onItemPurchased: (item: ItemData) => void;
	/** Callback when back button is pressed */
	onBack?: () => void;
	/** Callback to get remaining time for dynamic pricing */
	onGetRemainingTime: () => number;
	/** Callback to check if timeline is revealed for share button */
	onIsTimelineRevealed: () => boolean;
	/** Callback when share button is clicked */
	onShareProduct?: (item: ItemData, sharedPrice: number) => void;
	/** Callback when SNS connection is requested from disabled share button */
	onSnsConnectionRequest?: () => void;
	/** Callback when product prices are updated */
	onPriceUpdate?: () => void;
}

/**
 * Shop screen entity that displays shopping interface
 * Shows product listings, categories, and purchase options
 */
export class ShopE extends g.E {
	private readonly multi: boolean;
	private readonly layout: LayoutConfig;
	private readonly itemManager: ItemManager;
	private readonly marketManager: MarketManager;
	private readonly onCheckPoints: () => number;
	private readonly onDeductPoints: (amount: number) => void;
	private readonly onItemPurchased: (item: ItemData) => void;
	private readonly onBack?: () => void;
	private readonly onGetRemainingTime: () => number;
	private readonly onIsTimelineRevealed: () => boolean;
	private readonly onShareProduct?: (item: ItemData, sharedPrice: number) => void;
	private readonly onSnsConnectionRequest?: () => void;
	private readonly onPriceUpdate?: () => void;
	private currentModal?: ModalE<string>;
	private purchaseButtons: Map<string, LabelButtonE<string>> = new Map(); // Store button references for reactivation
	private shareButtons: Map<string, LabelButtonE<string>> = new Map(); // Store share button references
	private priceLabels: Map<string, g.Label> = new Map(); // Store price labels for real-time updates
	// Store share button positions for recreation
	private shareButtonPositions: Map<string, { x: number; y: number; width: number; height: number }> = new Map();
	private priceUpdateListener?: () => void; // Listener for price updates from MarketManager

	/**
	 * Creates a new Shop instance
	 * @param options Configuration options for the shop screen
	 */
	constructor(options: ShopParameterObject) {
		super(options);

		this.multi = options.multi;
		this.itemManager = options.itemManager;
		this.marketManager = options.marketManager;
		this.onCheckPoints = options.onCheckPoints;
		this.onDeductPoints = options.onDeductPoints;
		this.onItemPurchased = options.onItemPurchased;
		this.onBack = options.onBack;
		this.onGetRemainingTime = options.onGetRemainingTime;
		this.onIsTimelineRevealed = options.onIsTimelineRevealed;
		this.onShareProduct = options.onShareProduct;
		this.onSnsConnectionRequest = options.onSnsConnectionRequest;
		this.onPriceUpdate = options.onPriceUpdate;
		this.layout = this.createLayoutConfig(options.width, options.height);
		this.createLayout();

		// Register for price update notifications from MarketManager
		this.priceUpdateListener = () => {
			this.updateAllPriceLabels();
			// Notify that prices have been updated
			if (this.onPriceUpdate) {
				this.onPriceUpdate();
			}
		};
		this.marketManager.addPriceUpdateListener(this.priceUpdateListener);

		// Immediately update price labels after setup to ensure current prices are displayed
		this.updateAllPriceLabels();
	}

	/**
	 * Public method to refresh shop when timeline visibility changes
	 */
	refreshForTimelineReveal(): void {
		this.updateShareButtonsForTimelineReveal();
	}

	/**
	 * Force closes all modals when time reaches zero
	 */
	forceCloseAllModals(): void {
		this.closeModal();
	}

	/**
	 * Cleanup method to clear intervals and resources
	 */
	override destroy(): void {
		// Remove price update listener from MarketManager
		if (this.priceUpdateListener) {
			this.marketManager.removePriceUpdateListener(this.priceUpdateListener);
			this.priceUpdateListener = undefined;
		}

		// Clear all stored references
		this.purchaseButtons.clear();
		this.shareButtons.clear();
		this.priceLabels.clear();
		this.shareButtonPositions.clear();

		// Call parent destroy
		super.destroy();
	}

	/**
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, screenHeight: number): LayoutConfig {
		return {
			x: 0,
			y: SHOP_CONFIG.HEADER_HEIGHT,
			width: screenWidth,
			height: screenHeight - SHOP_CONFIG.HEADER_HEIGHT,
			children: {
				header: {
					x: 0,
					y: 0, // Position header at the top of shop content area (below main HeaderE)
					width: screenWidth,
					height: SHOP_CONFIG.HEADER_HEIGHT,
					children: {
						backButton: { x: 0, y: 69, width: 200, height: 80 },
						title: { x: screenWidth / 2, y: 35, width: 0, height: 0 }
					}
				},
				productGrid: {
					x: SHOP_CONFIG.PRODUCT_GRID_MARGIN,
					y: SHOP_CONFIG.PRODUCT_GRID_Y_OFFSET,
					width: screenWidth - (SHOP_CONFIG.PRODUCT_GRID_MARGIN * 2),
					height: screenHeight - SHOP_CONFIG.PRODUCT_GRID_BOTTOM_MARGIN,
					children: {
						product: {
							x: 0,
							y: 0,
							width: (screenWidth - 80) / 2,
							height: 240,
							children: {
								image: { x: 115, y: 0, width: 0, height: 0 },
								name: { x: 10, y: 70, width: 120, height: 20 },
								price: { x: 10, y: 100, width: 80, height: 20 },
								buyButton: { x: 110, y: 100, width: 120, height: 60 },
								shareButton: { x: 110, y: 180, width: 120, height: 60 }
							}
						}
					}
				}
			}
		};
	}

	/**
	 * Creates the overall layout structure
	 */
	private createLayout(): void {
		// Background (positioned below shop header)
		const background = new g.FilledRect({
			scene: this.scene,
			width: this.layout.width,
			height: this.layout.height - SHOP_CONFIG.HEADER_HEIGHT,
			x: this.layout.x,
			y: this.layout.y + SHOP_CONFIG.HEADER_HEIGHT, // Start below shop header
			cssColor: SHOP_CONFIG.BACKGROUND_COLOR,
		});
		this.append(background);

		this.createHeader();
		this.createProductGrid();
	}

	/**
	 * Creates the header with title and back button
	 */
	private createHeader(): void {
		const headerLayout = this.layout.children!.header;
		const backButtonLayout = headerLayout.children!.backButton;
		const titleLayout = headerLayout.children!.title;

		// Header background
		const headerBg = new g.FilledRect({
			scene: this.scene,
			width: headerLayout.width,
			height: headerLayout.height,
			x: this.layout.x + headerLayout.x,
			y: this.layout.y + headerLayout.y,
			cssColor: SHOP_CONFIG.HEADER_COLOR,
		});
		this.append(headerBg);

		// Back button
		const backBackground = new g.FilledRect({
			scene: this.scene,
			x: this.layout.x + backButtonLayout.x,
			y: this.layout.y + backButtonLayout.y,
			width: backButtonLayout.width,
			height: backButtonLayout.height,
			cssColor: SHOP_CONFIG.HEADER_COLOR,
			touchable: true,
			local: true,
		});
		backBackground.onPointDown.add(() => {
			if (this.onBack) {
				this.onBack();
			}
		});
		this.append(backBackground);
		const backButton = new g.Label({
			scene: this.scene,
			x: this.layout.x + backButtonLayout.x + backButtonLayout.width / 2,
			y: this.layout.y + backButtonLayout.y + backButtonLayout.height / 2,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 36,
				fontColor: "white",
			}),
			text: "  ← 戻る",
			anchorX: 0.5,
			anchorY: 0.5
		});
		this.append(backButton);

		// Title
		const title = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 36,
				fontColor: "white",
			}),
			text: "通販",
			x: this.layout.x + titleLayout.x,
			y: this.layout.y + titleLayout.y,
			anchorX: 0.5,
			anchorY: 0.5
		});
		this.append(title);
	}

	/**
	 * Creates the product grid using real item data from ItemManager
	 */
	private createProductGrid(): void {
		const availableItems = this.itemManager.getAvailableItems();

		// Arrange novels in first row, manga in second row (single line each)
		const novels = availableItems.filter(item => item.category === "novel");
		const manga = availableItems.filter(item => item.category === "manga");

		// Display novels in first row
		novels.forEach((item, index) => {
			const productX =
				SHOP_CONFIG.NOVEL_COLUMN_OFFSET
				+ this.layout.children!.productGrid.x
				+ (index * SHOP_CONFIG.PRODUCT_GRID_SPACING);
			const productY = this.layout.children!.productGrid.y;
			this.createProductCard(item, productX, productY);
		});

		// Display manga in second row
		manga.forEach((item, index) => {
			const productX = this.layout.children!.productGrid.x + (index * SHOP_CONFIG.PRODUCT_GRID_SPACING);
			const productY = this.layout.children!.productGrid.y + SHOP_CONFIG.MANGA_ROW_OFFSET;
			this.createProductCard(item, productX, productY);
		});
	}

	/**
	 * Gets dynamic price from MarketManager according to game mode specification
	 * @param item Item data for price lookup
	 * @returns Dynamic price (cached in multi mode, calculated in ranking mode)
	 */
	private getDynamicPrice(item: ItemData): number {
		const remainingTime = Math.max(0, this.onGetRemainingTime());

		// MarketManager handles all pricing logic according to game mode specification
		// In multi mode: uses cached prices from active instance broadcasts
		// In ranking mode: calculates prices directly
		return this.marketManager.getDynamicPrice(item, remainingTime);
	}

	/**
	 * Creates a single product card
	 */
	private createProductCard(item: ItemData, x: number, y: number): void {
		const productLayout = this.layout.children!.productGrid.children!.product;
		const imageLayout = productLayout.children!.image;
		const nameLayout = productLayout.children!.name;
		const priceLayout = productLayout.children!.price;
		const buyButtonLayout = productLayout.children!.buyButton;
		const shareButtonLayout = productLayout.children!.shareButton;

		// Get dynamic price from MarketManager cache
		const dynamicPrice = this.getDynamicPrice(item);

		// Product card background
		const cardBg = new g.FilledRect({
			scene: this.scene,
			width: productLayout.width,
			height: productLayout.height,
			x: x,
			y: y,
			cssColor: "white",
		});
		this.append(cardBg);

		// Product image (emoji)
		const productImage = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 60,
			}),
			text: item.emoji,
			x: x + imageLayout.x + SHOP_CONFIG.PRODUCT_GRID_SPACING / 4,
			y: y + imageLayout.y,
			anchorX: 0.5
		});
		this.append(productImage);

		// Product name
		const productName = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: "#2c3e50",
			}),
			text: item.name,
			x: x + nameLayout.x,
			y: y + nameLayout.y,
		});
		this.append(productName);

		// Product price (now dynamic with real-time updates)
		const productPrice = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				fontWeight: "bold",
				size: 32,
				fontColor: "#e74c3c",
			}),
			text: `${dynamicPrice}pt`,
			x: x + priceLayout.x,
			y: y + priceLayout.y,
		});
		this.append(productPrice);

		// Store price label for real-time updates
		this.priceLabels.set(item.id, productPrice);

		// Check if item is already owned
		const isOwned = this.itemManager.ownsItem(item.id);
		const buttonColor = isOwned ? SHOP_CONFIG.OWNED_BUTTON_COLOR : SHOP_CONFIG.BUY_BUTTON_COLOR;
		const buttonText = isOwned ? "所持済" : "購入";

		// Buy button using LabelButtonE for proper multi-player support
		const buyButton = new LabelButtonE({
			scene: this.scene,
			multi: this.multi,
			name: `shop_buy_${item.id}`,
			args: `${item.id}_${dynamicPrice}`, // Include dynamic price in args
			text: buttonText,
			width: buyButtonLayout.width,
			height: buyButtonLayout.height,
			x: x + buyButtonLayout.x,
			y: y + buyButtonLayout.y,
			backgroundColor: buttonColor,
			textColor: "white",
			fontSize: 24,
			onComplete: (args: string) => this.handlePurchase(args)
		});

		// Store button reference for reactivation
		this.purchaseButtons.set(item.id, buyButton);

		// Disable button if already owned
		if (isOwned) {
			buyButton.touchable = false;
		}

		this.append(buyButton);

		// Create and store share button
		this.createShareButton(item, x, y, shareButtonLayout, dynamicPrice);
	}

	/**
	 * Creates a share button for the given item
	 * @param item The item data
	 * @param cardX The card's x position
	 * @param cardY The card's y position
	 * @param shareButtonLayout The button layout configuration
	 * @param dynamicPrice The current dynamic price
	 */
	private createShareButton(item: ItemData, cardX: number, cardY: number, shareButtonLayout: LayoutConfig, dynamicPrice: number): void {
		const buttonX = cardX + shareButtonLayout.x;
		const buttonY = cardY + shareButtonLayout.y;

		// Store position information for potential recreation
		this.shareButtonPositions.set(item.id, {
			x: buttonX,
			y: buttonY,
			width: shareButtonLayout.width,
			height: shareButtonLayout.height
		});

		// Share button (always visible but disabled if timeline not revealed)
		const isTimelineRevealed = this.onIsTimelineRevealed();

		const shareButton = new LabelButtonE({
			scene: this.scene,
			multi: this.multi,
			name: `shop_share_${item.id}`,
			args: `${item.id}_${dynamicPrice}`,
			text: "シェア",
			width: shareButtonLayout.width,
			height: shareButtonLayout.height,
			x: buttonX,
			y: buttonY,
			backgroundColor: isTimelineRevealed ? "#0288d1" : "#616161", // Gray if disabled
			textColor: "white",
			fontSize: 24,
			onComplete: (args: string) => isTimelineRevealed ? this.handleShare(args) : this.handleShareDisabled(args)
		});

		// Store share button reference
		this.shareButtons.set(item.id, shareButton);
		this.append(shareButton);
	}

	/**
	 * Handles purchase button click
	 * @param args The item ID and dynamic price (format: "itemId_price")
	 */
	private handlePurchase(args: string): void {
		// Split from the right to handle item IDs with underscores
		const lastUnderscoreIndex = args.lastIndexOf("_");
		if (lastUnderscoreIndex === -1) {
			console.error(`Invalid button args format: ${args}`);
			return;
		}
		const itemId = args.substring(0, lastUnderscoreIndex);
		const priceStr = args.substring(lastUnderscoreIndex + 1);
		const dynamicPrice = parseInt(priceStr, 10);

		// Validate parsed price
		if (isNaN(dynamicPrice) || dynamicPrice <= 0) {
			console.error(`Invalid price in button args: ${priceStr}`);
			// Reactivate button for invalid data cases
			const purchaseButton = this.purchaseButtons.get(itemId);
			if (purchaseButton) {
				purchaseButton.reactivate();
			}
			return;
		}

		// Validate item ID is not empty
		if (!itemId.trim()) {
			console.error(`Empty item ID in button args: ${args}`);
			return;
		}

		const item = this.itemManager.getItem(itemId);
		if (!item) {
			console.error(`Item not found: ${itemId}`);
			// Reactivate button for invalid item ID
			const purchaseButton = this.purchaseButtons.get(itemId);
			if (purchaseButton) {
				purchaseButton.reactivate();
			}
			return;
		}

		// Validate dynamic price is within reasonable bounds of base price (updated for enhanced dynamics)
		if (!this.isValidDynamicPrice(item, dynamicPrice)) {
			const minValidPrice = Math.floor(item.purchasePrice * AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO);
			const maxValidPrice = item.purchasePrice * 3;
			console.error(`Dynamic price ${dynamicPrice} out of valid range [${minValidPrice}, ${maxValidPrice}] for item ${itemId}`);
			// Reactivate button for invalid price range
			const purchaseButton = this.purchaseButtons.get(item.id);
			if (purchaseButton) {
				purchaseButton.reactivate();
			}
			return;
		}

		// Check if already owned
		if (this.itemManager.ownsItem(itemId)) {
			// Reactivate the purchase button for retry
			const purchaseButton = this.purchaseButtons.get(item.id);
			if (purchaseButton) {
				purchaseButton.reactivate();
			}
			this.showPurchaseModal("すでに所持しているアイテムです。", false);
			return;
		}

		// Check if player has enough points
		const currentPoints = this.onCheckPoints();
		if (currentPoints < dynamicPrice) {
			// Reactivate the purchase button for retry
			const purchaseButton = this.purchaseButtons.get(item.id);
			if (purchaseButton) {
				purchaseButton.reactivate();
			}
			this.showPurchaseModal(`ポイントが不足しています。\n必要: ${dynamicPrice}pt\n所持: ${currentPoints}pt`, false);
			return;
		}

		// Show purchase confirmation modal
		this.showPurchaseConfirmationModal(item, dynamicPrice);
	}

	/**
	 * Handles share button click
	 * @param args The item ID and dynamic price (format: "itemId_price")
	 */
	private handleShare(args: string): void {
		// Split from the right to handle item IDs with underscores
		const lastUnderscoreIndex = args.lastIndexOf("_");
		if (lastUnderscoreIndex === -1) {
			console.error(`Invalid button args format: ${args}`);
			return;
		}
		const itemId = args.substring(0, lastUnderscoreIndex);
		const priceStr = args.substring(lastUnderscoreIndex + 1);
		const sharedPrice = parseInt(priceStr, 10);

		// Validate parsed price
		if (isNaN(sharedPrice) || sharedPrice <= 0) {
			console.error(`Invalid price in share args: ${priceStr}`);
			return;
		}

		// Validate item ID is not empty
		if (!itemId.trim()) {
			console.error(`Empty item ID in share args: ${args}`);
			return;
		}

		const item = this.itemManager.getItem(itemId);
		if (!item) {
			console.error(`Item not found: ${itemId}`);
			return;
		}

		// Validate shared price is within reasonable bounds of base price (updated for enhanced dynamics)
		if (!this.isValidDynamicPrice(item, sharedPrice)) {
			const minValidPrice = Math.floor(item.purchasePrice * AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO);
			const maxValidPrice = item.purchasePrice * 3;
			console.error(`Shared price ${sharedPrice} out of valid range [${minValidPrice}, ${maxValidPrice}] for item ${itemId}`);
			return;
		}

		// Call share callback if provided
		if (this.onShareProduct) {
			this.onShareProduct(item, sharedPrice);
		}

		// Show confirmation that item was shared
		this.showPurchaseModal(`${item.name}をシェアしました！\n価格: ${sharedPrice}pt\n\nタイムラインに投稿されました。`, true);
	}

	/**
	 * Handles disabled share button click (when timeline not revealed)
	 * @param args The item ID and dynamic price (format: "itemId_price")
	 */
	private handleShareDisabled(args: string): void {
		// Split from the right to handle item IDs with underscores
		const lastUnderscoreIndex = args.lastIndexOf("_");
		if (lastUnderscoreIndex === -1) {
			console.error(`Invalid button args format: ${args}`);
			return;
		}
		const itemId = args.substring(0, lastUnderscoreIndex);

		const item = this.itemManager.getItem(itemId);
		if (!item) {
			console.error(`Item not found: ${itemId}`);
			return;
		}

		// Show SNS connection requirement modal with button reference for reactivation
		this.showSnsRequirementModal(itemId);
	}

	/**
	 * Shows purchase confirmation modal
	 * @param item The item to purchase
	 * @param dynamicPrice The current dynamic price
	 */
	private showPurchaseConfirmationModal(item: ItemData, dynamicPrice: number): void {
		this.closeModal();

		const pointBack = Math.floor(dynamicPrice * SHOP_CONFIG.POINT_BACK_RATE);
		const pointBackRate = Math.floor(SHOP_CONFIG.POINT_BACK_RATE * 100);
		const modalMessage = `${item.name}を購入しますか？\n\n価格: ${dynamicPrice}pt (変動価格)\n` +
			`定価: ${item.purchasePrice}pt\nポイントバック: ${pointBack}pt (${pointBackRate}%)`;

		const modal = new ModalE({
			scene: this.scene,
			multi: this.multi,
			name: "purchaseConfirmModal",
			args: `${item.id}|${dynamicPrice}`, // Use pipe separator to avoid underscore conflicts
			title: "購入確認",
			message: modalMessage,
			width: SHOP_CONFIG.MODAL_WIDTH,
			height: SHOP_CONFIG.MODAL_HEIGHT,
			onClose: () => this.closeModal(),
		});

		// Add confirmation buttons
		this.addConfirmationButtons(modal, item, dynamicPrice);

		this.currentModal = modal;
		this.scene.append(modal);
	}

	/**
	 * Adds confirmation buttons to purchase modal
	 * @param modal The modal to add buttons to
	 * @param item The item being purchased
	 * @param dynamicPrice The current dynamic price
	 */
	private addConfirmationButtons(modal: ModalE<string>, item: ItemData, dynamicPrice: number): void {
		// Replace close button with custom buttons using new multi-button API
		modal.replaceCloseButtons([
			{
				text: "購入",
				backgroundColor: SHOP_CONFIG.BUY_BUTTON_COLOR,
				textColor: "white",
				width: SHOP_CONFIG.MODAL_BUTTON_WIDTH,
				height: SHOP_CONFIG.MODAL_BUTTON_HEIGHT,
				onComplete: () => {
					this.executePurchase(item, dynamicPrice);
				}
			},
			{
				text: "キャンセル",
				backgroundColor: SHOP_CONFIG.CANCEL_BUTTON_COLOR,
				textColor: "white",
				width: SHOP_CONFIG.MODAL_BUTTON_WIDTH,
				height: SHOP_CONFIG.MODAL_BUTTON_HEIGHT,
				onComplete: () => {
					// Reactivate the purchase button when cancelling
					const purchaseButton = this.purchaseButtons.get(item.id);
					if (purchaseButton) {
						purchaseButton.reactivate();
					}
					// Modal closes automatically after onComplete
				}
			}
		]);
	}

	/**
	 * Executes the actual purchase
	 * @param item The item to purchase
	 * @param dynamicPrice The current dynamic price
	 */
	private executePurchase(item: ItemData, dynamicPrice: number): void {
		// Calculate point back
		const pointBack = Math.floor(dynamicPrice * SHOP_CONFIG.POINT_BACK_RATE);

		// Deduct purchase price but add point back
		const netCost = dynamicPrice - pointBack;
		this.onDeductPoints(netCost);

		// Add item to inventory
		const success = this.itemManager.purchaseItem(item.id);

		if (success) {
			// Notify parent about successful purchase
			this.onItemPurchased(item);

			// Show success modal with point back info
			this.showPurchaseModal(`${item.name}を購入しました！\n\n-${dynamicPrice}pt (変動価格)\n+${pointBack}pt (ポイントバック)\n実質 -${netCost}pt`, true);

			// Update button states without recreating the entire display
			this.scene.setTimeout(() => {
				this.updateButtonStatesAfterPurchase(item.id);
			}, 1000);
		} else {
			// Show error modal and reactivate purchase button
			const purchaseButton = this.purchaseButtons.get(item.id);
			if (purchaseButton) {
				purchaseButton.reactivate();
			}
			this.showPurchaseModal("購入に失敗しました。", false);
		}
	}

	/**
	 * Shows purchase result modal
	 * @param message The message to display
	 * @param isSuccess Whether the purchase was successful
	 */
	private showPurchaseModal(message: string, isSuccess: boolean): void {
		this.closeModal();

		const modal = new ModalE({
			scene: this.scene,
			multi: this.multi,
			name: "purchaseResultModal",
			args: "",
			title: isSuccess ? "購入完了" : "購入失敗",
			message: message,
			width: 350,
			height: 200,
			onClose: () => this.closeModal(),
		});

		modal.replaceCloseButton({
			text: "OK",
			backgroundColor: isSuccess ? SHOP_CONFIG.SUCCESS_COLOR : SHOP_CONFIG.ERROR_COLOR,
			textColor: "white",
			width: SHOP_CONFIG.MODAL_BUTTON_WIDTH,
			height: SHOP_CONFIG.MODAL_BUTTON_HEIGHT,
			onComplete: () => this.closeModal()
		});

		this.currentModal = modal;
		this.scene.append(modal);
	}

	/**
	 * Shows SNS connection requirement modal when share button is disabled
	 * @param itemId The item ID to reactivate the share button for
	 */
	private showSnsRequirementModal(itemId: string): void {
		this.closeModal();

		const modal = new ModalE({
			scene: this.scene,
			multi: this.multi,
			name: "snsRequirementModal",
			args: "",
			title: "SNS連携が必要です",
			message: "シェア機能を利用するには、SNS連携タスクを完了する必要があります。\n\nSNS連携を行いますか？",
			width: SHOP_CONFIG.MODAL_WIDTH,
			height: SHOP_CONFIG.MODAL_HEIGHT,
			onClose: () => this.closeModal(),
		});

		// Add confirmation buttons
		modal.replaceCloseButtons([
			{
				text: "OK",
				backgroundColor: SHOP_CONFIG.BUY_BUTTON_COLOR,
				textColor: "white",
				width: SHOP_CONFIG.MODAL_BUTTON_WIDTH,
				height: SHOP_CONFIG.MODAL_BUTTON_HEIGHT,
				onComplete: () => {
					// Execute SNS connection
					if (this.onSnsConnectionRequest) {
						this.onSnsConnectionRequest();
					}
				}
			},
			{
				text: "キャンセル",
				backgroundColor: SHOP_CONFIG.CANCEL_BUTTON_COLOR,
				textColor: "white",
				width: SHOP_CONFIG.MODAL_BUTTON_WIDTH,
				height: SHOP_CONFIG.MODAL_BUTTON_HEIGHT,
				onComplete: () => {
					// Reactivate the share button when cancel is clicked, but maintain disabled style
					this.reactivateDisabledShareButton(itemId);
					// Modal closes automatically after onComplete
				}
			}
		]);

		this.currentModal = modal;
		this.scene.append(modal);
	}

	/**
	 * Reactivates a disabled share button while maintaining its disabled appearance
	 * @param itemId The item ID of the share button to reactivate
	 */
	private reactivateDisabledShareButton(itemId: string): void {
		const shareButton = this.shareButtons.get(itemId);
		if (shareButton) {
			// Reactivate the button functionality
			shareButton.reactivate();

			// If timeline is still not revealed, ensure the button maintains disabled styling
			if (!this.onIsTimelineRevealed()) {
				// Reset the button colors to disabled state
				shareButton.setBackgroundColor("#95a5a6"); // Gray background for disabled
				shareButton.setTextColor("#7f8c8d"); // Darker gray text for disabled
			}
		}
	}

	/**
	 * Closes the current modal
	 */
	private closeModal(): void {
		if (this.currentModal) {
			this.currentModal.destroy();
			this.currentModal = undefined;
		}
	}

	/**
	 * Updates share buttons when timeline is revealed by recreating them with new functionality
	 */
	private updateShareButtonsForTimelineReveal(): void {
		const isTimelineRevealed = this.onIsTimelineRevealed();

		// Only recreate if timeline was just revealed
		if (isTimelineRevealed) {
			this.recreateAllShareButtons();
		}
	}

	/**
	 * Recreates share buttons with current timeline status and prices
	 * Only recreates buttons that are still active (not already shared)
	 */
	private recreateAllShareButtons(): void {
		const availableItems = this.itemManager.getAvailableItems();

		availableItems.forEach(item => {
			const existingButton = this.shareButtons.get(item.id);
			const position = this.shareButtonPositions.get(item.id);

			if (existingButton && position) {
				// Only recreate if the button is still touchable (not already shared)
				if (existingButton.touchable) {
					// Remove existing button
					existingButton.destroy();
					this.shareButtons.delete(item.id);

					// Get current dynamic price
					const currentPrice = this.getDynamicPrice(item);

					// Create new share button with timeline-enabled functionality
					const isTimelineRevealed = this.onIsTimelineRevealed();
					const newShareButton = new LabelButtonE({
						scene: this.scene,
						multi: this.multi,
						name: `shop_share_${item.id}_recreated`, // Add suffix to ensure unique name
						args: `${item.id}_${currentPrice}`,
						text: "シェア",
						width: position.width,
						height: position.height,
						x: position.x,
						y: position.y,
						backgroundColor: isTimelineRevealed ? "#3498db" : "#95a5a6",
						textColor: isTimelineRevealed ? "white" : "#7f8c8d",
						fontSize: 24,
						onComplete: (args: string) => isTimelineRevealed ? this.handleShare(args) : this.handleShareDisabled(args)
					});

					// Store new button reference
					this.shareButtons.set(item.id, newShareButton);
					this.append(newShareButton);
				}
				// If button is not touchable (already shared), leave it as-is
			}
		});
	}

	/**
	 * Updates button states after a purchase without recreating the entire display
	 * @param purchasedItemId The ID of the item that was purchased
	 */
	private updateButtonStatesAfterPurchase(purchasedItemId: string): void {
		// Update the purchased item's button to show "所持済" and disable it
		const purchaseButton = this.purchaseButtons.get(purchasedItemId);
		if (purchaseButton) {
			purchaseButton.setText("所持済");
			purchaseButton.setBackgroundColor(SHOP_CONFIG.OWNED_BUTTON_COLOR);
			purchaseButton.touchable = false;
		}
	}


	/**
	 * Updates all price labels, purchase button args, and share button args with current dynamic prices
	 * This ensures that displayed prices and button arguments remain synchronized when prices change
	 */
	private updateAllPriceLabels(): void {
		const availableItems = this.itemManager.getAvailableItems();

		availableItems.forEach(item => {
			const currentPrice = this.getDynamicPrice(item);

			// Update price label
			const priceLabel = this.priceLabels.get(item.id);
			if (priceLabel) {
				const newText = `${currentPrice}pt`;
				if (priceLabel.text !== newText) {
					priceLabel.text = newText;
					priceLabel.invalidate(); // Force redraw
				}
			}

			// Update purchase button args to match current price
			const purchaseButton = this.purchaseButtons.get(item.id);
			if (purchaseButton) {
				const newArgs = `${item.id}_${currentPrice}`;
				if (purchaseButton.msgArgs !== newArgs) {
					purchaseButton.msgArgs = newArgs;
				}
			}

			// Update share button args to match current price
			const shareButton = this.shareButtons.get(item.id);
			if (shareButton) {
				const newShareArgs = `${item.id}_${currentPrice}`;
				if (shareButton.msgArgs !== newShareArgs) {
					shareButton.msgArgs = newShareArgs;
				}
			}
		});
	}

	/**
	 * Validates if a dynamic price is within acceptable bounds for an item
	 * @param item The item to validate price for
	 * @param dynamicPrice The dynamic price to validate
	 * @returns true if price is valid, false otherwise
	 */
	private isValidDynamicPrice(item: ItemData, dynamicPrice: number): boolean {
		const minValidPrice = Math.floor(item.purchasePrice * AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO);
		const maxValidPrice = item.purchasePrice * 3; // Updated to match enhanced price range
		return dynamicPrice >= minValidPrice && dynamicPrice <= maxValidPrice;
	}

}
