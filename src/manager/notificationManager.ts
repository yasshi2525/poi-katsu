/* eslint-disable @typescript-eslint/member-ordering */
import { GameContext } from "../data/gameContext";
import {
	NotificationData,
	NotificationType,
	NotificationPriority,
	NotificationTiming,
	createNotification,
	markNotificationDisplayed
} from "../data/notificationData";

/**
 * Notification queue configuration
 */
interface NotificationQueueConfig {
	/** Maximum number of notifications in queue */
	maxQueueSize: number;
	/** Maximum number of notifications displayed simultaneously */
	maxSimultaneousDisplay: number;
	/** Default display duration for auto-dismiss notifications */
	defaultDisplayDuration: number;
}

/**
 * Display position for notifications
 */
export interface NotificationPosition {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * NotificationManager - Centralized notification system
 * Manages notification display, queuing, and timing
 * Implements 1.2 ゲーム進行管理システム according to plan.md
 */
export class NotificationManager {
	private gameContext: GameContext;
	private scene: g.Scene;
	private config: NotificationQueueConfig;
	private displayedNotifications: Map<string, NotificationData>;
	private queuedNotifications: NotificationData[];
	private delayedNotifications: Map<string, { notification: NotificationData; timerId: g.TimerIdentifier }>;
	private displayPositions: NotificationPosition[];
	private notificationElements: Map<string, g.E>;

	constructor(gameContext: GameContext, scene: g.Scene, config?: Partial<NotificationQueueConfig>) {
		this.gameContext = gameContext;
		this.scene = scene;
		this.config = {
			maxQueueSize: 10,
			maxSimultaneousDisplay: 3,
			defaultDisplayDuration: 3000,
			...config
		};

		this.displayedNotifications = new Map();
		this.queuedNotifications = [];
		this.delayedNotifications = new Map();
		this.notificationElements = new Map();
		this.displayPositions = this.initializeDisplayPositions();

		// Listen for new notifications from game context
		this.gameContext.on("notificationAdded", (notification: NotificationData) => {
			this.handleNewNotification(notification);
		});

		// Listen for notification removals
		this.gameContext.on("notificationRemoved", (notification: NotificationData) => {
			this.removeNotificationDisplay(notification.id);
		});
	}

	/**
	 * Initializes notification display positions
	 */
	private initializeDisplayPositions(): NotificationPosition[] {
		const positions: NotificationPosition[] = [];
		const notificationHeight = 60;
		const spacing = 10;
		const startY = 100; // Below header

		for (let i = 0; i < this.config.maxSimultaneousDisplay; i++) {
			positions.push({
				x: this.scene.game.width - 320, // Right side
				y: startY + (i * (notificationHeight + spacing)),
				width: 300,
				height: notificationHeight
			});
		}

		return positions;
	}

	/**
	 * Shows a notification immediately
	 * @param notification Notification to show
	 */
	showNotification(notification: NotificationData): void {
		this.gameContext.addNotification(notification);
	}

	/**
	 * Shows a simple message notification
	 * @param message Message text
	 * @param type Notification type
	 * @param priority Priority level
	 */
	showMessage(message: string, type: NotificationType = "system_message", priority: NotificationPriority = "medium"): void {
		const notification = createNotification({
			type: type,
			message: message,
			priority: priority,
			timing: "immediate"
		});

		this.showNotification(notification);
	}

	/**
	 * Shows a delayed notification
	 * @param notification Notification to show
	 * @param delayMs Delay in milliseconds
	 */
	showDelayedNotification(notification: NotificationData, delayMs: number): void {
		const delayedNotification = {
			...notification,
			timing: "delayed" as NotificationTiming,
			delayMs: delayMs
		};

		this.gameContext.addNotification(delayedNotification);
	}

	/**
	 * Dismisses a notification by ID
	 * @param notificationId Notification ID to dismiss
	 */
	dismissNotification(notificationId: string): void {
		this.gameContext.removeNotification(notificationId);
	}

	/**
	 * Dismisses all notifications
	 */
	dismissAllNotifications(): void {
		this.gameContext.clearNotifications();
		this.clearAllDisplays();
	}

