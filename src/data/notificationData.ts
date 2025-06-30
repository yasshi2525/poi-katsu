/**
 * Notification types for different kinds of game events
 */
export type NotificationType =
	| "point_earned"      // Points earned from various activities
	| "task_completed"    // Task completion notifications
	| "sale_campaign"     // Sale and campaign announcements
	| "set_completed"     // Set completion bonuses
	| "system_message"    // General system messages
	| "sns_reward"        // SNS task completion rewards
	| "shopping_reward"   // Shopping task completion rewards
	| "affiliate_reward"  // Affiliate system rewards
	| "affiliate_leaderboard" // Affiliate earnings leaderboard updates
	| "market_reaction"   // Market reaction to shared products
	| "settlement";       // Settlement notifications for points earned

/**
 * Notification priority levels for display ordering
 */
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

/**
 * Display timing options for notifications
 */
export type NotificationTiming =
	| "immediate"     // Show immediately
	| "next_frame"    // Show on next game frame
	| "delayed"       // Show after specified delay
	| "on_phase_end"; // Show when current phase ends

/**
 * Notification data interface representing all notification information
 * Supports various notification types according to 1.1 データモデル設計
 */
export interface NotificationData {
	/** Unique identifier for the notification */
	id: string;
	/** Type of notification */
	type: NotificationType;
	/** Priority level for display ordering */
	priority: NotificationPriority;
	/** Main notification message */
	message: string;
	/** Optional detailed description */
	description?: string;
	/** When to display the notification */
	timing: NotificationTiming;
	/** Delay in milliseconds (used with "delayed" timing) */
	delayMs?: number;
	/** Whether the notification has been displayed */
	displayed: boolean;
	/** When the notification was created - timestamp in milliseconds */
	createdAt: number;
	/** When the notification was displayed (if displayed) - timestamp in milliseconds */
	displayedAt?: number;
	/** Optional icon emoji for the notification */
	icon?: string;
	/** Auto-dismiss timeout in milliseconds (0 = manual dismiss) */
	autoDismissMs: number;
}

/**
 * Creates a new notification with default values
 * @param options Notification creation options
 * @returns New NotificationData instance
 */
export function createNotification(options: {
	type: NotificationType;
	message: string;
	description?: string;
	priority?: NotificationPriority;
	timing?: NotificationTiming;
	delayMs?: number;
	icon?: string;
	points?: number;
	autoDismissMs?: number;
	currentTime?: number;
}): NotificationData {
	return {
		id: generateNotificationId(),
		type: options.type,
		priority: options.priority || "medium",
		message: options.message,
		description: options.description,
		timing: options.timing || "immediate",
		delayMs: options.delayMs,
		displayed: false,
		createdAt: options.currentTime || 0,
		icon: options.icon,
		autoDismissMs: options.autoDismissMs || 3000 // 3 seconds default
	};
}

/**
 * Global notification counter for unique ID generation
 */
let notificationCounter = 0;

/**
 * Generates a unique notification ID using incrementing counter
 * @returns Unique notification ID string
 */
function generateNotificationId(): string {
	return `notification_${++notificationCounter}`;
}

/**
 * Marks a notification as displayed
 * @param notification Notification to mark as displayed
 * @returns Updated notification
 */
export function markNotificationDisplayed(notification: NotificationData, currentTime: number = 0): NotificationData {
	return {
		...notification,
		displayed: true,
		displayedAt: currentTime
	};
}

/**
 * Creates a point earned by settlement notification
 * @param points Points earned
 * @returns Point earned by settlement notification
 */
export function createSettlementNotification(points: number): NotificationData {
	return createNotification({
		type: "settlement",
		message: "精算終了！",
		description: `手持ちのアイテムを換金し+${points}pt獲得！`,
		priority: "medium",
		timing: "immediate",
		icon: "💰️",
		points: points,
		autoDismissMs: 2000
	});
}

/**
 * Creates a task completion notification
 * @param taskTitle Title of the completed task
 * @param reward Reward description
 * @returns Task completion notification
 */
export function createTaskCompletedNotification(taskTitle: string, reward: string): NotificationData {
	return createNotification({
		type: "task_completed",
		message: "タスク完了！",
		description: `${taskTitle} ${reward}獲得！`,
		priority: "high",
		timing: "immediate",
		icon: "🎉",
		autoDismissMs: 3000
	});
}

/**
 * Creates a sale campaign notification
 * @param campaignTitle Campaign title
 * @param discount Discount information
 * @returns Sale campaign notification
 */
export function createSaleCampaignNotification(campaignTitle: string, discount: string): NotificationData {
	return createNotification({
		type: "sale_campaign",
		message: "セール開催中！",
		description: `${campaignTitle} - ${discount}`,
		priority: "medium",
		timing: "immediate",
		icon: "🛍️",
		autoDismissMs: 5000
	});
}

/**
 * Creates an affiliate reward notification
 * @param rewardPoints Reward points earned
 * @param buyerName Optional buyer name
 * @returns Affiliate reward notification
 */
export function createAffiliateRewardNotification(rewardPoints: number, buyerName?: string): NotificationData {
	const description = buyerName
		? `${buyerName}さんの購入で+${rewardPoints}pt獲得！`
		: `アフィリエイト報酬で+${rewardPoints}pt獲得！`;

	return createNotification({
		type: "affiliate_reward",
		message: "アフィリエイト報酬！",
		description,
		priority: "high",
		timing: "immediate",
		icon: "💰",
		autoDismissMs: 4000
	});
}

/**
 * Creates an affiliate leaderboard notification
 * @param topPlayerName Name of the top earning player
 * @param totalEarnings Total earnings amount
 * @param isCurrentPlayer Whether the top player is the current player
 * @returns Affiliate leaderboard notification
 */
export function createAffiliateLeaderboardNotification(
	topPlayerName: string,
	totalEarnings: number,
	isCurrentPlayer: boolean
): NotificationData {
	const playerDisplayName = isCurrentPlayer ? `${topPlayerName}（あなた）` : topPlayerName;

	return createNotification({
		type: "affiliate_leaderboard",
		message: "🏆 シェアトップ",
		description: `${playerDisplayName} ${totalEarnings}pt`,
		priority: "medium",
		timing: "immediate",
		icon: "📊",
		autoDismissMs: 3000
	});
}

/**
 * Market reaction types for product shares
 */
export type MarketReactionType = "hot" | "warm" | "cold";

/**
 * Creates a market reaction notification for shared products
 * @param productName Name of the shared product
 * @param sharePrice Price at which the product was shared
 * @param reactionType Type of market reaction based on pricing
 * @returns Market reaction notification
 */
export function createMarketReactionNotification(
	productName: string,
	sharePrice: number,
	reactionType: MarketReactionType
): NotificationData {
	const reactions = {
		hot: {
			message: "SNSで大反響！",
			description: `みんなの反応：「${productName} がこんな安いの初めて見た！買うわ！」`,
			icon: "🔥"
		},
		warm: {
			message: "SNSで関心を集めています",
			description: `みんなの反応：「この ${productName} 安いね～。買おうかな？」`,
			icon: "👀"
		},
		cold: {
			message: "タイムラインに投稿",
			description: `「${productName}」${sharePrice}ptでシェア済み`,
			icon: "📝"
		}
	};

	const reaction = reactions[reactionType];

	return createNotification({
		type: "market_reaction",
		message: reaction.message,
		description: reaction.description,
		priority: "medium",
		timing: "immediate",
		icon: reaction.icon,
		autoDismissMs: 3000
	});
}
