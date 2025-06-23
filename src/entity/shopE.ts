import { ItemData } from "../data/itemData";
import { ItemManager } from "../manager/itemManager";
import { LabelButtonE } from "./labelButtonE";
import { ModalE } from "./modalE";

/**
 * Shop configuration constants
 */
const SHOP_CONFIG = {
	// Layout constants
	HEADER_HEIGHT: 80,
	PRODUCT_GRID_Y_OFFSET: 120,
	PRODUCT_GRID_MARGIN: 20,
	PRODUCT_GRID_BOTTOM_MARGIN: 200,

	// Product layout
	NOVEL_SPACING: 160,
	MANGA_SPACING: 120,
	MANGA_ROW_OFFSET: 220,

	// Modal constants
	MODAL_WIDTH: 400,
	MODAL_HEIGHT: 250,
	MODAL_BUTTON_WIDTH: 80,
	MODAL_BUTTON_HEIGHT: 35,
	MODAL_BUTTON_Y_OFFSET: 50,
	MODAL_CANCEL_X_OFFSET: 180,

	// Colors
	BACKGROUND_COLOR: "#ecf0f1",
	HEADER_COLOR: "#2c3e50",
	OWNED_BUTTON_COLOR: "#95a5a6",
	BUY_BUTTON_COLOR: "#27ae60",
	CANCEL_BUTTON_COLOR: "#95a5a6",
	SUCCESS_COLOR: "#27ae60",
	ERROR_COLOR: "#e74c3c",

	// Point back system
	POINT_BACK_RATE: 0.1, // 10% point back rate
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
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Item manager instance */
	itemManager: ItemManager;
	/** Callback to check if player has enough points */
	onCheckPoints: () => number;
	/** Callback to deduct points for purchase */
	onDeductPoints: (amount: number) => void;
	/** Callback when item is purchased successfully */
	onItemPurchased: (item: ItemData) => void;
	/** Callback when back button is pressed */
	onBack?: () => void;
}

/**
 * Shop screen entity that displays shopping interface
 * Shows product listings, categories, and purchase options
 */
export class ShopE extends g.E {
	private readonly layout: LayoutConfig;
	private readonly itemManager: ItemManager;
	private readonly onCheckPoints: () => number;
	private readonly onDeductPoints: (amount: number) => void;
	private readonly onItemPurchased: (item: ItemData) => void;
	private readonly onBack?: () => void;
	private currentModal?: ModalE<string>;
	private purchaseButtons: Map<string, LabelButtonE<string>> = new Map(); // Store button references for reactivation

