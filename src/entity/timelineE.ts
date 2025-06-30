import { Timeline } from "@akashic-extension/akashic-timeline";
import { AFFILIATE_CONFIG } from "../config/affiliateConfig";
import { AffiliatePurchaseMessage } from "../data/affiliateMessages";
import { ItemData } from "../data/itemData";
import { DUMMY_ID_FOR_ACTIVE_INSTANCE } from "../data/playerData";
import { SharedPostData } from "../data/sharedPostData";
import { ItemManager } from "../manager/itemManager";
import { LabelButtonE } from "./labelButtonE";
import { ModalE } from "./modalE";

/**
 * Animation configuration constants
 */
const ANIMATION_CONFIG = {
	POST_SHIFT_DURATION: 400,
	POST_FADE_IN_DURATION: 600,
	POST_FADE_IN_DELAY: 200,
	// Batch animation configuration
	BATCH_ANIMATION_TOTAL_DURATION: 500, // バッチアニメーション全体の最大時間（ms）
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
 * Parameter object for Timeline
 */
export interface TimelineParameterObject extends g.EParameterObject {
	/** Whether multiplayer mode or not */
	multi: boolean;
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Item manager instance */
	itemManager: ItemManager;
	/** Callback when affiliate purchase is made */
	onAffiliatePurchase?: (postId: string, buyerName: string, rewardPoints: number) => void;
	/** Callback to check if player has enough points */
	onCheckPoints?: () => number;
	/** Callback to deduct points for purchase */
	onDeductPoints?: (amount: number) => void;
	/** Callback when item is purchased successfully */
	onItemPurchased?: (item: ItemData) => void;
	/** Callback to check if player already owns an item */
	onCheckOwnership?: (itemId: string) => boolean;
	/** Callback to get current player name */
	onGetPlayerName?: () => string;
	/** Callback to get current player ID */
	onGetPlayerId?: () => string;
}

/**
 * Timeline section component that displays timeline items
 */
export class TimelineE extends g.E {
	private readonly multi: boolean;
	private readonly layout: LayoutConfig;
	private readonly itemManager: ItemManager;
	private readonly onAffiliatePurchase?: (postId: string, buyerName: string, rewardPoints: number) => void;
	private readonly onCheckPoints?: () => number;
	private readonly onDeductPoints?: (amount: number) => void;
	private readonly onItemPurchased?: (item: ItemData) => void;
	private readonly onCheckOwnership?: (itemId: string) => boolean;
	private readonly onGetPlayerName?: () => string;
	private readonly onGetPlayerId?: () => string;
	private sharedPosts: SharedPostData[] = [];
	private affiliateButtons: Map<string, LabelButtonE<string>> = new Map();
	private timelineItems: g.E[] = [];
	private loadingOverlay?: g.E;
	private currentModal?: ModalE<null>;
	private scrollContainer?: g.Pane;
	private scrollOffset: number = 0;
	private maxScrollOffset: number = 0;
	private lastScrollY: number = 0;
	private isScrolling: boolean = false;
	private isAnimating: boolean = false;
	// Batch processing properties
	private batchPendingPosts: SharedPostData[] = [];
	private batchProcessing: boolean = false;
	private batchTimer?: g.TimerIdentifier;
	// Sort and animation properties
	private needsResort: boolean = false;
	private resortTimer?: g.TimerIdentifier;
	private lastSortTime: number = 0;
	private readonly RESORT_COOLDOWN: number = 2000; // 2 second cooldown between resorts
	private readonly avatarFont: g.Font;
	private readonly userNameFont: g.Font;
	private readonly disabledStyleActionFont: g.Font;
	private readonly enabledStyleActionFont: g.Font;
	private readonly disabledStylePriceFont: g.Font;
	private readonly enabledStylePriceFont: g.Font;
	private readonly disabledStylePriceSuffixFont: g.Font;
	private readonly enabledStylePriceSuffixFont: g.Font;
	private readonly loadingFont: g.Font;

	/**
	 * Creates a new Timeline instance
	 * @param options Configuration options for the timeline
	 */
	constructor(options: TimelineParameterObject) {
		super(options);

		this.avatarFont = new g.DynamicFont({
			game: this.scene.game,
			fontFamily: "sans-serif",
			size: 20,
		});
		this.userNameFont = new g.DynamicFont({
			game: this.scene.game,
			fontFamily: "sans-serif",
			size: 18,
			fontColor: "#2c3e50",
			fontWeight: "bold",
		});
		this.disabledStyleActionFont = new g.DynamicFont({
			game: this.scene.game,
			fontFamily: "sans-serif",
			size: 24,
			fontColor: "#7f8c8d",
		});
		this.enabledStyleActionFont = new g.DynamicFont({
			game: this.scene.game,
			fontFamily: "sans-serif",
			size: 24,
			fontColor: "#34495e",
		});
		this.disabledStylePriceFont = new g.DynamicFont({
			game: this.scene.game,
			fontFamily: "sans-serif",
			size: 28,
			fontColor: "#95a5a6",
			fontWeight: "bold",
		});
		this.enabledStylePriceFont = new g.DynamicFont({
			game: this.scene.game,
			fontFamily: "sans-serif",
			size: 28,
			fontColor: "#e74c3c",
			fontWeight: "bold",
		});
		this.disabledStylePriceSuffixFont = new g.DynamicFont({
			game: this.scene.game,
			fontFamily: "sans-serif",
			size: 24,
			fontColor: "#7f8c8d",
		});
		this.enabledStylePriceSuffixFont = new g.DynamicFont({
			game: this.scene.game,
			fontFamily: "sans-serif",
			size: 24,
			fontColor: "#34495e",
		});
		this.loadingFont = new g.DynamicFont({
			game: this.scene.game,
			fontFamily: "sans-serif",
			size: 14,
			fontColor: "white",
		});

		this.multi = options.multi;
		this.itemManager = options.itemManager;
		this.onAffiliatePurchase = options.onAffiliatePurchase;
		this.onCheckPoints = options.onCheckPoints;
		this.onDeductPoints = options.onDeductPoints;
		this.onItemPurchased = options.onItemPurchased;
		this.onCheckOwnership = options.onCheckOwnership;
		this.onGetPlayerName = options.onGetPlayerName;
		this.onGetPlayerId = options.onGetPlayerId;
		this.layout = this.createLayoutConfig(options.width, options.height);
		this.createLayout();
	}

	/**
	 * Adds a shared post to the timeline with smooth animation
	 * @param sharedPost The shared post data
	 */
	addSharedPost(sharedPost: SharedPostData): void {
		// Add to batch processing queue
		this.batchPendingPosts.push(sharedPost);

		// Check if this new post affects the cheapest price labels
		this.updateCheapestPriceLabels(sharedPost.item.id);

		// Start batch processing if not already in progress
		if (!this.batchProcessing && !this.batchTimer) {
			this.startBatchProcessing();
		}
	}

	/**
	 * Adds a shared post to the timeline without animation (for testing)
	 * @param sharedPost The shared post data
	 */
	addSharedPostForTesting(sharedPost: SharedPostData): void {
		this.sharedPosts.unshift(sharedPost); // Add to beginning
		this.refreshTimeline(); // Use old synchronous method for tests
	}

	/**
	 * Force closes all modals in timeline
	 */
	forceCloseAllModals(): void {
		if (this.currentModal) {
			this.currentModal.destroy();
			this.currentModal = undefined;
		}
	}

	/**
	 * Increments the purchase count for a specific shared post
	 * @param postId The ID of the post to update
	 */
	incrementPurchaseCount(postId: string): void {
		const sharedPost = this.sharedPosts.find(post => post.id === postId);
		if (sharedPost) {
			const oldPurchaseCount = sharedPost.purchaseCount;
			sharedPost.purchaseCount++;
			this.updatePurchaseCount(postId); // Update display without destroying children

			// Check if this purchase count change might affect sort order
			if (this.shouldTriggerResort(sharedPost, oldPurchaseCount)) {
				this.requestSmartResort();
			}
		}
	}

	/**
	 * External callback for item purchases from other sources (shop, etc.)
	 */
	onItemPurchasedExternal(item: ItemData): void {
		this.updateAllButtonsForItem(item.id);
	}

	/**
	 * External callback for when item prices change (from market dynamics)
	 * Updates cheapest price labels accordingly
	 * @param itemId The ID of the item whose price changed
	 */
	onItemPriceChanged(itemId: string): void {
		this.updateCheapestPriceLabels(itemId);
	}

	/**
	 * Gets all shared posts for a specific item
	 * @param itemId Item ID to search for
	 * @returns Array of shared posts for the specified item
	 */
	getPostsByItem(itemId: string): SharedPostData[] {
		return this.sharedPosts.filter(post => post.item.id === itemId);
	}

	/**
	 * Gets the lowest priced post for a specific item
	 * @param itemId Item ID to search for
	 * @returns The shared post with the lowest price, or null if no posts exist
	 */
	getLowestPricePost(itemId: string): SharedPostData | null {
		const posts = this.getPostsByItem(itemId);
		if (posts.length === 0) {
			return null;
		}
		return posts.reduce((lowest, current) =>
			current.sharedPrice < lowest.sharedPrice ? current : lowest
		);
	}

	/**
	 * Checks if a post has the lowest price for its item
	 * @param post The post to check
	 * @returns True if this post has the lowest price for its item
	 */
	private isLowestPricePost(post: SharedPostData): boolean {
		const lowestPost = this.getLowestPricePost(post.item.id);
		return lowestPost !== null && lowestPost.id === post.id;
	}

	/**
	 * Updates cheapest price labels for all posts of a specific item
	 * @param itemId The item ID to update labels for
	 */
	private updateCheapestPriceLabels(itemId: string): void {
		const lowestPost = this.getLowestPricePost(itemId);
		const postsForItem = this.getPostsByItem(itemId);

		postsForItem.forEach(post => {
			const postItem = this.timelineItems.find(item => (item as any).postId === post.id);
			if (postItem) {
				this.updatePostCheapestLabel(postItem, post, lowestPost?.id === post.id);
			}
		});
	}

	/**
	 * Updates the cheapest price label for a specific post
	 * @param postItem The timeline item to update
	 * @param sharedPost The shared post data
	 * @param isCheapest Whether this post is the cheapest
	 */
	private updatePostCheapestLabel(postItem: g.E, sharedPost: SharedPostData, isCheapest: boolean): void {
		// Find the action text label by searching for the first Label that contains the item name
		let actionTextLabel: g.Label | null = null;
		if (postItem.children) {
			for (const child of postItem.children) {
				if (child instanceof g.Label && child.text.includes(sharedPost.item.name)) {
					actionTextLabel = child;
					break;
				}
			}
		}

		if (actionTextLabel) {
			// Check if this is a self-posted item
			const currentPlayerId = this.onGetPlayerId ? this.onGetPlayerId() : null;
			const isSelfPosted = currentPlayerId && sharedPost.sharerId === currentPlayerId;

			// Rebuild action text with or without cheapest label
			const baseActionText = isSelfPosted
				? `${sharedPost.item.emoji}${sharedPost.item.name}をシェアしました`
				: `${sharedPost.item.emoji}${sharedPost.item.name}が今だけ`;
			const newActionText = isCheapest ? `${baseActionText} [最安値]` : baseActionText;

			// Update text content only
			actionTextLabel.text = newActionText;
			actionTextLabel.invalidate();
		}
	}

	/**
	 * Updates cheapest price labels for all items
	 */
	private updateAllCheapestPriceLabels(): void {
		// Get unique item IDs from all shared posts
		const itemIds = new Set(this.sharedPosts.map(post => post.item.id));

		// Update labels for each item
		itemIds.forEach(itemId => {
			this.updateCheapestPriceLabels(itemId);
		});
	}

	/**
	 * Determines if a purchase count change should trigger a resort
	 * @param post The post that was updated
	 * @param oldCount The old purchase count
	 * @returns True if resort should be triggered
	 */
	private shouldTriggerResort(post: SharedPostData, oldCount: number): boolean {
		const newCount = post.purchaseCount;

		// Resort if this post might have moved up significantly
		if (newCount >= 5 && oldCount < 5) return true; // Border appearance change
		if (newCount >= 10 && oldCount < 10) return true; // Border color change

		// Check if this post might have overtaken others in sort order
		const postsWithHigherCounts = this.sharedPosts.filter(p =>
			p.id !== post.id && p.purchaseCount <= newCount
		);

		// Resort if this post could potentially move up in ranking
		return postsWithHigherCounts.length > 0;
	}

	/**
	 * Requests a smart resort with cooldown protection
	 */
	private requestSmartResort(): void {
		this.needsResort = true;

		// Check cooldown
		const currentTime = this.scene.game.age;
		if (currentTime - this.lastSortTime < this.RESORT_COOLDOWN) {
			// Schedule for later if not already scheduled
			if (!this.resortTimer) {
				const remainingCooldown = this.RESORT_COOLDOWN - (currentTime - this.lastSortTime);
				this.resortTimer = this.scene.setTimeout(() => {
					this.resortTimer = undefined;
					if (this.needsResort) {
						this.executeSmartResort();
					}
				}, remainingCooldown);
			}
			return;
		}

		// Execute immediately if cooldown has passed
		this.executeSmartResort();
	}

	/**
	 * Gets shared posts sorted by purchase count (descending)
	 * @returns Array of shared posts sorted by purchase frequency
	 */
	private getSortedPostsByPurchaseCount(): SharedPostData[] {
		return [...this.sharedPosts].sort((a, b) => {
			// Sort by purchase count (descending), then by share time (newest first)
			if (b.purchaseCount !== a.purchaseCount) {
				return b.purchaseCount - a.purchaseCount;
			}
			return b.sharedAt - a.sharedAt;
		});
	}

	/**
	 * Executes smart resort with slide animation
	 */
	private executeSmartResort(): void {
		if (this.isAnimating || this.timelineItems.length === 0) {
			return;
		}

		this.needsResort = false;
		this.lastSortTime = this.scene.game.age;

		// Get current order and desired order
		const currentOrder = this.getCurrentPostOrder();
		const sortedPosts = this.getSortedPostsByPurchaseCount();
		const desiredOrder = sortedPosts.map(post => post.id);

		// Check if reordering is actually needed
		if (this.arraysEqual(currentOrder, desiredOrder)) {
			return;
		}

		// Animate the reordering
		this.animatePostReorder(currentOrder, desiredOrder);
	}

	/**
	 * Gets the current order of posts by their IDs
	 * @returns Array of post IDs in current display order
	 */
	private getCurrentPostOrder(): string[] {
		return this.timelineItems
			.filter(item => (item as any).postId)
			.map(item => (item as any).postId);
	}

	/**
	 * Checks if two arrays are equal
	 * @param arr1 First array
	 * @param arr2 Second array
	 * @returns True if arrays are equal
	 */
	private arraysEqual(arr1: string[], arr2: string[]): boolean {
		if (arr1.length !== arr2.length) return false;
		return arr1.every((value, index) => value === arr2[index]);
	}

	/**
	 * Animates post reordering with smooth slide transitions
	 * @param currentOrder Current order of post IDs
	 * @param desiredOrder Desired order of post IDs
	 */
	private animatePostReorder(currentOrder: string[], desiredOrder: string[]): void {
		if (currentOrder.length === 0 || desiredOrder.length === 0) return;

		this.isAnimating = true;

		// Create mapping from post ID to timeline item
		const postItems = new Map<string, g.E>();
		this.timelineItems.forEach(item => {
			const postId = (item as any).postId;
			if (postId) {
				postItems.set(postId, item);
			}
		});

		// Calculate new positions for each post
		const moveAnimations: Array<{ item: g.E; newY: number }> = [];

		desiredOrder.forEach((postId, newIndex) => {
			const item = postItems.get(postId);
			if (item) {
				const newY = newIndex * 90 + this.scrollOffset;
				if (Math.abs(item.y - newY) > 1) { // Only animate if position actually changes
					moveAnimations.push({ item, newY });
				}
			}
		});

		// If no animations needed, complete immediately
		if (moveAnimations.length === 0) {
			this.isAnimating = false;
			return;
		}

		// Create timeline for animations
		const timeline = new Timeline(this.scene);

		// Animate all position changes simultaneously
		moveAnimations.forEach(({ item, newY }) => {
			timeline.create(item).to({ y: newY }, ANIMATION_CONFIG.POST_SHIFT_DURATION);
		});

		// Complete animation
		timeline.create(this)
			.wait(ANIMATION_CONFIG.POST_SHIFT_DURATION)
			.call(() => {
				// Update the timeline items array to match new order
				this.reorderTimelineItems(desiredOrder, postItems);
				this.isAnimating = false;
			});
	}

	/**
	 * Reorders the timelineItems array to match the new post order
	 * @param desiredOrder The desired order of post IDs
	 * @param postItems Map from post ID to timeline item
	 */
	private reorderTimelineItems(desiredOrder: string[], postItems: Map<string, g.E>): void {
		const reorderedItems: g.E[] = [];

		// Add posts in new order
		desiredOrder.forEach(postId => {
			const item = postItems.get(postId);
			if (item) {
				reorderedItems.push(item);
			}
		});

		// Add non-post items (guide items) at the end
		this.timelineItems.forEach(item => {
			if (!(item as any).postId) {
				reorderedItems.push(item);
			}
		});

		this.timelineItems = reorderedItems;
	}

	/**
	 * Starts batch processing timer
	 */
	private startBatchProcessing(): void {
		this.batchTimer = this.scene.setTimeout(() => {
			this.processBatchedPosts();
		}, 3000); // 3 second delay for batching posts to reduce frequent updates
	}

	/**
	 * Processes all batched posts with improved animation
	 */
	private processBatchedPosts(): void {
		if (this.batchProcessing || this.batchPendingPosts.length === 0) {
			return;
		}

		this.batchProcessing = true;
		this.batchTimer = undefined;

		// Get posts to process
		const postsToProcess = [...this.batchPendingPosts];
		this.batchPendingPosts = [];

		// Add all posts to data structure first
		this.sharedPosts.unshift(...postsToProcess);

		// Only animate if timeline is visible
		if (this.opacity > 0) {
			this.animateBatchedPosts(postsToProcess);
		} else {
			// Timeline is hidden, add posts without animation
			this.addBatchedPostsSilently(postsToProcess);
			this.batchProcessing = false;

			// Check if there are pending posts that need to be processed
			if (this.batchPendingPosts.length > 0 && !this.batchTimer) {
				this.startBatchProcessing();
			}
		}
	}

	/**
	 * Animates multiple posts being added with staggered timing
	 */
	private animateBatchedPosts(posts: SharedPostData[]): void {
		// Disable scrolling during animation
		this.isAnimating = true;

		// Create loading overlay during animation
		this.createTimelineLoadingOverlay();

		// Only add new posts without recreating existing ones
		this.addNewPostsWithAnimation(posts);
	}

	/**
	 * Adds new posts with animation while preserving existing posts
	 * @param newPosts Array of new posts to add
	 */
	private addNewPostsWithAnimation(newPosts: SharedPostData[]): void {
		// Create timeline for animations
		const timeline = new Timeline(this.scene);

		// First, shift existing posts down by the number of new posts
		const shiftDistance = newPosts.length * 90;
		this.timelineItems.forEach((item) => {
			const newY = item.y + shiftDistance;
			timeline.create(item).to({ y: newY }, ANIMATION_CONFIG.POST_SHIFT_DURATION);
		});

		// After shift animation, create and fade in new posts
		timeline.create(this).wait(ANIMATION_CONFIG.POST_SHIFT_DURATION).call(() => {
			this.createAndInsertNewPosts(newPosts);
		});
	}

	/**
	 * Creates and inserts new posts at the top with fade-in animation
	 * @param newPosts Array of new posts to create
	 */
	private createAndInsertNewPosts(newPosts: SharedPostData[]): void {
		const newItems: g.E[] = [];

		// Create new posts with opacity 0 for fade-in effect
		newPosts.forEach((post, index) => {
			const postY = index * 90 + this.scrollOffset;
			const newPost = this.createAffiliateTimelineItem(post, 0, postY);
			newPost.opacity = 0;
			newPost.modified();
			newItems.push(newPost);
		});

		// Insert new items at the beginning of the timeline
		this.timelineItems.unshift(...newItems);

		// If no posts to animate, complete immediately
		if (newItems.length === 0) {
			this.completeBatchAnimation();
			return;
		}

		// Fade in new posts simultaneously
		const fadeTimeline = new Timeline(this.scene);
		newItems.forEach(newPost => {
			fadeTimeline.create(newPost)
				.wait(ANIMATION_CONFIG.POST_FADE_IN_DELAY)
				.to({ opacity: 1 }, ANIMATION_CONFIG.POST_FADE_IN_DURATION);
		});

		// Complete batch animation when fade-in finishes
		fadeTimeline.create(this)
			.wait(ANIMATION_CONFIG.POST_FADE_IN_DELAY + ANIMATION_CONFIG.POST_FADE_IN_DURATION)
			.call(() => {
				this.completeBatchAnimation();
			});
	}


	/**
	 * Adds batched posts without animation (when timeline is hidden)
	 */
	private addBatchedPostsSilently(posts: SharedPostData[]): void {
		posts.forEach((post, index) => {
			const postY = index * 90 + this.scrollOffset;
			const newPost = this.createAffiliateTimelineItem(post, 0, postY);
			this.timelineItems.unshift(newPost);
		});

		// Shift all existing posts down
		this.timelineItems.forEach((item, index) => {
			if (index >= posts.length) {
				item.y = index * 90 + this.scrollOffset;
				item.modified();
			}
		});
	}

	/**
	 * Completes batch animation processing
	 */
	private completeBatchAnimation(): void {
		this.isAnimating = false;
		this.batchProcessing = false;
		this.destroyTimelineLoadingOverlay();

		// Update max scroll offset to account for new content
		this.updateMaxScrollOffset();

		// Update cheapest price labels for all items after batch processing
		this.updateAllCheapestPriceLabels();

		// Check if there are pending posts that need to be processed
		if (this.batchPendingPosts.length > 0 && !this.batchTimer) {
			this.startBatchProcessing();
		}
	}

	/**
	 * Updates the maximum scroll offset based on current content
	 */
	private updateMaxScrollOffset(): void {
		if (!this.scrollContainer) return;

		const totalContentHeight = this.timelineItems.length * 90;
		const containerHeight = this.scrollContainer.height;
		this.maxScrollOffset = Math.max(0, totalContentHeight - containerHeight);
	}

	/**
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, screenHeight: number): LayoutConfig {
		return {
			x: screenWidth - 720, // Fixed internal positioning
			y: 149, // Below header(69) + item list(60) + margin(20) = 149
			width: 700,
			height: screenHeight - 169, // Bottom: margin(20) from screen bottom
			children: {
				header: {
					x: 0,
					y: 0,
					width: 700,
					height: 35,
					children: {
						title: { x: 0, y: 0, width: 150, height: 20 }
					}
				},
				item: {
					x: 0,
					y: 35,
					width: 700,
					height: 90,
					children: {
						avatar: { x: 5, y: 30, width: 30, height: 30 },
						userName: { x: 40, y: 5, width: 460, height: 18 },
						actionText: { x: 40, y: 28, width: 460, height: 24 },
						priceText: { x: 40, y: 57, width: 460, height: 28 },
						buyBtn: { x: 510, y: 5, width: 120, height: 80 }
					}
				}
			}
		};
	}

	/**
	 * Creates the overall layout structure
	 */
	private createLayout(): void {
		this.createHeader();
		this.createScrollableContainer();
		this.createTimelineItems();
	}


	/**
	 * Handles scroll start
	 */
	private handleScrollStart(ev: g.PointDownEvent): void {
		if (this.isAnimating) {
			return;
		}
		this.isScrolling = true;
		this.lastScrollY = this.scrollOffset;
	}

	/**
	 * Handles scroll movement
	 */
	private handleScrollMove(ev: g.PointMoveEvent): void {
		if (!this.isScrolling || !this.scrollContainer || this.isAnimating) {
			return;
		}
		const oldScrollOffset = this.scrollOffset;
		const newScrollOffset = this.lastScrollY + ev.startDelta.y;

		// Clamp scroll offset (negative values scroll down, positive scroll up)
		const clampedScrollOffset = Math.max(-this.maxScrollOffset, Math.min(newScrollOffset, 0));

		// Round scroll offset to prevent micro-movements
		const roundedScrollOffset = Math.round(clampedScrollOffset);


		// Only update if scroll offset actually changed significantly
		if (Math.abs(oldScrollOffset - roundedScrollOffset) < 1) {
			return;
		}

		// Update scroll offset
		this.scrollOffset = roundedScrollOffset;

		// Update all timeline items position based on scroll offset
		this.timelineItems.forEach((item, index) => {
			const oldY = item.y;
			// Update item position based on index and scroll offset
			const newY = index * 90 + this.scrollOffset;

			// Only update if position actually changed
			if (Math.abs(oldY - newY) >= 1) {
				item.y = newY;
				item.modified();
			}
		});
	}

	/**
	 * Handles scroll end
	 */
	private handleScrollEnd(ev: g.PointUpEvent): void {
		this.isScrolling = false;
	}

	/**
	 * Creates the timeline header
	 */
	private createHeader(): void {
		const headerLayout = this.layout.children!.header;
		const titleLayout = headerLayout.children!.title;

		// Timeline header
		const timelineTitle = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 20,
				fontColor: "white",
				strokeColor: "black",
				strokeWidth: 3
			}),
			text: "タイムライン",
			x: this.layout.x + titleLayout.x,
			y: this.layout.y + titleLayout.y,
		});
		this.append(timelineTitle);
	}

	/**
	 * Creates a scrollable container for timeline content
	 */
	private createScrollableContainer(): void {
		// Create scrollable container that clips content
		this.scrollContainer = new g.Pane({
			scene: this.scene,
			width: this.layout.width,
			height: this.layout.height - 35, // Subtract header height
			x: this.layout.x,
			y: this.layout.y + 35, // Position below header
			touchable: true,
			local: true
		});

		// Add scroll event handling
		this.scrollContainer.onPointDown.add((ev) => this.handleScrollStart(ev));
		this.scrollContainer.onPointMove.add((ev) => this.handleScrollMove(ev));
		this.scrollContainer.onPointUp.add((ev) => this.handleScrollEnd(ev));

		this.append(this.scrollContainer);
	}

	/**
	 * Adds a post silently without animation to preserve existing timeline content
	 */
	private addPostSilently(): void {
		// Create new post at the top position
		const newPostY = this.scrollOffset;
		const newPost = this.createAffiliateTimelineItem(this.sharedPosts[0], 0, newPostY);

		// Shift all existing posts down by updating their base positions
		this.timelineItems.forEach((item, index) => {
			// Update item position based on index
			item.y = (index + 1) * 90 + this.scrollOffset;
			item.modified();
		});

		// Add new post to beginning
		this.timelineItems.unshift(newPost);

		// Add to scroll container
		this.scrollContainer!.append(newPost);

		// Update max scroll offset to account for new content
		this.updateMaxScrollOffset();
	}

	/**
	 * Refreshes the timeline display (for testing only)
	 * @deprecated Use animateNewPost() for production code
	 */
	private refreshTimeline(): void {
		// Clear affiliate button references
		this.affiliateButtons.clear();

		// Clear timeline items array
		this.timelineItems = [];

		// Remove all timeline items except the first one (header)
		if (this.children && this.children.length > 0) {
			const childrenToRemove = this.children.slice(1); // All except first
			childrenToRemove.forEach(child => {
				child.destroy();
			});
		}

		this.createTimelineItems();
	}

	/**
	 * Creates timeline items
	 */
	private createTimelineItems(): void {
		const defaultItems = [
			{ user: "[ガイド]", action: "📱 タイムラインでは他のプレイヤーが\nシェアした商品を購入できます",
				reactions: { like: true, comment: true } },
			{ user: "[ガイド]", action: "💰 アフィリエイト機能で商品をシェアして、\n購入されるとポイント獲得！", reactions: { like: true, comment: true } },
			{ user: "[ガイド]", action: "🛒 商品をどんどんシェアして、\nアフィリエイト報酬を得ましょう！", reactions: { like: true, comment: true } },
			{ user: "[ガイド]", action: "💹 商品の価格は変化しますが、シェアされた商品は\nそのときの価格で購入できます", reactions: { like: true, comment: true } },
		];

		let itemIndex = 0;

		// Sort shared posts by purchase count (descending) before displaying
		const sortedPosts = this.getSortedPostsByPurchaseCount();

		// Add sorted shared posts first
		sortedPosts.forEach((sharedPost) => {
			const itemY = itemIndex * 90; // Relative to scroll container
			const postItem = this.createAffiliateTimelineItem(sharedPost, 0, itemY); // X is 0 relative to container
			this.timelineItems.push(postItem);
			itemIndex++;
		});

		// Add default items
		defaultItems.forEach((item) => {
			const itemY = itemIndex * 90; // Relative to scroll container
			const postItem = this.createTimelineItem(item.user, item.action, item.reactions, 0, itemY); // X is 0 relative to container
			this.timelineItems.push(postItem);
			itemIndex++;
		});

		// Add all timeline items to scroll container
		this.timelineItems.forEach(item => {
			this.scrollContainer!.append(item);
		});

		// Calculate max scroll offset based on content height
		this.updateMaxScrollOffset();
	}

	/**
	 * Creates an affiliate timeline item for shared products
	 */
	private createAffiliateTimelineItem(sharedPost: SharedPostData, x: number, y: number): g.E {
		const itemLayout = this.layout.children!.item;
		const avatarLayout = itemLayout.children!.avatar;
		const userNameLayout = itemLayout.children!.userName;
		const actionTextLayout = itemLayout.children!.actionText;
		const priceTextLayout = itemLayout.children!.priceText;
		const buyBtnLayout = itemLayout.children!.buyBtn;

		// Check if this is a self-posted item
		const currentPlayerId = this.onGetPlayerId ? this.onGetPlayerId() : null;
		const isSelfPosted = currentPlayerId && sharedPost.sharerId === currentPlayerId;

		// Create container for the post
		const postContainer = new g.E({
			scene: this.scene,
			width: itemLayout.width,
			height: itemLayout.height,
			x: x,
			y: y,
		});

		// Store postId for later reference
		(postContainer as any).postId = sharedPost.id;

		const borderColor = this.getBorderColor(sharedPost.purchaseCount);

		// Post border
		const postBorder = new g.FilledRect({
			scene: this.scene,
			width: itemLayout.width,
			height: itemLayout.height,
			x: 0,
			y: 0,
			cssColor: borderColor,
		});
		postContainer.append(postBorder);

		// Post background for visibility
		const postBackground = new g.FilledRect({
			scene: this.scene,
			width: itemLayout.width - 10,
			height: itemLayout.height - 10,
			x: 5,
			y: 5,
			cssColor: "white",
		});
		postContainer.append(postBackground);

		// User avatar (circle) - different color for self-posted
		const avatarBackground = new g.FilledRect({
			scene: this.scene,
			width: avatarLayout.width,
			height: avatarLayout.height,
			x: avatarLayout.x,
			y: avatarLayout.y,
			cssColor: isSelfPosted ? "#95a5a6" : "#ffe082", // Gray for self-posted, amber for others
		});
		postContainer.append(avatarBackground);

		const avatar = new g.Label({
			scene: this.scene,
			font: this.avatarFont,
			text: sharedPost.sharerAvatar || "😀", // Default avatar if undefined
			x: avatarLayout.x + avatarBackground.width / 2,
			y: avatarLayout.y + avatarBackground.height / 2,
			anchorX: 0.5,
			anchorY: 0.5
		});
		postContainer.append(avatar);

		// User name
		const userName = new g.Label({
			scene: this.scene,
			font: this.userNameFont,
			text: (sharedPost.sharerName || "unknown") + (isSelfPosted ? " (あなた)" : ""),
			x: userNameLayout.x,
			y: userNameLayout.y,
		});
		postContainer.append(userName);

		// Check if this is the lowest price post for this item
		const isLowestPrice = this.isLowestPricePost(sharedPost);

		// Action text - different for self-posted items, with cheapest price label
		const baseActionText = isSelfPosted
			? `${sharedPost.item.emoji}${sharedPost.item.name}をシェアしました`
			: `${sharedPost.item.emoji}${sharedPost.item.name}が今だけ`;
		const actionTextContent = isLowestPrice ? `${baseActionText} [最安値]` : baseActionText;

		const actionText = new g.Label({
			scene: this.scene,
			font: isSelfPosted ? this.disabledStyleActionFont : this.enabledStyleActionFont,
			text: actionTextContent,
			x: actionTextLayout.x,
			y: actionTextLayout.y,
			width: actionTextLayout.width,
		});
		postContainer.append(actionText);

		// Price text - muted styling for self-posted items, no longer contains cheapest label
		const priceText = new g.Label({
			scene: this.scene,
			font: isSelfPosted ? this.disabledStylePriceFont : this.enabledStylePriceFont,
			text: `限定: ${sharedPost.sharedPrice}pt`,
			x: priceTextLayout.x,
			y: priceTextLayout.y,
		});
		postContainer.append(priceText);

		const priceSuffixText = new g.Label({
			scene: this.scene,
			font: isSelfPosted ? this.disabledStylePriceSuffixFont : this.enabledStylePriceSuffixFont,
			text: `(定価: ${sharedPost.item.purchasePrice}pt, ${sharedPost.purchaseCount}人が購入)`,
			x: priceText.x + priceText.width + 10, // Position after price text
			y: priceText.y + priceText.height,
			anchorY: 1, // Align to bottom of price text
		});

		postContainer.append(priceSuffixText);

		// Only show buy button for non-self-posted items
		if (!isSelfPosted) {
			// Check if player already owns this item
			const isAlreadyOwned = this.onCheckOwnership && this.onCheckOwnership(sharedPost.item.id);

			// Buy button for affiliate purchase
			const buyButton = new LabelButtonE({
				scene: this.scene,
				multi: this.multi,
				name: `affiliate_buy_${sharedPost.id}`,
				args: sharedPost.id,
				text: isAlreadyOwned ? "所持済" : "購入",
				width: buyBtnLayout.width,
				height: buyBtnLayout.height,
				x: buyBtnLayout.x,
				y: buyBtnLayout.y,
				backgroundColor: isAlreadyOwned ? "#95a5a6" : "#e67e22",
				textColor: "white",
				fontSize: 24,
				onComplete: (postId: string) => this.handleAffiliatePurchase(postId)
			});

			// Disable button if already owned
			if (isAlreadyOwned) {
				buyButton.touchable = false;
			}

			this.affiliateButtons.set(sharedPost.id, buyButton);
			postContainer.append(buyButton);
		}

		// Append container to scroll container and return it
		this.scrollContainer!.append(postContainer);
		return postContainer;
	}

	/**
	 * Handles affiliate purchase
	 * @param postId The shared post ID
	 */
	private handleAffiliatePurchase(postId: string): void {
		const sharedPost = this.sharedPosts.find(post => post.id === postId);
		if (!sharedPost) {
			console.error(`Shared post not found: ${postId}`);
			return;
		}

		// Check for duplicate purchase attempt (button already disabled)
		const affiliateButton = this.affiliateButtons.get(postId);
		if (affiliateButton && !affiliateButton.touchable) {
			this.showErrorModal("重複処理エラー", "この商品の購入は既に処理中です。\nしばらくお待ちください。", postId);
			return;
		}

		// Get current player ID
		const currentPlayerId = this.onGetPlayerId ? this.onGetPlayerId() : null;

		// Prevent self-purchases for fairness
		if (currentPlayerId && sharedPost.sharerId === currentPlayerId) {
			this.showErrorModal("購入不可", "自分の投稿した商品は購入できません。", postId);
			return;
		}

		// Check if player already owns this item
		if (this.onCheckOwnership && this.onCheckOwnership(sharedPost.item.id)) {
			this.showErrorModal("購入済み", "この商品は既に所持しています。", postId);
			return;
		}

		// Check if player has enough points
		if (this.onCheckPoints) {
			const currentPoints = this.onCheckPoints();
			if (currentPoints < sharedPost.sharedPrice) {
				this.showErrorModal("ポイント不足", `購入に必要なポイントが不足しています。\n必要: ${sharedPost.sharedPrice}pt\n現在: ${currentPoints}pt`, postId);
				return;
			}
		}

		// Deduct points for the purchase
		if (this.onDeductPoints) {
			this.onDeductPoints(sharedPost.sharedPrice);
		}

		// Add item to inventory
		if (!this.itemManager.purchaseItem(sharedPost.item.id)) {
			this.showErrorModal("購入エラー", "アイテムの購入に失敗しました。\n再度お試しください。", postId);
			return;
		}

		if (this.onItemPurchased) {
			this.onItemPurchased(sharedPost.item);
		}

		// Note: Don't increment purchase count locally here as it will be updated via broadcast message
		// This prevents double-counting when the buyer receives their own broadcast

		// Calculate affiliate reward using configured rate
		const affiliateReward = Math.floor(sharedPost.sharedPrice * AFFILIATE_CONFIG.REWARD_RATE);

		// Broadcast affiliate purchase to all players for reward and count tracking
		const buyerName = this.onGetPlayerName ? this.onGetPlayerName() : AFFILIATE_CONFIG.TIMELINE.DEFAULT_PLAYER_NAME;

		const purchaseMessage: AffiliatePurchaseMessage = {
			postId: postId,
			buyerId: currentPlayerId ?? DUMMY_ID_FOR_ACTIVE_INSTANCE,
			buyerName: buyerName,
			sharerId: sharedPost.sharerId, // Use sharerId instead of sharerName for proper ID comparison
			rewardPoints: affiliateReward
		};

		const message = {
			type: "affiliatePurchase",
			purchaseData: purchaseMessage
		};

		this.scene.game.raiseEvent(new g.MessageEvent(message));

		// Disable the buy button after purchase and update visual state
		const buyButton = this.affiliateButtons.get(postId);
		if (buyButton) {
			buyButton.touchable = false;
			// Update button appearance to indicate purchased state
			buyButton.setBackgroundColor("#95a5a6"); // Gray color for disabled
			buyButton.setTextColor("#7f8c8d"); // Darker gray text
			// Note: LabelButtonE setText method might not exist, keeping text as is
		}

		// Update all buttons for this item (in case multiple posts share the same item)
		this.updateAllButtonsForItem(sharedPost.item.id);

		// Update purchase count display without destroying children
		this.updatePurchaseCount(postId);

		// Show success modal consistent with shop purchase behavior
		this.showSuccessModal(sharedPost.item, sharedPost.sharedPrice);
	}

	/**
	 * Creates a single timeline item
	 */
	private createTimelineItem(user: string, action: string, reactions: any, x: number, y: number): g.E {
		const itemLayout = this.layout.children!.item;
		const avatarLayout = itemLayout.children!.avatar;
		const userNameLayout = itemLayout.children!.userName;
		const actionTextLayout = itemLayout.children!.actionText;

		// Create container for the post
		const postContainer = new g.E({
			scene: this.scene,
			width: itemLayout.width,
			height: itemLayout.height,
			x: x,
			y: y,
		});

		const borderColor = this.getBorderColor(0); // Default border color

		// Post border
		const postBorder = new g.FilledRect({
			scene: this.scene,
			width: itemLayout.width,
			height: itemLayout.height,
			x: 0,
			y: 0,
			cssColor: borderColor,
		});
		postContainer.append(postBorder);

		// Post background for visibility
		const postBackground = new g.FilledRect({
			scene: this.scene,
			width: itemLayout.width - 10,
			height: itemLayout.height - 10,
			x: 5,
			y: 5,
			cssColor: "white",
		});
		postContainer.append(postBackground);

		// User avatar (circle)
		const avatar = new g.FilledRect({
			scene: this.scene,
			width: avatarLayout.width,
			height: avatarLayout.height,
			x: avatarLayout.x,
			y: avatarLayout.y,
			cssColor: "#ecf0f1",
		});
		postContainer.append(avatar);

		// User name
		const userName = new g.Label({
			scene: this.scene,
			font: this.userNameFont,
			text: user,
			x: userNameLayout.x,
			y: userNameLayout.y,
		});
		postContainer.append(userName);

		// Action text
		action.split("\n").map((text, i) => {
			const actionText = new g.Label({
				scene: this.scene,
				font: this.enabledStyleActionFont,
				text: text,
				x: actionTextLayout.x,
				y: actionTextLayout.y + i * (actionTextLayout.height + 5),
				width: actionTextLayout.width,
			});
			postContainer.append(actionText);
		});

		// Append container to scroll container and return it
		this.scrollContainer!.append(postContainer);
		return postContainer;
	}

	/**
	 * Shows an error modal with button reactivation
	 */
	private showErrorModal(title: string, message: string, postId: string): void {
		// Close existing modal if present
		if (this.currentModal) {
			this.currentModal.destroy();
		}

		this.currentModal = new ModalE({
			scene: this.scene,
			multi: this.multi,
			name: `error_modal_${postId}`,
			args: null,
			title: title,
			message: message,
			onClose: () => {
				// Reactivate the purchase button for retry
				const button = this.affiliateButtons.get(postId);
				if (button) {
					button.reactivate();
				}
				this.currentModal = undefined;
			}
		});

		this.scene.append(this.currentModal);
	}

	/**
	 * Shows success modal for affiliate purchase (consistent with shop behavior)
	 */
	private showSuccessModal(item: ItemData, price: number): void {
		const successMessage = `アフィリエイト商品を購入しました！\n\n${item.emoji} ${item.name}\n価格: ${price}pt`;

		// Close existing modal if present
		if (this.currentModal) {
			this.currentModal.destroy();
		}

		this.currentModal = new ModalE({
			scene: this.scene,
			multi: this.multi,
			name: `success_modal_${item.id}`,
			args: null,
			title: "購入完了",
			message: successMessage,
			onClose: () => {
				// No reactivation needed for success modal
				this.currentModal = undefined;
			}
		});

		this.scene.append(this.currentModal);
	}

	/**
	 * Updates all purchase buttons for a specific item ID (when item is purchased from any source)
	 */
	private updateAllButtonsForItem(itemId: string): void {
		this.sharedPosts.forEach(post => {
			if (post.item.id === itemId) {
				const button = this.affiliateButtons.get(post.id);
				if (button) {
					button.touchable = false;
					button.setBackgroundColor("#95a5a6"); // Gray color for disabled
					button.setTextColor("#7f8c8d"); // Darker gray text
					button.setText("所持済"); // Update text to indicate already owned
				}
			}
		});
	}


	/**
	 * Updates purchase count display for a specific post without recreating
	 * Shows purchase count for all posts to encourage affiliate activity
	 */
	private updatePurchaseCount(postId: string): void {
		// Find the shared post
		const sharedPost = this.sharedPosts.find(post => post.id === postId);
		if (!sharedPost) return;

		// Find the corresponding timeline item by searching for the one with matching postId in its tag
		const postItem = this.timelineItems.find(item => (item as any).postId === postId);
		if (postItem) {
			// Update price suffix text to reflect new purchase count
			const priceSuffixTextLabel = postItem.children && postItem.children[7]; // Assuming price suffix is 8th child
			if (priceSuffixTextLabel && priceSuffixTextLabel instanceof g.Label) {
				const newText = `(定価: ${sharedPost.item.purchasePrice}pt, ${sharedPost.purchaseCount}人が購入)`;
				priceSuffixTextLabel.text = newText;
				priceSuffixTextLabel.invalidate();
			}

			// Update border styling if purchase count thresholds are crossed
			this.updatePostBorderStyling(postItem, sharedPost);
		}
	}

	/**
	 * Updates border styling for a post based on purchase count
	 * @param postItem The timeline item to update
	 * @param sharedPost The shared post data
	 */
	private updatePostBorderStyling(postItem: g.E, sharedPost: SharedPostData): void {
		// Find the border element (first child if exists)
		const firstChild = postItem.children && postItem.children[0];
		if (firstChild && firstChild instanceof g.FilledRect) {
		// Check if border styling needs to be updated
			const borderColor = this.getBorderColor(sharedPost.purchaseCount);

			// Update existing border color
			firstChild.cssColor = borderColor;
			firstChild.modified();
		}
	}

	/**
	 * Creates loading overlay for timeline operations
	 */
	private createTimelineLoadingOverlay(): void {
		if (this.loadingOverlay) {
			return; // Already exists
		}

		// Create overlay covering timeline area
		this.loadingOverlay = new g.E({
			scene: this.scene,
			width: this.layout.width,
			height: this.layout.height,
			x: this.layout.x,
			y: this.layout.y,
			touchable: true,
			local: true,
		});

		// Semi-transparent background
		const background = new g.FilledRect({
			scene: this.scene,
			width: this.layout.width,
			height: this.layout.height,
			cssColor: "rgba(0,0,0,0.3)",
		});
		this.loadingOverlay.append(background);

		// Loading indicator
		const loadingIcon = new g.FilledRect({
			scene: this.scene,
			width: 30,
			height: 30,
			cssColor: "#3498db",
			x: this.layout.width / 2 - 15,
			y: this.layout.height / 2 - 15,
		});
		this.loadingOverlay.append(loadingIcon);

		// Add rotation animation
		let rotation = 0;
		const rotationHandler = (): void => {
			rotation += 5;
			if (rotation >= 360) rotation = 0;
			loadingIcon.angle = rotation * Math.PI / 180;
			loadingIcon.modified();
		};
		this.scene.onUpdate.add(rotationHandler);

		// Loading text
		const loadingText = new g.Label({
			scene: this.scene,
			font: this.loadingFont,
			text: "更新中...",
			x: this.layout.width / 2 - 25,
			y: this.layout.height / 2 + 20,
		});
		this.loadingOverlay.append(loadingText);

		// Append to timeline
		this.append(this.loadingOverlay);
	}

	/**
	 * Destroys the timeline loading overlay
	 */
	private destroyTimelineLoadingOverlay(): void {
		if (this.loadingOverlay) {
			this.loadingOverlay.destroy();
			this.loadingOverlay = undefined;
		}
	}

	/**
	 * // Determine border styling based on purchase count
	 * @param purchaseCount The number of purchases for the item
	 */
	private getBorderColor(purchaseCount: number): string  {
		if (purchaseCount >= 10) return "#ffd700"; // Gold border for 10+ purchases
		if (purchaseCount >= 5) return "#c0c0c0";  // Silver border for 5+ purchases
		return "#eeeeee"; // Default light gray border
	};
}
