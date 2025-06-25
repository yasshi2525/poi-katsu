import { ItemData, OwnedItem, SetInfo, getDefaultCatalogItems } from "../data/itemData";

/**
 * Item management system
 * Handles item definitions, player inventory, and set completion logic
 */
export class ItemManager {
	// Available items for purchase based on specification
	private readonly availableItems: ItemData[] = getDefaultCatalogItems();

	// Player's owned items
	private ownedItems: Map<string, OwnedItem> = new Map();

	/**
	 * Gets all available items for purchase
	 * @returns Array of available items
	 */
	getAvailableItems(): ItemData[] {
		return [...this.availableItems];
	}

	/**
	 * Gets a specific item by ID
	 * @param itemId The item ID to find
	 * @returns Item data or undefined if not found
	 */
	getItem(itemId: string): ItemData | undefined {
		return this.availableItems.find(item => item.id === itemId);
	}

	/**
	 * Gets all owned items sorted by category and series number
	 * @returns Array of owned items sorted by category and seriesNumber
	 */
	getOwnedItems(): OwnedItem[] {
		return Array.from(this.ownedItems.values()).sort((a, b) => {
			// First sort by category (novel comes before manga)
			if (a.item.category !== b.item.category) {
				return a.item.category === "novel" ? -1 : 1;
			}
			// Then sort by series number within the same category
			return a.item.seriesNumber - b.item.seriesNumber;
		});
	}

	/**
	 * Checks if player owns a specific item
	 * @param itemId The item ID to check
	 * @returns True if owned, false otherwise
	 */
	ownsItem(itemId: string): boolean {
		return this.ownedItems.has(itemId);
	}

	/**
	 * Purchases an item and adds it to player's inventory
	 * @param itemId The ID of the item to purchase
	 * @param currentTime Current timestamp (defaults to 0 for testing)
	 * @returns True if purchase was successful, false if item not found or already owned
	 */
	purchaseItem(itemId: string, currentTime: number = 0): boolean {
		const item = this.getItem(itemId);
		if (!item || this.ownsItem(itemId)) {
			return false;
		}

		const ownedItem: OwnedItem = {
			item: item,
			purchasedAt: currentTime
		};

		this.ownedItems.set(itemId, ownedItem);
		return true;
	}

	/**
	 * Checks if a specific category collection is complete
	 * @param category The category to check (novel or manga)
	 * @returns true if all items in the category are owned
	 */
	isCollectionComplete(category: string): boolean {
		const categoryItems = this.availableItems.filter(item => item.category === category);
		const ownedCategoryItems = categoryItems.filter(item => this.ownsItem(item.id));
		return ownedCategoryItems.length === categoryItems.length && categoryItems.length > 0;
	}

	/**
	 * Gets set completion information for settlement calculations
	 * @returns Array of set information for each category
	 */
	getSetInfo(): SetInfo[] {
		const categories = ["novel", "manga"] as const;
		const setInfos: SetInfo[] = [];

		for (const category of categories) {
			const categoryItems = this.availableItems.filter(item => item.category === category);
			const ownedCategoryItems = categoryItems.filter(item => this.ownsItem(item.id));

			const isComplete = ownedCategoryItems.length === categoryItems.length;
			const individualValue = ownedCategoryItems.reduce((sum, item) => sum + item.individualPrice, 0);
			const setBonus = isComplete && categoryItems.length > 0 ? categoryItems[0].setPrice : 0;

			setInfos.push({
				category: category,
				isComplete: isComplete,
				items: ownedCategoryItems,
				individualValue: individualValue,
				setBonus: setBonus
			});
		}

		return setInfos;
	}

	/**
	 * Calculates total settlement value of all owned items
	 * Takes into account set bonuses for complete sets
	 * @returns Total settlement value in points
	 */
	calculateSettlementValue(): number {
		const setInfos = this.getSetInfo();
		let totalValue = 0;

		for (const setInfo of setInfos) {
			if (setInfo.isComplete) {
				// Use set bonus if complete
				totalValue += setInfo.setBonus;
			} else {
				// Use individual values if not complete
				totalValue += setInfo.individualValue;
			}
		}

		return totalValue;
	}

	/**
	 * Gets owned items grouped by category for display
	 * @returns Map of category to owned items in that category
	 */
	getOwnedItemsByCategory(): Map<string, OwnedItem[]> {
		const itemsByCategory = new Map<string, OwnedItem[]>();

		for (const ownedItem of this.ownedItems.values()) {
			const category = ownedItem.item.category;
			if (!itemsByCategory.has(category)) {
				itemsByCategory.set(category, []);
			}
			itemsByCategory.get(category)!.push(ownedItem);
		}

		// Sort items within each category by series number
		for (const items of itemsByCategory.values()) {
			items.sort((a, b) => a.item.seriesNumber - b.item.seriesNumber);
		}

		return itemsByCategory;
	}

	/**
	 * For testing: Removes all owned items
	 */
	clearOwnedItemsForTesting(): void {
		this.ownedItems.clear();
	}

	/**
	 * For testing: Adds an item directly to owned items
	 * @param itemId Item ID to add
	 * @param currentTime Current timestamp (defaults to 0 for testing)
	 */
	addOwnedItemForTesting(itemId: string, currentTime: number = 0): boolean {
		const item = this.getItem(itemId);
		if (!item) {
			return false;
		}

		const ownedItem: OwnedItem = {
			item: item,
			purchasedAt: currentTime
		};

		this.ownedItems.set(itemId, ownedItem);
		return true;
	}

	addItemDataForTesting(itemData: ItemData): void {
		if (!this.availableItems.some(item => item.id === itemData.id)) {
			this.availableItems.push(itemData);
		}
	}
}
