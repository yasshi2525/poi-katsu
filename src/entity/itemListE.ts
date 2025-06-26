import { OwnedItem } from "../data/itemData";
import { ItemManager } from "../manager/itemManager";

/**
 * Parameter object for ItemListE
 */
export interface ItemListEParameterObject extends g.EParameterObject {
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Item manager instance */
	itemManager: ItemManager;
}

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
 * Item list display component
 * Shows player's owned items organized by category with set completion status
 */
export class ItemListE extends g.E {
	private readonly itemManager: ItemManager;
	private readonly layout: LayoutConfig;
	private itemContainer!: g.E;

	/**
	 * Creates a new ItemListE instance
	 * @param options Configuration options for the item list
	 */
	constructor(options: ItemListEParameterObject) {
		super(options);

		this.itemManager = options.itemManager;
		this.layout = this.createLayoutConfig(options.width, options.height);
		this.createLayout();
		this.refreshItems();
	}

	/**
	 * Refreshes the item display
	 * Should be called after items are purchased or inventory changes
	 */
	refreshItems(): void {
		// Clear existing items
		if (this.itemContainer) {
			this.itemContainer.destroy();
		}

		// Recreate item container
		this.itemContainer = new g.E({
			scene: this.scene,
			x: this.layout.x,
			y: this.layout.y
		});
		this.append(this.itemContainer);

		// Display items
		this.displayOwnedItems();
	}

	/**
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, screenHeight: number): LayoutConfig {
		return {
			x: 0,
			y: 69, // Below header (header height = 69)
			width: screenWidth,
			height: screenHeight,
			children: {
				header: {
					x: 10,
					y: 5,
					width: 120,
					height: 20
				},
				content: {
					x: 140, // Start after header text
					y: 5,
					width: screenWidth - 150,
					height: screenHeight - 10
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
			cssColor: "#f8f9fa",
		});
		this.append(background);

		// Header
		this.createHeader();
	}

	/**
	 * Creates the header with title
	 */
	private createHeader(): void {
		const headerLayout = this.layout.children!.header;

		// Title
		const title = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "#2c3e50",
				fontWeight: "bold"
			}),
			text: "所持アイテム:",
			x: this.layout.x + headerLayout.x,
			y: this.layout.y + headerLayout.y,
		});
		this.append(title);
	}

	/**
	 * Displays all owned items in a horizontal single line
	 */
	private displayOwnedItems(): void {
		const ownedItems = this.itemManager.getOwnedItems();
		const contentLayout = this.layout.children!.content;

		if (ownedItems.length === 0) {
			// Show "no items" message
			const noItemsLabel = new g.Label({
				scene: this.scene,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 12,
					fontColor: "#7f8c8d"
				}),
				text: "なし",
				x: contentLayout.x,
				y: contentLayout.y + 5,
			});
			this.itemContainer.append(noItemsLabel);
			return;
		}

		// Display items in a horizontal line
		let currentX = contentLayout.x;
		const itemSpacing = 5;
		const itemWidth = 40;

		ownedItems.forEach((ownedItem, index) => {
			// Don't overflow the content area
			if (currentX + itemWidth > contentLayout.x + contentLayout.width) {
				return;
			}

			this.displayHorizontalItemCard(ownedItem, currentX, contentLayout.y, itemWidth);
			currentX += itemWidth + itemSpacing;
		});

		// Show count if there are more items than can be displayed
		const maxDisplayableItems = Math.floor(contentLayout.width / (itemWidth + itemSpacing));
		if (ownedItems.length > maxDisplayableItems) {
			const moreLabel = new g.Label({
				scene: this.scene,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 10,
					fontColor: "#7f8c8d"
				}),
				text: `+${ownedItems.length - maxDisplayableItems}個`,
				x: currentX,
				y: contentLayout.y + 15,
			});
			this.itemContainer.append(moreLabel);
		}
	}


	/**
	 * Displays a horizontal item card for single-line layout
	 * @param ownedItem The owned item to display
	 * @param x X position
	 * @param y Y position
	 * @param width Card width
	 */
	private displayHorizontalItemCard(ownedItem: OwnedItem, x: number, y: number, width: number): void {
		const height = 40; // Fixed height for horizontal layout

		// Card background
		const cardBg = new g.FilledRect({
			scene: this.scene,
			width: width,
			height: height,
			x: x,
			y: y,
			cssColor: "white",
		});
		this.itemContainer.append(cardBg);

		// Card border
		const cardBorder = new g.FilledRect({
			scene: this.scene,
			width: width,
			height: 2,
			x: x,
			y: y + height - 2,
			cssColor: "#3498db",
		});
		this.itemContainer.append(cardBorder);

		// Item emoji (centered)
		const itemEmoji = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
			}),
			text: ownedItem.item.emoji,
			x: x + (width - 16) / 2,
			y: y + 5,
		});
		this.itemContainer.append(itemEmoji);

		// Series number (small text at bottom)
		const seriesText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 8,
				fontColor: "#7f8c8d",
			}),
			text: `${ownedItem.item.seriesNumber}`,
			x: x + (width - 8) / 2,
			y: y + 25,
		});
		this.itemContainer.append(seriesText);
	}

}
