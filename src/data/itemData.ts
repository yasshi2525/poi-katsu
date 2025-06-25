import { POINT_CONSTANTS } from "../manager/pointManager";

/**
 * Item data interface representing a purchasable product
 * Moved from manager/itemManager.ts to centralize data models
 */
export interface ItemData {
	/** Unique identifier for the item */
	id: string;
	/** Display name of the item */
	name: string;
	/** Category the item belongs to (novel, manga) */
	category: "novel" | "manga";
	/** Item number within the series (for display and set detection) */
	seriesNumber: number;
	/** Purchase price in points */
	purchasePrice: number;
	/** Individual settlement price in points */
	individualPrice: number;
	/** Set settlement price in points (when all items in category are owned) */
	setPrice: number;
	/** Display emoji for the item */
	emoji: string;
}

/**
 * Player's owned item with purchase information
 */
export interface OwnedItem {
	/** Item data */
	item: ItemData;
	/** When the item was purchased - timestamp in milliseconds */
	purchasedAt: number;
}

/**
 * Set completion info for settlement calculations
 */
export interface SetInfo {
	/** Category name */
	category: "novel" | "manga";
	/** Whether the set is complete */
	isComplete: boolean;
	/** Items in the set */
	items: ItemData[];
	/** Total individual value */
	individualValue: number;
	/** Set bonus value */
	setBonus: number;
}

/**
 * Item category metadata
 */
export interface ItemCategory {
	/** Category identifier */
	id: "novel" | "manga";
	/** Display name */
	name: string;
	/** Category description */
	description: string;
	/** Category emoji */
	emoji: string;
	/** Set completion bonus description */
	setBonusDescription: string;
}

/**
 * Creates a new item data object
 * @param options Item creation options
 */
export function createItemData(options: {
	id: string;
	name: string;
	category: "novel" | "manga";
	seriesNumber: number;
	purchasePrice: number;
	individualPrice: number;
	setPrice: number;
	emoji: string;
}): ItemData {
	return {
		id: options.id,
		name: options.name,
		category: options.category,
		seriesNumber: options.seriesNumber,
		purchasePrice: options.purchasePrice,
		individualPrice: options.individualPrice,
		setPrice: options.setPrice,
		emoji: options.emoji
	};
}

/**
 * Creates an owned item record
 * @param item Item data
 * @param purchasedAt Purchase timestamp (defaults to 0 for testing)
 */
export function createOwnedItem(item: ItemData, purchasedAt: number = 0): OwnedItem {
	return {
		item: item,
		purchasedAt: purchasedAt
	};
}

/**
 * Gets item category metadata
 * @param categoryId Category identifier
 */
export function getItemCategoryInfo(categoryId: "novel" | "manga"): ItemCategory {
	const categories: { [key: string]: ItemCategory } = {
		novel: {
			id: "novel",
			name: "小説シリーズ",
			description: "上巻・下巻の2冊セット",
			emoji: "📖",
			setBonusDescription: `セット完成で${POINT_CONSTANTS.SET_CLOTHES_BONUS}ポイント`
		},
		manga: {
			id: "manga",
			name: "マンガシリーズ",
			description: "1巻〜5巻の5冊セット",
			emoji: "📚",
			setBonusDescription: `セット完成で${POINT_CONSTANTS.SET_ELECTRONICS_BONUS}ポイント`
		}
	};

	return categories[categoryId];
}

/**
 * Gets default catalog items based on specification
 */
export function getDefaultCatalogItems(): ItemData[] {
	return [
		// Novel series (上巻・下巻)
		createItemData({
			id: "novel_volume1",
			name: "小説 上巻",
			category: "novel",
			seriesNumber: 1,
			purchasePrice: 200,
			individualPrice: 150,
			setPrice: 1000,
			emoji: "📖"
		}),
		createItemData({
			id: "novel_volume2",
			name: "小説 下巻",
			category: "novel",
			seriesNumber: 2,
			purchasePrice: 200,
			individualPrice: 150,
			setPrice: 1000,
			emoji: "📖"
		}),
		// Manga series (1巻-5巻)
		createItemData({
			id: "manga_volume1",
			name: "マンガ 1巻",
			category: "manga",
			seriesNumber: 1,
			purchasePrice: 100,
			individualPrice: 50,
			setPrice: 2500,
			emoji: "📚"
		}),
		createItemData({
			id: "manga_volume2",
			name: "マンガ 2巻",
			category: "manga",
			seriesNumber: 2,
			purchasePrice: 100,
			individualPrice: 50,
			setPrice: 2500,
			emoji: "📚"
		}),
		createItemData({
			id: "manga_volume3",
			name: "マンガ 3巻",
			category: "manga",
			seriesNumber: 3,
			purchasePrice: 100,
			individualPrice: 50,
			setPrice: 2500,
			emoji: "📚"
		}),
		createItemData({
			id: "manga_volume4",
			name: "マンガ 4巻",
			category: "manga",
			seriesNumber: 4,
			purchasePrice: 100,
			individualPrice: 50,
			setPrice: 2500,
			emoji: "📚"
		}),
		createItemData({
			id: "manga_volume5",
			name: "マンガ 5巻",
			category: "manga",
			seriesNumber: 5,
			purchasePrice: 100,
			individualPrice: 50,
			setPrice: 2500,
			emoji: "📚"
		})
	];
}

/**
 * Calculates set completion info for owned items
 * @param ownedItems Player's owned items
 * @param allItems All available items
 */
export function calculateSetInfo(ownedItems: OwnedItem[], allItems: ItemData[]): SetInfo[] {
	const categories = ["novel", "manga"] as const;
	const setInfos: SetInfo[] = [];

	for (const category of categories) {
		const categoryItems = allItems.filter(item => item.category === category);
		const ownedCategoryItems = ownedItems
			.filter(owned => owned.item.category === category)
			.map(owned => owned.item);

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
 * Calculates total settlement value including set bonuses
 * @param setInfos Set completion information
 */
export function calculateTotalSettlementValue(setInfos: SetInfo[]): number {
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
 * Groups owned items by category
 * @param ownedItems Player's owned items
 */
export function groupItemsByCategory(ownedItems: OwnedItem[]): Map<string, OwnedItem[]> {
	const itemsByCategory = new Map<string, OwnedItem[]>();

	for (const ownedItem of ownedItems) {
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
