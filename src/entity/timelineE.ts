import { AFFILIATE_CONFIG } from "../config/affiliateConfig";
import { AffiliatePurchaseMessage } from "../data/affiliateMessages";
import { ItemData } from "../data/itemData";
import { SharedPostData, incrementPurchaseCount } from "../data/sharedPostData";
import { ItemManager } from "../manager/itemManager";
import { LabelButtonE } from "./labelButtonE";

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
	 * Adds a shared post to the timeline
	 * @param sharedPost The shared post data
	 */
	addSharedPost(sharedPost: SharedPostData): void {
		this.sharedPosts.unshift(sharedPost); // Add to beginning
		this.refreshTimeline();
	}

	/**
	 * Increments the purchase count for a specific shared post
	 * @param postId The ID of the post to update
	 */
	incrementPurchaseCount(postId: string): void {
		const sharedPost = this.sharedPosts.find(post => post.id === postId);
		if (sharedPost) {
			sharedPost.purchaseCount++;
			this.refreshTimeline(); // Refresh to update the display
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
						title: { x: 0, y: 0, width: 150, height: 20 },
						updateBtn: { x: 650, y: 3, width: 50, height: 14 }
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
		const updateBtnLayout = headerLayout.children!.updateBtn;

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

		const updateBtn = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "#3498db",
			}),
			text: "更新",
			x: this.layout.x + updateBtnLayout.x,
			y: this.layout.y + updateBtnLayout.y,
			touchable: true,
			local: true,
		});
		this.append(updateBtn);
	}

	/**
	 * Refreshes the timeline display
	 */
	private refreshTimeline(): void {
		// Clear affiliate button references
		this.affiliateButtons.clear();

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
			this.createAffiliateTimelineItem(sharedPost, this.layout.x, itemY);
			itemIndex++;
		});

		// Add default items
		defaultItems.forEach((item) => {
			const itemY = this.layout.y + this.layout.children!.item.y + (itemIndex * 90);
			this.createTimelineItem(item.user, item.action, item.reactions, this.layout.x, itemY);
			itemIndex++;
		});
	}

	/**
	 * Creates an affiliate timeline item for shared products
	 */
	private createAffiliateTimelineItem(sharedPost: SharedPostData, x: number, y: number): void {
		const itemLayout = this.layout.children!.item;
		const avatarLayout = itemLayout.children!.avatar;
		const userNameLayout = itemLayout.children!.userName;
		const actionTextLayout = itemLayout.children!.actionText;
		const priceTextLayout = itemLayout.children!.priceText;
		const buyBtnLayout = itemLayout.children!.buyBtn;

		// Check if this is a self-posted item
		const isSelfPosted = sharedPost.sharerId === this.scene.game.selfId;

		// Post background for visibility
		const postBackground = new g.FilledRect({
			scene: this.scene,
			width: itemLayout.width,
			height: itemLayout.height,
			x: x,
			y: y,
			cssColor: "white",
		});
		this.append(postBackground);

		// User avatar (circle) - different color for self-posted
		const avatar = new g.FilledRect({
			scene: this.scene,
			width: avatarLayout.width,
			height: avatarLayout.height,
			x: x + avatarLayout.x,
			y: y + avatarLayout.y,
			cssColor: isSelfPosted ? "#95a5a6" : "#3498db", // Gray for self-posted, blue for others
		});
		this.append(avatar);

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
			x: x + userNameLayout.x,
			y: y + userNameLayout.y,
		});
		this.append(userName);

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
			x: x + actionTextLayout.x,
			y: y + actionTextLayout.y,
			width: actionTextLayout.width,
		});
		this.append(actionText);

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
			x: x + priceTextLayout.x,
			y: y + priceTextLayout.y,
		});
		this.append(priceText);

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
				x: x + buyBtnLayout.x,
				y: y + buyBtnLayout.y,
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
			this.append(buyButton);
		}
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
				console.warn(`Not enough points for affiliate purchase. Required: ${sharedPost.sharedPrice}, Current: ${currentPoints}`);
				return;
			}
		}

		// Deduct points for the purchase
		if (this.onDeductPoints) {
			this.onDeductPoints(sharedPost.sharedPrice);
		}

		// Add item to inventory
		if (!this.itemManager.purchaseItem(sharedPost.item.id)) {
			console.error(`Failed to purchase item: ${sharedPost.item.id}`);
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
			sharerId: sharedPost.sharerName, // Note: This should be the actual player ID, may need mapping
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

		// Refresh timeline to update purchase count display
		this.refreshTimeline();
	}

	/**
	 * Creates a single timeline item
	 */
	private createTimelineItem(user: string, action: string, reactions: any, x: number, y: number): void {
		const itemLayout = this.layout.children!.item;
		const avatarLayout = itemLayout.children!.avatar;
		const userNameLayout = itemLayout.children!.userName;
		const actionTextLayout = itemLayout.children!.actionText;

		// Post background for visibility
		const postBackground = new g.FilledRect({
			scene: this.scene,
			width: itemLayout.width,
			height: itemLayout.height,
			x: x,
			y: y,
			cssColor: "white",
		});
		this.append(postBackground);

		// User avatar (circle)
		const avatar = new g.FilledRect({
			scene: this.scene,
			width: avatarLayout.width,
			height: avatarLayout.height,
			x: x + avatarLayout.x,
			y: y + avatarLayout.y,
			cssColor: "#ecf0f1",
		});
		this.append(avatar);

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
			x: x + userNameLayout.x,
			y: y + userNameLayout.y,
		});
		this.append(userName);

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
			x: x + actionTextLayout.x,
			y: y + actionTextLayout.y,
			width: actionTextLayout.width,
		});
		this.append(actionText);

	}
}
