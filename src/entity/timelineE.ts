import { Timeline } from "@akashic-extension/akashic-timeline";
import { AFFILIATE_CONFIG } from "../config/affiliateConfig";
import { AffiliatePurchaseMessage } from "../data/affiliateMessages";
import { ItemData } from "../data/itemData";
import { SharedPostData, incrementPurchaseCount } from "../data/sharedPostData";
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
}

/**
 * Timeline section component that displays timeline items
 */
export class TimelineE extends g.E {
	private readonly layout: LayoutConfig;
	private readonly itemManager: ItemManager;
	private readonly onAffiliatePurchase?: (postId: string, buyerName: string, rewardPoints: number) => void;
	private readonly onCheckPoints?: () => number;
	private readonly onDeductPoints?: (amount: number) => void;
	private readonly onItemPurchased?: (item: ItemData) => void;
	private readonly onCheckOwnership?: (itemId: string) => boolean;
	private readonly onGetPlayerName?: () => string;
	private sharedPosts: SharedPostData[] = [];
	private affiliateButtons: Map<string, LabelButtonE<string>> = new Map();
	private timelineItems: g.E[] = [];
	private loadingOverlay?: g.E;

	/**
	 * Creates a new Timeline instance
	 * @param options Configuration options for the timeline
	 */
	constructor(options: TimelineParameterObject) {
		super(options);

		this.itemManager = options.itemManager;
		this.onAffiliatePurchase = options.onAffiliatePurchase;
		this.onCheckPoints = options.onCheckPoints;
		this.onDeductPoints = options.onDeductPoints;
		this.onItemPurchased = options.onItemPurchased;
		this.onCheckOwnership = options.onCheckOwnership;
		this.onGetPlayerName = options.onGetPlayerName;
		this.layout = this.createLayoutConfig(options.width, options.height);
		this.createLayout();
	}

	/**
	 * Adds a shared post to the timeline with smooth animation
	 * @param sharedPost The shared post data
	 */
	addSharedPost(sharedPost: SharedPostData): void {
		this.sharedPosts.unshift(sharedPost); // Add to beginning

		// Only animate if timeline is visible, otherwise just refresh the display
		if (this.opacity > 0) {
			this.animateNewPost();
		} else {
			// Timeline is hidden, use synchronous refresh to ensure posts are ready when revealed
			this.refreshTimeline();
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
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, screenHeight: number): LayoutConfig {
		return {
			x: screenWidth - 720, // Fixed internal positioning
			y: 85, // Fixed internal positioning - relative to container
			width: 700,
			height: screenHeight - 265,
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
						buyBtn: { x: 510, y: 25, width: 80, height: 25 }
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
		this.createTimelineItems();
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
			{ user: "ユーザー1", action: "マンガ全巻セット買いました！", reactions: { like: true, comment: true } },
			{ user: "ユーザー2", action: "小説の予約を探しています。元ってくれる方いませんか？", reactions: { like: true, comment: true } },
			{ user: "[公式] ポイ活ウォーズ", action: "本日限定！通販で使える20%ポイント還元キャンペーン実施中！", reactions: { like: true, comment: true } },
		];

		let itemIndex = 0;

		// Add shared posts first
		this.sharedPosts.forEach((sharedPost) => {
			const itemY = this.layout.y + this.layout.children!.item.y + (itemIndex * 90);
			const postItem = this.createAffiliateTimelineItem(sharedPost, this.layout.x, itemY);
			this.timelineItems.push(postItem);
			itemIndex++;
		});

		// Add default items
		defaultItems.forEach((item) => {
			const itemY = this.layout.y + this.layout.children!.item.y + (itemIndex * 90);
			const postItem = this.createTimelineItem(item.user, item.action, item.reactions, this.layout.x, itemY);
			this.timelineItems.push(postItem);
			itemIndex++;
		});
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
		const isSelfPosted = sharedPost.sharerId === this.scene.game.selfId;

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
				name: `affiliate_buy_${sharedPost.id}`,
				args: sharedPost.id,
				text: isAlreadyOwned ? "所持済" : "購入",
				width: buyBtnLayout.width,
				height: buyBtnLayout.height,
				x: buyBtnLayout.x,
				y: buyBtnLayout.y,
				backgroundColor: isAlreadyOwned ? "#95a5a6" : "#e67e22",
				textColor: "white",
				fontSize: 12,
				onComplete: (postId: string) => this.handleAffiliatePurchase(postId)
			});