	/**
	 * Creates a new Shop instance
	 * @param options Configuration options for the shop screen
	 */
	constructor(options: ShopParameterObject) {
		super(options);

		this.itemManager = options.itemManager;
		this.onCheckPoints = options.onCheckPoints;
		this.onDeductPoints = options.onDeductPoints;
		this.onItemPurchased = options.onItemPurchased;
		this.onBack = options.onBack;
		this.layout = this.createLayoutConfig(options.width, options.height);
		this.createLayout();
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
					y: 0,
					width: screenWidth,
					height: SHOP_CONFIG.HEADER_HEIGHT,
					children: {
						backButton: { x: 20, y: 20, width: 60, height: 40 },
						title: { x: screenWidth / 2 - 50, y: 25, width: 100, height: 30 }
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
							height: 200,
							children: {
								image: { x: 10, y: 10, width: 120, height: 120 },
								name: { x: 10, y: 140, width: 120, height: 20 },
								price: { x: 10, y: 165, width: 80, height: 20 },
								buyButton: { x: 95, y: 160, width: 45, height: 30 }
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
		// Background
		const background = new g.FilledRect({
			scene: this.scene,
			width: this.layout.width,
			height: this.layout.height,
			x: this.layout.x,
			y: this.layout.y,
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
		const backButton = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: "white",
			}),
			text: "← 戻る",
			x: this.layout.x + backButtonLayout.x,
			y: this.layout.y + backButtonLayout.y,
			touchable: true,
		});
		backButton.onPointDown.add(() => {
			if (this.onBack) {
				this.onBack();
			}
		});
		this.append(backButton);

		// Title
		const title = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: "white",
			}),
			text: "通販",
			x: this.layout.x + titleLayout.x,
			y: this.layout.y + titleLayout.y,
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
			const productX = this.layout.children!.productGrid.x + (index * SHOP_CONFIG.NOVEL_SPACING);
			const productY = this.layout.children!.productGrid.y;
			this.createProductCard(item, productX, productY);
		});

		// Display manga in second row
		manga.forEach((item, index) => {
			const productX = this.layout.children!.productGrid.x + (index * SHOP_CONFIG.MANGA_SPACING);
			const productY = this.layout.children!.productGrid.y + SHOP_CONFIG.MANGA_ROW_OFFSET;
			this.createProductCard(item, productX, productY);
		});
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
				size: 48,
			}),
			text: item.emoji,
			x: x + imageLayout.x + 30,
			y: y + imageLayout.y + 30,
		});
		this.append(productImage);

		// Product name
		const productName = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "#2c3e50",
			}),
			text: item.name,
			x: x + nameLayout.x,
			y: y + nameLayout.y,
		});
		this.append(productName);

		// Product price
		const productPrice = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: "#e74c3c",
			}),
			text: `${item.purchasePrice}pt`,
			x: x + priceLayout.x,
			y: y + priceLayout.y,
		});
		this.append(productPrice);

		// Check if item is already owned
		const isOwned = this.itemManager.ownsItem(item.id);
		const buttonColor = isOwned ? SHOP_CONFIG.OWNED_BUTTON_COLOR : SHOP_CONFIG.BUY_BUTTON_COLOR;
		const buttonText = isOwned ? "所持済" : "購入";

		// Buy button using LabelButtonE for proper multi-player support
		const buyButton = new LabelButtonE({
			scene: this.scene,
			name: `shop_buy_${item.id}`,
			args: item.id,
			text: buttonText,
			width: buyButtonLayout.width,
			height: buyButtonLayout.height,
			x: x + buyButtonLayout.x,
			y: y + buyButtonLayout.y,
			backgroundColor: buttonColor,
			textColor: "white",
			fontSize: 10,
			onComplete: (itemId: string) => this.handlePurchase(itemId)
		});

		// Store button reference for reactivation
		this.purchaseButtons.set(item.id, buyButton);

		// Disable button if already owned
		if (isOwned) {
			buyButton.touchable = false;
		}

		this.append(buyButton);
	}

	/**
	 * Handles purchase button click
	 * @param itemId The ID of the item to purchase
	 */
	private handlePurchase(itemId: string): void {
		const item = this.itemManager.getItem(itemId);
		if (!item) {
			console.error(`Item not found: ${itemId}`);
			return;
		}

		// Check if already owned
		if (this.itemManager.ownsItem(itemId)) {
			this.showPurchaseModal("すでに所持しているアイテムです。", false);
			return;
		}

		// Check if player has enough points
		const currentPoints = this.onCheckPoints();
		if (currentPoints < item.purchasePrice) {
			this.showPurchaseModal(`ポイントが不足しています。\n必要: ${item.purchasePrice}pt\n所持: ${currentPoints}pt`, false);
			return;
		}

		// Show purchase confirmation modal
		this.showPurchaseConfirmationModal(item);
	}

	/**
	 * Shows purchase confirmation modal
	 * @param item The item to purchase
	 */
	private showPurchaseConfirmationModal(item: ItemData): void {
		this.closeModal();

		const pointBack = Math.floor(item.purchasePrice * SHOP_CONFIG.POINT_BACK_RATE);
		const pointBackRate = Math.floor(SHOP_CONFIG.POINT_BACK_RATE * 100);
		const modalMessage = `${item.name}を購入しますか？\n\n価格: ${item.purchasePrice}pt\n` +
			`精算価値: ${item.individualPrice}pt\nポイントバック: ${pointBack}pt (${pointBackRate}%)`;

		const modal = new ModalE({
			scene: this.scene,
			name: "purchaseConfirmModal",
			args: item.id,
			title: "購入確認",
			message: modalMessage,
			width: SHOP_CONFIG.MODAL_WIDTH,
			height: SHOP_CONFIG.MODAL_HEIGHT,
			onClose: () => this.closeModal(),
		});

		// Add confirmation buttons
		this.addConfirmationButtons(modal, item);

		this.currentModal = modal;
		this.scene.append(modal);
	}

	/**
	 * Adds confirmation buttons to purchase modal
	 * @param modal The modal to add buttons to
	 * @param item The item being purchased
	 */
	private addConfirmationButtons(modal: ModalE<string>, item: ItemData): void {
		// Replace close button with custom buttons using new multi-button API
		modal.replaceCloseButtons([
			{
				text: "キャンセル",
				backgroundColor: SHOP_CONFIG.CANCEL_BUTTON_COLOR,
				textColor: "white",
				fontSize: 14,
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
			},
			{
				text: "購入",
				backgroundColor: SHOP_CONFIG.BUY_BUTTON_COLOR,
				textColor: "white",
				fontSize: 14,
				width: SHOP_CONFIG.MODAL_BUTTON_WIDTH,
				height: SHOP_CONFIG.MODAL_BUTTON_HEIGHT,
				onComplete: () => {
					this.executePurchase(item);
				}
			}
		]);
	}

	/**
	 * Executes the actual purchase
	 * @param item The item to purchase
	 */
	private executePurchase(item: ItemData): void {
		// Calculate point back
		const pointBack = Math.floor(item.purchasePrice * SHOP_CONFIG.POINT_BACK_RATE);

		// Deduct purchase price but add point back
		const netCost = item.purchasePrice - pointBack;
		this.onDeductPoints(netCost);

		// Add item to inventory
		const success = this.itemManager.purchaseItem(item.id);

		if (success) {
			// Notify parent about successful purchase
			this.onItemPurchased(item);

			// Show success modal with point back info
			this.showPurchaseModal(`${item.name}を購入しました！\n\n-${item.purchasePrice}pt\n+${pointBack}pt (ポイントバック)\n実質 -${netCost}pt`, true);

			// Refresh the shop display to update button states
			this.scene.setTimeout(() => {
				this.refreshShopDisplay();
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
			fontSize: 14,
			width: SHOP_CONFIG.MODAL_BUTTON_WIDTH,
			height: SHOP_CONFIG.MODAL_BUTTON_HEIGHT,
			onComplete: () => this.closeModal()
		});

		this.currentModal = modal;
		this.scene.append(modal);
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
	 * Refreshes the shop display to update button states
	 */
	private refreshShopDisplay(): void {
		// Clear purchase button references for reactivation
		this.purchaseButtons.clear();

		// Remove all children and recreate the layout
		// This is a simple approach to refresh the display
		if (this.children) {
			this.children.forEach(child => child.destroy());
		}
		this.createLayout();
	}
}