	/**
	 * Gets currently displayed notifications
	 */
	getDisplayedNotifications(): NotificationData[] {
		return Array.from(this.displayedNotifications.values());
	}

	/**
	 * Gets queued notifications waiting to be displayed
	 */
	getQueuedNotifications(): NotificationData[] {
		return [...this.queuedNotifications];
	}

	/**
	 * Handles new notification from game context
	 */
	private handleNewNotification(notification: NotificationData): void {
		switch (notification.timing) {
			case "immediate":
				this.processImmediateNotification(notification);
				break;
			case "next_frame":
				this.scene.onUpdate.addOnce(() => this.processImmediateNotification(notification));
				break;
			case "delayed":
				this.processDelayedNotification(notification);
				break;
			case "on_phase_end":
				this.queueNotificationForPhaseEnd(notification);
				break;
		}
	}

	/**
	 * Processes immediate notifications
	 */
	private processImmediateNotification(notification: NotificationData): void {
		if (this.canDisplayNotification()) {
			this.displayNotification(notification);
		} else {
			this.queueNotification(notification);
		}
	}

	/**
	 * Processes delayed notifications
	 */
	private processDelayedNotification(notification: NotificationData): void {
		if (!notification.delayMs) {
			this.processImmediateNotification(notification);
			return;
		}

		const timerId = this.scene.setTimeout(() => {
			this.delayedNotifications.delete(notification.id);
			this.processImmediateNotification(notification);
		}, notification.delayMs);

		this.delayedNotifications.set(notification.id, { notification, timerId });
	}

	/**
	 * Queues a notification for phase end
	 */
	private queueNotificationForPhaseEnd(notification: NotificationData): void {
		// Add to queue - will be processed when phase changes
		this.queuedNotifications.push(notification);

		// Listen for phase changes to display queued notifications
		const phaseListener = (): void => {
			this.processImmediateNotification(notification);
			this.queuedNotifications = this.queuedNotifications.filter(n => n.id !== notification.id);
		};

		this.gameContext.on("phaseChanged", phaseListener);
	}

	/**
	 * Checks if a notification can be displayed immediately
	 */
	private canDisplayNotification(): boolean {
		return this.displayedNotifications.size < this.config.maxSimultaneousDisplay;
	}

	/**
	 * Queues a notification for later display
	 */
	private queueNotification(notification: NotificationData): void {
		if (this.queuedNotifications.length >= this.config.maxQueueSize) {
			// Remove oldest low-priority notification
			const lowestPriorityIndex = this.findLowestPriorityNotificationIndex();
			if (lowestPriorityIndex >= 0) {
				this.queuedNotifications.splice(lowestPriorityIndex, 1);
			}
		}

		// Insert notification based on priority
		const insertIndex = this.findInsertionIndex(notification);
		this.queuedNotifications.splice(insertIndex, 0, notification);
	}

	/**
	 * Displays a notification visually
	 */
	private displayNotification(notification: NotificationData): void {
		const position = this.getAvailablePosition();
		if (!position) return;

		// Create notification visual element
		const notificationElement = this.createNotificationElement(notification, position);
		this.scene.append(notificationElement);

		// Store references
		this.displayedNotifications.set(notification.id, notification);
		this.notificationElements.set(notification.id, notificationElement);

		// Mark as displayed
		const displayedNotification = markNotificationDisplayed(notification);
		this.displayedNotifications.set(notification.id, displayedNotification);

		// Set up auto-dismiss
		if (notification.autoDismissMs > 0) {
			this.scene.setTimeout(() => {
				this.removeNotificationDisplay(notification.id);
			}, notification.autoDismissMs);
		}
	}

	/**
	 * Creates a visual notification element
	 */
	private createNotificationElement(notification: NotificationData, position: NotificationPosition): g.E {
		const container = new g.E({
			scene: this.scene,
			x: position.x,
			y: position.y,
			width: position.width,
			height: position.height
		});

		// Background
		const background = new g.FilledRect({
			scene: this.scene,
			width: position.width,
			height: position.height,
			cssColor: this.getNotificationColor(notification.priority),
			opacity: 0.9
		});
		container.append(background);

		// Icon (if present)
		if (notification.icon) {
			const iconLabel = new g.Label({
				scene: this.scene,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 20
				}),
				text: notification.icon,
				x: 10,
				y: 10
			});
			container.append(iconLabel);
		}