			// Disable button if already owned
			if (isAlreadyOwned) {
				buyButton.touchable = false;
			}

			this.affiliateButtons.set(sharedPost.id, buyButton);
			postContainer.append(buyButton);
		}

		// Append container to timeline and return it
		this.append(postContainer);
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
			console.warn(`Purchase already processed for post: ${postId}`);
			return;
		}

		// Prevent self-purchases for fairness
		if (sharedPost.sharerId === this.scene.game.selfId) {
			console.warn(`Cannot purchase own shared post: ${postId}`);
			return;
		}

		// Check if player already owns this item
		if (this.onCheckOwnership && this.onCheckOwnership(sharedPost.item.id)) {
			console.warn(`Player already owns item: ${sharedPost.item.id}`);
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

		// Increment purchase count for the shared post
		incrementPurchaseCount(sharedPost);

		// Calculate affiliate reward using configured rate
		const affiliateReward = Math.floor(sharedPost.sharedPrice * AFFILIATE_CONFIG.REWARD_RATE);

		// Broadcast affiliate purchase to all players for reward and count tracking
		const buyerName = this.onGetPlayerName ? this.onGetPlayerName() : AFFILIATE_CONFIG.TIMELINE.DEFAULT_PLAYER_NAME;

		const purchaseMessage: AffiliatePurchaseMessage = {
			postId: postId,
			buyerId: this.scene.game.selfId || "unknown",
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

		// Update purchase count display without destroying children
		this.updatePurchaseCount(postId);
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

		// Append container to timeline and return it
		this.append(postContainer);
		return postContainer;
	}

	/**
	 * Shows an error modal with button reactivation
	 */
	private showErrorModal(title: string, message: string, postId: string): void {
		const modal = new ModalE({
			scene: this.scene,
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
	 * Updates purchase count display for a specific post without recreating
	 * Only updates display for self-posted items to show purchase count
	 */
	private updatePurchaseCount(postId: string): void {
		// Find the shared post
		const sharedPost = this.sharedPosts.find(post => post.id === postId);
		if (!sharedPost) return;

		// Only update purchase count display for self-posted items
		const isSelfPosted = sharedPost.sharerId === this.scene.game.selfId;
		if (!isSelfPosted) return;

		// Find the corresponding timeline item
		const postIndex = this.sharedPosts.indexOf(sharedPost);
		if (postIndex >= 0 && postIndex < this.timelineItems.length) {
			const postItem = this.timelineItems[postIndex];
			// Update action text to reflect new purchase count for self-posted items only
			const actionTextLabel = postItem.children && postItem.children[3]; // Assuming action text is forth child
			if (actionTextLabel && actionTextLabel instanceof g.Label) {
				const newText = `${sharedPost.item.emoji} ${sharedPost.item.name}をシェアしました (自分の投稿・${sharedPost.purchaseCount}人が購入)`;
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
			const newPostY = this.layout.y + this.layout.children!.item.y;
			const newPost = this.createAffiliateTimelineItem(this.sharedPosts[0], this.layout.x, newPostY);

			// Start with opacity 0 for fade-in effect
			newPost.opacity = 0;
			this.timelineItems.unshift(newPost);

			// Fade in the new post
			const fadeTimeline = new Timeline(this.scene);
			fadeTimeline.create(newPost)
				.wait(ANIMATION_CONFIG.POST_FADE_IN_DELAY)
				.to({ opacity: 1 }, ANIMATION_CONFIG.POST_FADE_IN_DURATION)
				.call(() => {
					// Animation complete, remove loading overlay
					this.destroyTimelineLoadingOverlay();
				});
		});
	}
}
