import { ItemData } from "./itemData";

/**
 * Shared post data for timeline
 */
export interface SharedPostData {
	/** Unique post ID */
	id: string;
	/** Id of player who shared the item */
	sharerId: string;
	/** Name of player who shared the item */
	sharerName: string;
	/** Shared item data */
	item: ItemData;
	/** Price at which item was shared */
	sharedPrice: number;
	/** Timestamp when shared */
	sharedAt: number;
	/** Whether this is an affiliate post */
	isAffiliate: boolean;
	/** Number of purchases made through this post */
	purchaseCount: number;
}

/**
 * Creates a new shared post data object
 * @param options Post creation options
 */
export function createSharedPost(options: {
	id: string;
	sharerId: string;
	sharerName: string;
	item: ItemData;
	sharedPrice: number;
	sharedAt: number;
	isAffiliate?: boolean;
	purchaseCount?: number;
}): SharedPostData {
	return {
		id: options.id,
		sharerId: options.sharerId,
		sharerName: options.sharerName,
		item: options.item,
		sharedPrice: options.sharedPrice,
		sharedAt: options.sharedAt,
		isAffiliate: options.isAffiliate ?? true,
		purchaseCount: options.purchaseCount ?? 0
	};
}

/**
 * Increments the purchase count for a shared post
 * @param sharedPost The shared post to update
 */
export function incrementPurchaseCount(sharedPost: SharedPostData): void {
	sharedPost.purchaseCount++;
}