		// Message text
		const messageLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "white"
			}),
			text: this.truncateText(notification.message, 30),
			x: notification.icon ? 40 : 10,
			y: 10
		});
		container.append(messageLabel);

		// Description (if present and space available)
		if (notification.description && notification.description.length < 50) {
			const descLabel = new g.Label({
				scene: this.scene,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 12,
					fontColor: "#cccccc"
				}),
				text: this.truncateText(notification.description, 35),
				x: notification.icon ? 40 : 10,
				y: 30
			});
			container.append(descLabel);
		}

		// Points display (if present)
		if (notification.points) {
			const pointsLabel = new g.Label({
				scene: this.scene,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 12,
					fontColor: "#ffdd00"
				}),
				text: `+${notification.points}pt`,
				x: position.width - 60,
				y: 35
			});
			container.append(pointsLabel);
		}

		// Click to dismiss (unless auto-dismiss is 0)
		if (notification.autoDismissMs !== 0) {
			background.touchable = true;
			background.onPointDown.add(() => {
				this.removeNotificationDisplay(notification.id);
			});
		}

		return container;
	}

	/**
	 * Removes notification display
	 */
	private removeNotificationDisplay(notificationId: string): void {
		const element = this.notificationElements.get(notificationId);
		if (element) {
			element.destroy();
			this.notificationElements.delete(notificationId);
		}

		this.displayedNotifications.delete(notificationId);

		// Process next queued notification
		this.processNextQueuedNotification();
	}

	/**
	 * Processes the next notification in queue
	 */
	private processNextQueuedNotification(): void {
		if (this.queuedNotifications.length > 0 && this.canDisplayNotification()) {
			const nextNotification = this.queuedNotifications.shift()!;
			this.displayNotification(nextNotification);
		}
	}

	/**
	 * Gets available display position
	 */
	private getAvailablePosition(): NotificationPosition | null {
		for (let i = 0; i < this.displayPositions.length; i++) {
			const isOccupied = Array.from(this.notificationElements.values()).some(element =>
				element.y === this.displayPositions[i].y
			);

			if (!isOccupied) {
				return this.displayPositions[i];
			}
		}

		return null;
	}

	/**
	 * Gets notification background color based on priority
	 */
	private getNotificationColor(priority: NotificationPriority): string {
		switch (priority) {
			case "urgent": return "#e74c3c";
			case "high": return "#f39c12";
			case "medium": return "#3498db";
			case "low": return "#95a5a6";
			default: return "#3498db";
		}
	}

	/**
	 * Truncates text to fit notification display
	 */
	private truncateText(text: string, maxLength: number): string {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength - 3) + "...";
	}

	/**
	 * Finds the insertion index for a notification based on priority
	 */
	private findInsertionIndex(notification: NotificationData): number {
		const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
		const notificationPriority = priorityOrder[notification.priority];

		for (let i = 0; i < this.queuedNotifications.length; i++) {
			const queuedPriority = priorityOrder[this.queuedNotifications[i].priority];
			if (notificationPriority < queuedPriority) {
				return i;
			}
		}

		return this.queuedNotifications.length;
	}

	/**
	 * Finds the index of the lowest priority notification in queue
	 */
	private findLowestPriorityNotificationIndex(): number {
		let lowestIndex = -1;
		let lowestPriority = -1;
		const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

		for (let i = 0; i < this.queuedNotifications.length; i++) {
			const priority = priorityOrder[this.queuedNotifications[i].priority];
			if (priority > lowestPriority) {
				lowestPriority = priority;
				lowestIndex = i;
			}
		}

		return lowestIndex;
	}

	/**
	 * Clears all notification displays
	 */
	private clearAllDisplays(): void {
		for (const element of this.notificationElements.values()) {
			element.destroy();
		}

		this.displayedNotifications.clear();
		this.notificationElements.clear();
		this.queuedNotifications.length = 0;

		// Clear delayed notifications
		for (const { timerId } of this.delayedNotifications.values()) {
			this.scene.clearTimeout(timerId);
		}
		this.delayedNotifications.clear();
	}
}
