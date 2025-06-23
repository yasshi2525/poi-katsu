/**
 * Notification types for different kinds of game events
 */
export type NotificationType =
	| "point_earned"      // Points earned from various activities
	| "task_completed"    // Task completion notifications
	| "sale_campaign"     // Sale and campaign announcements
	| "item_purchased"    // Item purchase confirmations
	| "set_completed"     // Set completion bonuses
	| "phase_unlock"      // New game phase unlocked
	| "system_message";   // General system messages

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
	/** Optional points value associated with the notification */
	points?: number;
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
		points: options.points,
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
 * Creates a point earned notification
 * @param points Points earned
 * @param source Source of the points (e.g., "task", "banner", "purchase")
 * @returns Point earned notification
 */
export function createPointEarnedNotification(points: number, source: string): NotificationData {
	return createNotification({
		type: "point_earned",
		message: `${points}ポイント獲得！`,
		description: `${source}から${points}ポイントを獲得しました`,
		priority: "medium",
		timing: "immediate",
		icon: "✨",
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
		description: `${taskTitle}を完了しました。${reward}を獲得！`,
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
