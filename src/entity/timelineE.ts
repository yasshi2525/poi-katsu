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
	BATCH_POST_STAGGER: 150, // 複数投稿の段階的アニメーション間隔
	BATCH_POST_MAX_SHOW: 3, // 一度に表示アニメーションする最大投稿数
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

	/**
	 * Creates a new Timeline instance
	 * @param options Configuration options for the timeline
	 */
	constructor(options: TimelineParameterObject) {
		super(options);

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
	 * Increments the purchase count for a specific shared post
	 * @param postId The ID of the post to update
	 */
	incrementPurchaseCount(postId: string): void {
		const sharedPost = this.sharedPosts.find(post => post.id === postId);
		if (sharedPost) {
			sharedPost.purchaseCount++;
			this.updatePurchaseCount(postId); // Update display without destroying children
		}
	}

	/**
	 * External callback for item purchases from other sources (shop, etc.)
	 */
	onItemPurchasedExternal(item: ItemData): void {
		this.updateAllButtonsForItem(item.id);
	}

	/**
	 * Starts batch processing timer
	 */
	private startBatchProcessing(): void {
		this.batchTimer = this.scene.setTimeout(() => {
			this.processBatchedPosts();
		}, ANIMATION_CONFIG.BATCH_POST_STAGGER);
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

		// Get posts to process (in reverse order for proper timeline placement)
		const postsToProcess = this.batchPendingPosts.reverse();
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

		// Create timeline for batch animation
		const timeline = new Timeline(this.scene);

		// First, shift existing posts down by the number of new posts
		const shiftDistance = posts.length * 90; // 90px per post
		this.timelineItems.forEach((item) => {
			const newY = item.y + shiftDistance;
			timeline.create(item).to({ y: newY }, ANIMATION_CONFIG.POST_SHIFT_DURATION);
		});

		// After shift animation, create and fade in new posts with staggered timing
		timeline.create(this).wait(ANIMATION_CONFIG.POST_SHIFT_DURATION).call(() => {
			this.addBatchedPostsWithStagger(posts);
		});
	}

	/**
	 * Adds batched posts with staggered fade-in animation
	 */
	private addBatchedPostsWithStagger(posts: SharedPostData[]): void {
		// Limit the number of posts that get animated to prevent overwhelming the UI
		const postsToAnimate = posts.slice(0, ANIMATION_CONFIG.BATCH_POST_MAX_SHOW);
		const postsToAddSilently = posts.slice(ANIMATION_CONFIG.BATCH_POST_MAX_SHOW);

		// Add non-animated posts silently first
		postsToAddSilently.forEach((post, index) => {
			const postY = index * 90 + this.scrollOffset;
			const newPost = this.createAffiliateTimelineItem(post, index, postY);
			this.timelineItems.unshift(newPost);
		});

		// Animate the remaining posts with staggered timing
		postsToAnimate.forEach((post, index) => {
			const delay = index * ANIMATION_CONFIG.BATCH_POST_STAGGER;
			const postIndex = postsToAddSilently.length + index;
			this.scene.setTimeout(() => {
				const postY = postIndex * 90 + this.scrollOffset;
				const newPost = this.createAffiliateTimelineItem(post, postIndex, postY);

				// Start with opacity 0 for fade-in effect
				newPost.opacity = 0;
				newPost.modified();
				this.timelineItems.unshift(newPost);

				// Fade in the new post
				const fadeTimeline = new Timeline(this.scene);
				fadeTimeline.create(newPost)
					.wait(ANIMATION_CONFIG.POST_FADE_IN_DELAY)
					.to({ opacity: 1 }, ANIMATION_CONFIG.POST_FADE_IN_DURATION)
					.call(() => {
						// If this is the last post being animated, complete the batch
						if (index === postsToAnimate.length - 1) {
							this.completeBatchAnimation();
						}
					});
			}, delay);
		});

		// If no posts were animated, complete immediately
		if (postsToAnimate.length === 0) {
			this.completeBatchAnimation();
		}
	}

	/**
	 * Adds batched posts without animation (when timeline is hidden)
	 */
	private addBatchedPostsSilently(posts: SharedPostData[]): void {
		posts.forEach((post, index) => {
			const postY = index * 90 + this.scrollOffset;
			const newPost = this.createAffiliateTimelineItem(post, index, postY);
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
						avatar: { x: 0, y: 0, width: 40, height: 40 },
						userName: { x: 50, y: 5, width: 150, height: 14 },
						actionText: { x: 50, y: 25, width: 450, height: 12 },
						priceText: { x: 50, y: 40, width: 200, height: 12 },
						likeBtn: { x: 50, y: 60, width: 50, height: 12 },
						commentBtn: { x: 120, y: 60, width: 70, height: 12 },
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
		this.scrollOffset = this.lastScrollY + ev.startDelta.y;

		// Clamp scroll offset (negative values scroll down, positive scroll up)
		this.scrollOffset = Math.max(-this.maxScrollOffset, Math.min(this.scrollOffset, 0));

		// Round scroll offset to prevent micro-movements
		this.scrollOffset = Math.round(this.scrollOffset);

		// Only update if scroll offset actually changed significantly
		if (Math.abs(oldScrollOffset - this.scrollOffset) < 1) {
			return;
		}

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
		const totalContentHeight = this.timelineItems.length * 90;
		const containerHeight = this.scrollContainer!.height;
		this.maxScrollOffset = Math.max(0, totalContentHeight - containerHeight);
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
			{ user: "[ガイド]", action: "📱 タイムラインでは他のプレイヤーがシェアした商品を購入できます",
				reactions: { like: true, comment: true } },
			{ user: "[ガイド]", action: "💰 アフィリエイト機能で商品をシェアして、購入されるとポイント獲得！", reactions: { like: true, comment: true } },
			{ user: "[ガイド]", action: "🛒 商品をどんどんシェアして、アフィリエイト報酬を得ましょう！", reactions: { like: true, comment: true } },
			{ user: "[ガイド]", action: "💹 商品の価格は変化しますが、シェアされた商品はそのときの価格で購入できます", reactions: { like: true, comment: true } },
		];

		let itemIndex = 0;

		// Add shared posts first
		this.sharedPosts.forEach((sharedPost) => {
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
		const totalContentHeight = itemIndex * 90;
		const containerHeight = this.scrollContainer!.height;
		this.maxScrollOffset = Math.max(0, totalContentHeight - containerHeight);
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

		// Post background for visibility
		const postBackground = new g.FilledRect({
			scene: this.scene,
			width: itemLayout.width,
			height: itemLayout.height,
			x: 0,
			y: 0,
			cssColor: "white",
		});
		postContainer.append(postBackground);

		// User avatar (circle) - different color for self-posted
		const avatar = new g.FilledRect({
			scene: this.scene,
			width: avatarLayout.width,
			height: avatarLayout.height,
			x: avatarLayout.x,
			y: avatarLayout.y,
			cssColor: isSelfPosted ? "#95a5a6" : "#3498db", // Gray for self-posted, blue for others
		});
		postContainer.append(avatar);

		// User name
		const userName = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "#2c3e50",
				fontWeight: "bold",
			}),
			text: sharedPost.sharerName,
			x: userNameLayout.x,
			y: userNameLayout.y,
		});
		postContainer.append(userName);

		// Action text - different for self-posted items
		const actionTextContent = isSelfPosted
			? `${sharedPost.item.emoji} ${sharedPost.item.name}をシェアしました (自分の投稿・${sharedPost.purchaseCount}人が購入)`
			: `${sharedPost.item.emoji} ${sharedPost.item.name}をシェアしました！`;

		const actionText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: isSelfPosted ? "#7f8c8d" : "#34495e", // Muted color for self-posted
			}),
			text: actionTextContent,
			x: actionTextLayout.x,
			y: actionTextLayout.y,
			width: actionTextLayout.width,
		});
		postContainer.append(actionText);

		// Price text - muted styling for self-posted items
		const priceText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 11,
				fontColor: isSelfPosted ? "#95a5a6" : "#e74c3c", // Muted color for self-posted
				fontWeight: isSelfPosted ? "normal" : "bold", // Normal weight for self-posted
			}),
			text: `価格: ${sharedPost.sharedPrice}pt (アフィリエイト) / 定価: ${sharedPost.item.purchasePrice}pt`,
			x: priceTextLayout.x,
			y: priceTextLayout.y,
		});
		postContainer.append(priceText);


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

		// Post background for visibility
		const postBackground = new g.FilledRect({
			scene: this.scene,
			width: itemLayout.width,
			height: itemLayout.height,
			x: 0,
			y: 0,
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
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "#2c3e50",
				fontWeight: "bold",
			}),
			text: user,
			x: userNameLayout.x,
			y: userNameLayout.y,
		});
		postContainer.append(userName);

		// Action text
		const actionText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: "#34495e",
			}),
			text: action,
			x: actionTextLayout.x,
			y: actionTextLayout.y,
			width: actionTextLayout.width,
		});
		postContainer.append(actionText);

		// Append container to scroll container and return it
		this.scrollContainer!.append(postContainer);
		return postContainer;
	}

	/**
	 * Shows an error modal with button reactivation
	 */
	private showErrorModal(title: string, message: string, postId: string): void {
		const modal = new ModalE({
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
			}
		});

		this.scene.append(modal);
	}

	/**
	 * Shows success modal for affiliate purchase (consistent with shop behavior)
	 */
	private showSuccessModal(item: ItemData, price: number): void {
		const successMessage = `アフィリエイト商品を購入しました！\n\n${item.emoji} ${item.name}\n価格: ${price}pt`;

		const modal = new ModalE({
			scene: this.scene,
			multi: this.multi,
			name: `success_modal_${item.id}`,
			args: null,
			title: "購入完了",
			message: successMessage,
			onClose: () => {
				// No reactivation needed for success modal
			}
		});

		this.scene.append(modal);
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

		// Find the corresponding timeline item
		const postIndex = this.sharedPosts.indexOf(sharedPost);
		if (postIndex >= 0 && postIndex < this.timelineItems.length) {
			const postItem = this.timelineItems[postIndex];
			// Update action text to reflect new purchase count for all posts
			const actionTextLabel = postItem.children && postItem.children[3]; // Assuming action text is forth child
			if (actionTextLabel && actionTextLabel instanceof g.Label) {
				const isSelfPosted = sharedPost.sharerId === this.scene.game.selfId;
				const newText = isSelfPosted
					? `${sharedPost.item.emoji} ${sharedPost.item.name}をシェアしました (自分の投稿・${sharedPost.purchaseCount}人が購入)`
					: `${sharedPost.item.emoji} ${sharedPost.item.name}をシェアしました (${sharedPost.purchaseCount}人が購入)`;
				actionTextLabel.text = newText;
				actionTextLabel.invalidate();
			}
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
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "white",
			}),
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
	 * Animates the addition of a new post with smooth transitions
	 */
	private animateNewPost(): void {
		// Disable scrolling during animation
		this.isAnimating = true;

		// Create loading overlay during animation
		this.createTimelineLoadingOverlay();

		// Create timeline that will handle the animation
		const timeline = new Timeline(this.scene);

		// First, shift existing posts down
		this.timelineItems.forEach((item, index) => {
			const newY = item.y + 90; // Shift down by one post height
			timeline.create(item).to({ y: newY }, ANIMATION_CONFIG.POST_SHIFT_DURATION);
		});

		// After shift animation, create and fade in new post
		timeline.create(this).wait(ANIMATION_CONFIG.POST_SHIFT_DURATION).call(() => {
			// Create new post at the top
			const newPostY = this.scrollOffset;
			const newPost = this.createAffiliateTimelineItem(this.sharedPosts[0], 0, newPostY);

			// Start with opacity 0 for fade-in effect
			newPost.opacity = 0;
			newPost.modified();
			this.timelineItems.unshift(newPost);

			// Fade in the new post
			const fadeTimeline = new Timeline(this.scene);
			fadeTimeline.create(newPost)
				.wait(ANIMATION_CONFIG.POST_FADE_IN_DELAY)
				.to({ opacity: 1 }, ANIMATION_CONFIG.POST_FADE_IN_DURATION)
				.call(() => {
					const totalContentHeight = this.timelineItems.length * 90;
					const containerHeight = this.scrollContainer!.height;
					this.maxScrollOffset = Math.max(0, totalContentHeight - containerHeight);

					// Fix all item positions after animation to prevent drift
					this.fixItemPositions();

					// Re-enable scrolling after animation
					this.isAnimating = false;

					// Animation complete, remove loading overlay
					this.destroyTimelineLoadingOverlay();
				});
		});
	}

	/**
	 * Fixes all item positions to their exact calculated values to prevent drift
	 */
	private fixItemPositions(): void {
		this.timelineItems.forEach((item, index) => {
			const correctY = index * 90 + this.scrollOffset;
			item.y = correctY;
			item.modified();
		});
	}
}
