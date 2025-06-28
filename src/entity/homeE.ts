import { Timeline } from "@akashic-extension/akashic-timeline";
import { AffiliateBroadcastMessage } from "../data/affiliateMessages";
import { GameContext } from "../data/gameContext";
import { ItemData } from "../data/itemData";
import { createSharedPost, SharedPostData } from "../data/sharedPostData";
import { TaskData } from "../data/taskData";
import { ItemManager } from "../manager/itemManager";
import { MarketManager } from "../manager/marketManager";
import { PointManager, POINT_CONSTANTS } from "../manager/pointManager";
import { TaskManager, TaskExecutionContext } from "../manager/taskManager";
import { AdBannerE, BannerData, BannerContext } from "./adBannerE";
import { AppListE } from "./appListE";
import { HeaderE } from "./headerE";
import { ItemListE } from "./itemListE";
import { ModalE } from "./modalE";
import { PointDisplayE } from "./pointDisplayE";
import { ProfileEditorE } from "./profileEditorE";
import { SettlementE } from "./settlementE";
import { ShopE } from "./shopE";
import { TaskListE } from "./taskListE";
import { TimelineE } from "./timelineE";


/**
 * Animation configuration constants
 */
const ANIMATION_CONFIG = {
	SCREEN_SWIPE_DURATION: 500,
	SCREEN_SWIPE_DISTANCE: 720,
	ACHIEVEMENT_SLIDE_DURATION: 500,
	ACHIEVEMENT_DISPLAY_DURATION: 2000,
	ACHIEVEMENT_POSITION_FROM_RIGHT: 320,
	TIMELINE_FADE_IN_DURATION: 800,
	TIMELINE_SLIDE_UP_DURATION: 600,
	SNS_ACHIEVEMENT_POSITION_FROM_RIGHT: 370, // Position for SNS achievement notification
	SNS_ACHIEVEMENT_Y_OFFSET: 150, // Y position offset for SNS notification
	MODAL_CLOSE_DELAY: 50, // Delay before timeline reveal to ensure modal is closed
} as const;

/**
 * Parameter object for Home
 */
export interface HomeParameterObject extends g.EParameterObject {
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Header reference from scene level */
	header: HeaderE;
	/** Game context for centralized state management */
	gameContext: GameContext;
	/** Market manager instance for price management */
	marketManager: MarketManager;
	/** Point manager instance for centralized point management */
	pointManager: PointManager;
	/** Function to update current player score in MainScene */
	updateCurrentPlayerScore: (score: number) => void;
}

/**
 * Home screen entity that displays the main game interface
 * Includes score, promotional banner, task list, timeline, and app navigation
 */
export class HomeE extends g.E {
	static assetIds: string[] = [...PointDisplayE.assetIds, ...TaskListE.assetIds];

	// Component sections
	private header: HeaderE;
	private adBanner!: AdBannerE;
	private taskList!: TaskListE;
	private timeline!: TimelineE;
	private appList!: AppListE;
	private itemList!: ItemListE;
	private profileEditor?: ProfileEditorE;
	private shop?: ShopE;
	private settlement?: SettlementE;
	private pointManager!: PointManager;
	private currentModal?: ModalE<string>;
	private swipeOverlay?: g.FilledRect;

	// Management systems
	private taskManager!: TaskManager;
	private itemManager!: ItemManager;
	private gameContext: GameContext;
	private marketManager!: MarketManager;

	// MainScene function callbacks
	private updateCurrentPlayerScore!: (score: number) => void;

	// Screen state
	private readonly screenWidth: number;
	private readonly screenHeight: number;
	private isProfileEditorVisible: boolean = false;
	private isTimelineVisible: boolean = false;
	private isShopVisible: boolean = false;
	private isSettlementVisible: boolean = false;

	// Affiliate system
	private postIdCounter: number = 0;
	private timestampCounter: number = 0;


	// Banner data
	private readonly banners: BannerData[] = [
		{
			id: "welcome_ad",
			priority: 1,
			enabled: true,
			title: "[PR] ポイ活ウォーズへようこそ！",
			subtitle: "広告をタップしてさらにポイントゲット",
			saleTag: `タップで${POINT_CONSTANTS.AD_BANNER_CLICK_REWARD}pt！`,
			backgroundColor: "#c2185b",
			titleColor: "white",
			subtitleColor: "#ecf0f1",
			saleTagColor: "#ffa000",
			clickHandler: (context: BannerContext) => {
				context.addScore(POINT_CONSTANTS.AD_BANNER_CLICK_REWARD, "ads", "Welcome ad banner click");
			}
		},
		{
			id: "shopping_recommend",
			priority: 2,
			enabled: true,
			title: "[PR] 通販でもっとポイント！",
			subtitle: "商品購入でポイント大量獲得",
			saleTag: "お得！",
			backgroundColor: "#c2185b",
			titleColor: "white",
			subtitleColor: "#ecf0f1",
			saleTagColor: "#ffa000",
			clickHandler: (context: BannerContext) => {
				context.addScore(POINT_CONSTANTS.AD_BANNER_CLICK_REWARD, "ads", "Shopping recommendation banner click");
				context.executeTask("shopping");
			}
		},
		{
			id: "sale_notification",
			priority: 3,
			enabled: true,
			title: "[PR] セール開催中！",
			subtitle: "今すぐ通販をチェック",
			saleTag: "限定！",
			backgroundColor: "#c2185b",
			titleColor: "white",
			subtitleColor: "#ecf0f1",
			saleTagColor: "#ffa000",
			clickHandler: (context: BannerContext) => {
				context.addScore(POINT_CONSTANTS.AD_BANNER_CLICK_REWARD, "ads", "Sale notification banner click");
				context.switchToShop();
			}
		},
		{
			id: "sns_recommend",
			priority: 4,
			enabled: true,
			title: "[PR] SNS連携でもっとお得！",
			subtitle: "商品シェアでポイント還元",
			saleTag: "シェア！",
			backgroundColor: "#c2185b",
			titleColor: "white",
			subtitleColor: "#ecf0f1",
			saleTagColor: "#ffa000",
			clickHandler: (context: BannerContext) => {
				context.addScore(POINT_CONSTANTS.AD_BANNER_CLICK_REWARD, "ads", "SNS recommendation banner click");
				context.executeTask("sns");
			}
		}
	];


	/**
	 * Creates a new Home instance
	 * @param options Configuration options for the home screen
	 */
	constructor(options: HomeParameterObject) {
		super(options);

		this.header = options.header;
		this.screenWidth = options.width;
		this.screenHeight = options.height;
		this.gameContext = options.gameContext;
		this.marketManager = options.marketManager;
		this.pointManager = options.pointManager;
		this.updateCurrentPlayerScore = options.updateCurrentPlayerScore;

		// Initialize managers
		this.initializeItemManager();
		this.initializeTaskManager();

		this.createComponents(options.width, options.height);
	}

	/**
	 * Gets the current score
	 * @returns Current score
	 */
	getScore(): number {
		return this.pointManager.getCurrentPoints();
	}

	/**
	 * Adds points to the score with specific source categorization
	 * @param points Points to add
	 * @param source Source category (e.g., "ads", "affiliate", "shopping", "tasks")
	 * @param description Detailed description of the point source
	 */
	addScore(points: number, source: string = "other", description: string = "Points added during gameplay"): void {
		if (points > 0) {
			this.pointManager.awardPoints(points, source, description);
		} else if (points < 0) {
			this.pointManager.deductPoints(-points, source, description);
		}

		// Update header display
		const newScore = this.pointManager.getCurrentPoints();
		this.header.setScore(newScore);

		// Update score in MainScene for consistency
		this.updateCurrentPlayerScore(newScore);
	}

	/**
	 * Sets the remaining time based on remain frame number
	 * @param remainFrame The remaining frames
	 */
	setTime(remainFrame: number): void {
		const newRemainSecond = Math.floor(remainFrame / this.scene.game.fps);
		this.header.setTime(newRemainSecond);
	}

	/**
	 * Gets the remaining time in seconds
	 * @returns Remaining time in seconds
	 */
	getRemainingTime(): number {
		return this.header.getRemainingTime();
	}

	/**
	 * Gets the ad banner component (for testing)
	 * @returns Ad banner component
	 */
	getAdBanner(): AdBannerE {
		return this.adBanner;
	}

	/**
	 * Sets the enabled state of a specific banner
	 * @param bannerId The ID of the banner to enable/disable
	 * @param enabled Whether the banner should be enabled
	 */
	setBannerEnabled(bannerId: string, enabled: boolean): void {
		this.adBanner.setBannerEnabled(bannerId, enabled);
	}

	/**
	 * Gets the task list component (for testing)
	 * @returns Task list component
	 */
	getTaskList(): TaskListE {
		return this.taskList;
	}

	/**
	 * Refreshes the task list with updated tasks from TaskManager
	 * Called when new tasks become available (e.g., after shopping task completion)
	 */
	refreshTaskList(): void {
		if (this.taskList && this.taskManager) {
			this.taskList.refreshTasks(this.taskManager.getTasks());
		}
	}

	/**
	 * Adds a shared post to the timeline from broadcast
	 */
	addSharedPostToTimeline(sharedPost: SharedPostData): void {
		if (this.timeline) {
			this.timeline.addSharedPost(sharedPost);
		}
	}

	/**
	 * Awards affiliate reward points to the current player
	 */
	awardAffiliateReward(rewardPoints: number, buyerName?: string): void {
		this.addScore(rewardPoints, "affiliate", `Affiliate commission from ${buyerName || "他のプレイヤー"}`);
		// Use non-blocking notification bar instead of modal
		this.showAffiliateRewardNotification(rewardPoints, buyerName || "他のプレイヤー");
	}

	/**
	 * Updates the purchase count for an affiliate post
	 */
	updateAffiliatePurchaseCount(postId: string): void {
		if (this.timeline) {
			this.timeline.incrementPurchaseCount(postId);
		}
	}

	/**
	 * Returns to home screen if currently viewing other apps
	 */
	returnToHomeIfNeeded(): void {
		// If viewing shop, switch back to home
		if (this.isShopVisible) {
			this.switchBackFromShop();
		}

		// If viewing settlement, switch back to home
		if (this.isSettlementVisible) {
			this.switchBackFromSettlement();
		}

		// Ensure all home sections are visible and positioned correctly
		this.getHomeSections().forEach(section => {
			section.x = section.x - (section.x % this.screenWidth); // Reset to home position
		});
	}

	/**
	 * Triggers automatic settlement when time reaches zero
	 */
	triggerAutomaticSettlement(): void {
		// First reveal the settlement app if not already visible (with automatic flag)
		if (!this.isSettlementVisible) {
			this.appList.revealSettlementApp(true); // true = automatic settlement
		}

		// The settlement app is made non-touchable during auto-reveal to avoid unintentional behavior
		// The highlighting effect will automatically open the settlement app

		// hide all other app windows
		this.shop?.hide();
		this.profileEditor?.hide();
	}

	/**
	 * Force closes all modals across the home screen when time reaches zero
	 */
	forceCloseAllModals(): void {
		// Close any current modal
		this.closeModal();

		// Close modals in shop if visible
		if (this.shop && this.isShopVisible) {
			this.shop.forceCloseAllModals();
		}

		// Close modals in settlement if visible
		if (this.settlement && this.isSettlementVisible) {
			this.settlement.forceCloseAllModals();
		}
	}

	/**
	 * Initializes ItemManager
	 */
	private initializeItemManager(): void {
		this.itemManager = new ItemManager();
	}

	/**
	 * Initializes TaskManager with execution context
	 */
	private initializeTaskManager(): void {
		const context: TaskExecutionContext = {
			scene: this.scene,
			screenWidth: this.screenWidth,
			screenHeight: this.screenHeight,
			gameContext: this.gameContext,
			onScoreAdd: (points: number, taskData: TaskData) => this.addScore(points, "tasks", `${taskData.title} completion reward`),
			onProfileSwitch: () => this.switchToProfileEditor(),
			onTimelineReveal: () => this.revealTimeline(),
			onShopAppReveal: () => this.appList.revealShopApp(),
			onModalCreate: (modal: ModalE<string>) => {
				this.currentModal = modal;
				this.scene.append(modal);
			},
			onModalClose: (taskId?: string) => {
				this.closeModal();
				if (taskId) {
					this.reactivateTaskButton(taskId);
				}
			},
			onTaskButtonReactivate: (taskId: string) => {
				return this.reactivateTaskButton(taskId);
			},
			onAchievementShow: (task: TaskData, notificationType?: string) => {
				if (notificationType === "sns") {
					this.showSnsRewardNotification(task);
				} else if (notificationType === "shopping") {
					this.showShoppingRewardNotification(task);
				} else {
					this.showAchievementEffect(task);
				}
			},
			onTaskComplete: (taskId: string) => {
				this.taskList.completeTaskExternal(taskId);
				this.recordTaskCompletion(taskId);
			},
			onTaskListRefresh: () => this.refreshTaskList()
		};

		this.taskManager = new TaskManager(context);
	}

	/**
	 * Creates all component sections
	 */
	private createComponents(width: number, height: number): void {
		// Note: header is created at scene level, not here

		// Create banner context for dependency injection
		const bannerContext: BannerContext = {
			addScore: (points: number, source: string, description: string) => this.addScore(points, source, description),
			executeTask: (taskId: string) => {
				const task = this.taskManager.getTask(taskId);
				if (task) {
					this.taskManager.executeTask(task);
				}
			},
			switchToShop: () => this.switchToShop()
		};

		// Create ad banner
		this.adBanner = new AdBannerE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			width: width,
			height: height,
			banners: this.banners,
			bannerContext: bannerContext
		});
		this.append(this.adBanner);

		// Create task list - now using TaskManager's tasks
		this.taskList = new TaskListE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			width: width,
			height: height,
			tasks: this.taskManager.getTasks(),
			onTaskExecute: (taskData: TaskData) => this.onTaskExecute(taskData),
			onTaskComplete: () => { /* Score addition is now handled by TaskManager */ }
		});
		this.append(this.taskList);

		// Create timeline (initially hidden)
		this.timeline = new TimelineE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			width: width,
			height: height,
			opacity: 0, // Initially hide timeline completely - will be shown after SNS task completion
			itemManager: this.itemManager,
			onAffiliatePurchase: (postId: string, buyerName: string, rewardPoints: number) =>
				this.handleAffiliatePurchase(postId, buyerName, rewardPoints),
			onCheckPoints: () => this.getScore(),
			onDeductPoints: (amount: number) => this.addScore(-amount, "shopping", "Item purchase"),
			onItemPurchased: (item: ItemData) => this.onItemPurchased(item),
			onCheckOwnership: (itemId: string) => this.itemManager.ownsItem(itemId),
			onGetPlayerName: () => {
				return this.gameContext.currentPlayer.profile.name;
			},
			onGetPlayerId: () => {
				return this.gameContext.currentPlayer.id;
			}
		});
		this.timeline.hide();
		this.append(this.timeline);

		// Create app list
		this.appList = new AppListE({
			scene: this.scene,
			width: width,
			height: height,
			onProfileClick: () => this.switchToProfileEditor(),
			onShopClick: () => this.switchToShop(),
			onSettlementClick: () => this.switchToSettlement(),
			onAutomaticSettlementClick: () => this.switchToSettlement(),
			onShopAppReveal: () => {
				// Disable shopping recommend ad when shop app is revealed
				this.adBanner.setBannerEnabled("shopping_recommend", false);
			}
		});
		this.append(this.appList);

		// Create item list
		this.itemList = new ItemListE({
			scene: this.scene,
			width: width,
			height: 60, // Compact height for horizontal layout
			itemManager: this.itemManager
		});
		this.append(this.itemList);
	}



	/**
	 * Handles task execution when a task execute button is clicked
	 * Delegates to TaskManager for centralized task logic
	 * @param taskData The task data for the executed task
	 */
	private onTaskExecute(taskData: TaskData): void {
		try {
			const result = this.taskManager.executeTask(taskData);
			if (!result.success) {
				console.warn(`Task execution failed: ${result.message}`);
			}
		} catch (error) {
			console.error("Task execution error:", error);
		}
	}


	/**
	 * Switches from HomeE to ProfileEditorE with swipe animation
	 */
	private switchToProfileEditor(): void {
		if (this.isProfileEditorVisible || this.profileEditor) return;

		// Create overlay to prevent user interactions during animation
		this.createSwipeOverlay();

		// Create profile editor positioned off-screen to the right
		this.profileEditor = new ProfileEditorE({
			scene: this.scene,
			gameContext: this.gameContext,
			width: this.screenWidth,
			height: this.screenHeight,
			x: this.screenWidth, // Start off-screen to the right
			y: 0,
			onComplete: () => this.switchBackToHome(),
			onProfileChange: () => this.updateHeaderWithCurrentProfile(),
			onSnsConnectionRequest: () => this.handleSnsConnectionRequest(true), // true = from profile
			onShoppingConnectionRequest: () => this.handleShoppingConnectionRequest(true) // true = from profile
		});
		this.append(this.profileEditor);

		this.isProfileEditorVisible = true;

		// Create swipe animation: HomeE slides left, ProfileEditor slides in from right
		const timeline = new Timeline(this.scene);

		// Animate HomeE sections sliding out to the left
		this.getHomeSections().forEach(section => {
			timeline.create(section)
				.to({ x: section.x - ANIMATION_CONFIG.SCREEN_SWIPE_DISTANCE }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
		});

		// Animate ProfileEditor sliding in from the right
		timeline.create(this.profileEditor)
			.to({ x: 0 }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION)
			.call(() => {
				// Remove overlay when animation completes
				this.removeSwipeOverlay();
			});
	}

	/**
	 * Switches back from ProfileEditorE to HomeE with swipe animation
	 */
	private switchBackToHome(): void {
		if (!this.isProfileEditorVisible || !this.profileEditor) return;

		// Create overlay to prevent user interactions during animation
		this.createSwipeOverlay();

		// Create swipe animation: ProfileEditor slides right, HomeE slides in from left
		const timeline = new Timeline(this.scene);

		// Animate ProfileEditor sliding out to the right
		timeline.create(this.profileEditor)
			.to({ x: this.screenWidth }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION)
			.call(() => {
				// Update header section with current profile data from gameVars
				this.updateHeaderWithCurrentProfile();
				// Clean up profile editor after animation
				if (this.profileEditor) {
					this.profileEditor.destroy();
					this.profileEditor = undefined;
				}
				this.isProfileEditorVisible = false;
				// Complete the profile task using TaskManager
				this.taskManager.completeProfileTask();
				// Remove overlay when animation completes
				this.removeSwipeOverlay();
			});

		// Animate HomeE sections sliding back in from the left
		this.getHomeSections().forEach(section => {
			timeline.create(section)
				.to({ x: section.x + ANIMATION_CONFIG.SCREEN_SWIPE_DISTANCE }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
		});
	}

	/**
	 * Gets all home screen sections for animation (excluding fixed header)
	 * @returns Array of home screen sections
	 */
	private getHomeSections(): g.E[] {
		return [
			this.adBanner,
			this.taskList,
			this.timeline,
			this.appList,
			this.itemList
		];
	}

	/**
	 * Updates the header with current profile data from GameContext
	 */
	private updateHeaderWithCurrentProfile(): void {
		const currentPlayer = this.gameContext.currentPlayer;
		this.header.setPlayerProfile(currentPlayer.profile.name, currentPlayer.profile.avatar);

		// GameContext profile is updated by ProfileEditorE directly, no need for additional update
	}



	/**
	 * Shows achievement notification effect
	 * @param task The completed task
	 */
	private showAchievementEffect(task: TaskData): void {
		// Create achievement notification that slides in from the right
		const achievementNotification = new g.E({
			scene: this.scene,
			x: this.screenWidth, // Start off-screen to the right
			y: 100,
		});

		// Background for notification
		const notificationBg = new g.FilledRect({
			scene: this.scene,
			width: 300,
			height: 60,
			x: 0,
			y: 0,
			cssColor: "#27ae60",
		});
		achievementNotification.append(notificationBg);

		// Achievement text
		const achievementText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: "white",
			}),
			text: `${task.title} 完了！ +${task.rewardPoints}pt`,
			x: 10,
			y: 20,
		});
		achievementNotification.append(achievementText);

		this.append(achievementNotification);

		// Animate notification: slide in, wait, slide out
		const timeline = new Timeline(this.scene);
		timeline.create(achievementNotification)
			.to({ x: this.screenWidth - ANIMATION_CONFIG.ACHIEVEMENT_POSITION_FROM_RIGHT }, ANIMATION_CONFIG.ACHIEVEMENT_SLIDE_DURATION)
			.wait(ANIMATION_CONFIG.ACHIEVEMENT_DISPLAY_DURATION)
			.to({ x: this.screenWidth }, ANIMATION_CONFIG.ACHIEVEMENT_SLIDE_DURATION)
			.call(() => {
				achievementNotification.destroy();
			});
	}





	/**
	 * Reveals timeline with fade-in animation
	 */
	private revealTimeline(): void {
		if (this.isTimelineVisible) return;

		this.isTimelineVisible = true;

		// Make timeline visible first
		this.timeline.show();

		// Disable SNS recommend ad when timeline is revealed
		this.adBanner.setBannerEnabled("sns_recommend", false);

		// Refresh shop to show share buttons if shop exists
		if (this.shop) {
			this.shop.refreshForTimelineReveal();
		}

		// Create animation timeline for fade-in effect
		const timeline = new Timeline(this.scene);

		// Fade in the timeline
		timeline.create(this.timeline)
			.to({
				opacity: 1
			}, ANIMATION_CONFIG.TIMELINE_FADE_IN_DURATION);
	}

	/**
	 * Shows SNS reward notification
	 * @param taskData The completed SNS task
	 */
	private showSnsRewardNotification(taskData: TaskData): void {
		// Create achievement notification that slides in from the right
		const achievementNotification = new g.E({
			scene: this.scene,
			x: this.screenWidth, // Start off-screen to the right
			y: ANIMATION_CONFIG.SNS_ACHIEVEMENT_Y_OFFSET, // Position below existing notifications
		});

		// Background for notification
		const notificationBg = new g.FilledRect({
			scene: this.scene,
			width: 350,
			height: 80,
			x: 0,
			y: 0,
			cssColor: "#3498db", // Blue color for SNS
		});
		achievementNotification.append(notificationBg);

		// Achievement text
		const achievementText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "white",
			}),
			text: `SNS連携完了！ +${taskData.rewardPoints}pt\nタイムライン機能が利用可能に！`,
			x: 10,
			y: 15,
		});
		achievementNotification.append(achievementText);

		this.append(achievementNotification);

		// Animate notification: slide in, wait, slide out
		const timeline = new Timeline(this.scene);
		timeline.create(achievementNotification)
			.to({ x: this.screenWidth - ANIMATION_CONFIG.SNS_ACHIEVEMENT_POSITION_FROM_RIGHT }, ANIMATION_CONFIG.ACHIEVEMENT_SLIDE_DURATION)
			.wait(ANIMATION_CONFIG.ACHIEVEMENT_DISPLAY_DURATION + 500) // Longer display for SNS
			.to({ x: this.screenWidth }, ANIMATION_CONFIG.ACHIEVEMENT_SLIDE_DURATION)
			.call(() => {
				achievementNotification.destroy();
			});
	}





	/**
	 * Switches from HomeE to ShopE with swipe animation
	 */
	private switchToShop(): void {
		if (this.isShopVisible) return;

		// Create or reuse shop positioned off-screen to the right
		if (!this.shop) {
			// Use MarketManager from constructor
			if (!this.marketManager) {
				console.error("MarketManager not found");
				return;
			}

			this.shop = new ShopE({
				scene: this.scene,
				multi: this.gameContext.gameMode.mode === "multi",
				width: this.screenWidth,
				height: this.screenHeight,
				x: this.screenWidth, // Start off-screen to the right
				y: 0,
				itemManager: this.itemManager,
				marketManager: this.marketManager,
				onCheckPoints: () => this.getScore(),
				onDeductPoints: (amount: number) => this.addScore(-amount, "shopping", "Item purchase"),
				onItemPurchased: (item: ItemData) => this.onItemPurchased(item),
				onBack: () => this.switchBackFromShop(),
				onGetRemainingTime: () => this.getRemainingTime(),
				onIsTimelineRevealed: () => this.isTimelineVisible,
				onShareProduct: (item: ItemData, sharedPrice: number) => this.handleProductShare(item, sharedPrice),
				onSnsConnectionRequest: () => this.handleSnsConnectionRequest(false), // false = from shop
				onPriceUpdate: () => {
					// Re-enable sale notification ad when product prices are updated
					this.adBanner.setBannerEnabled("sale_notification", true);
				}
			});
			this.append(this.shop);
		} else {
			// Reposition existing shop off-screen for animation
			this.shop.x = this.screenWidth;
		}

		this.isShopVisible = true;

		// Create overlay to prevent user interactions during animation
		this.createSwipeOverlay();

		// Create swipe animation: HomeE slides left, ShopE slides in from right
		const timeline = new Timeline(this.scene);

		// Animate HomeE sections sliding out to the left
		this.getHomeSections().forEach(section => {
			timeline.create(section)
				.to({ x: section.x - ANIMATION_CONFIG.SCREEN_SWIPE_DISTANCE }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
		});

		// Animate ShopE sliding in from the right
		timeline.create(this.shop)
			.to({ x: 0 }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION)
			.call(() => {
				// Remove overlay when animation completes
				this.removeSwipeOverlay();
			});
	}

	/**
	 * Switches back from ShopE to HomeE with swipe animation
	 */
	private switchBackFromShop(): void {
		if (!this.isShopVisible || !this.shop) return;

		// Create overlay to prevent user interactions during animation
		this.createSwipeOverlay();

		// Create swipe animation: ShopE slides right, HomeE slides in from left
		const timeline = new Timeline(this.scene);

		// Animate ShopE sliding out to the right
		timeline.create(this.shop)
			.to({ x: this.screenWidth }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION)
			.call(() => {
				// Don't destroy shop - keep it for reuse, just mark as not visible
				this.isShopVisible = false;
				// Remove overlay when animation completes
				this.removeSwipeOverlay();
			});

		// Animate HomeE sections sliding back in from the left
		this.getHomeSections().forEach(section => {
			timeline.create(section)
				.to({ x: section.x + ANIMATION_CONFIG.SCREEN_SWIPE_DISTANCE }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
		});
	}

	/**
	 * Switches from HomeE to SettlementE with swipe animation (always automatic mode)
	 */
	private switchToSettlement(): void {
		if (this.isSettlementVisible) {
			return;
		}

		// Create or reuse settlement positioned off-screen to the right
		if (!this.settlement) {
			this.settlement = new SettlementE({
				scene: this.scene,
				gameContext: this.gameContext,
				itemManager: this.itemManager,
				pointManager: this.pointManager
			});
			this.settlement.x = this.screenWidth; // Start off-screen to the right
			this.settlement.y = 0;
			this.append(this.settlement);
		} else {
			// Reposition existing settlement off-screen for animation
			this.settlement.x = this.screenWidth;
		}

		// Note: Automatic mode is no longer used

		this.isSettlementVisible = true;

		// Create overlay to prevent user interactions during animation
		this.createSwipeOverlay();

		// Create swipe animation: HomeE slides left, SettlementE slides in from right
		const timeline = new Timeline(this.scene);

		// Animate HomeE sections sliding out to the left
		this.getHomeSections().forEach(section => {
			timeline.create(section)
				.to({ x: section.x - ANIMATION_CONFIG.SCREEN_SWIPE_DISTANCE }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
		});

		// Animate SettlementE sliding in from the right
		timeline.create(this.settlement)
			.to({ x: 0 }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION)
			.call(() => {
				// Show settlement screen and start automatic settlement process
				this.settlement!.show();
				// Remove overlay when animation completes
				this.removeSwipeOverlay();
			});
	}

	/**
	 * Switches back from SettlementE to HomeE with swipe animation
	 */
	private switchBackFromSettlement(): void {
		if (!this.isSettlementVisible || !this.settlement) return;

		// Create overlay to prevent user interactions during animation
		this.createSwipeOverlay();

		// Create swipe animation: SettlementE slides right, HomeE slides in from left
		const timeline = new Timeline(this.scene);

		// Animate SettlementE sliding out to the right
		timeline.create(this.settlement)
			.to({ x: this.screenWidth }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION)
			.call(() => {
				// Don't destroy settlement - keep it for reuse, just mark as not visible
				this.isSettlementVisible = false;
				// Remove overlay when animation completes
				this.removeSwipeOverlay();
			});

		// Animate HomeE sections sliding back in from the left
		this.getHomeSections().forEach(section => {
			timeline.create(section)
				.to({ x: section.x + ANIMATION_CONFIG.SCREEN_SWIPE_DISTANCE }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
		});
	}

	/**
	 * Records task completion in GameContext and broadcasts to other players
	 * @param taskId The ID of the completed task
	 */
	private recordTaskCompletion(taskId: string): void {
		// Update task progress in GameContext
		if (!this.gameContext) return;

		const currentPlayer = this.gameContext.currentPlayer;
		const updatedTaskProgress = new Map(currentPlayer.taskProgress);
		updatedTaskProgress.set(taskId, {
			taskId: taskId,
			completed: true,
			completedAt: this.getNextTimestamp()
		});

		const updatedPlayer = {
			...currentPlayer,
			taskProgress: updatedTaskProgress,
			lastActiveAt: this.getNextTimestamp()
		};
		this.gameContext.updateCurrentPlayer(updatedPlayer);

		// Broadcast task completion to other players
		if (this.gameContext.gameMode.mode === "multi") {
			const message = {
				type: "taskCompletion",
				taskData: {
					playerId: this.gameContext.currentPlayer.id,
					taskId: taskId,
					completedAt: this.getNextTimestamp()
				}
			};
			this.scene.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	/**
	 * Shows shopping reward notification
	 * @param taskData The completed shopping task
	 */
	private showShoppingRewardNotification(taskData: TaskData): void {
		// Create achievement notification that slides in from the right
		const achievementNotification = new g.E({
			scene: this.scene,
			x: this.screenWidth, // Start off-screen to the right
			y: ANIMATION_CONFIG.SNS_ACHIEVEMENT_Y_OFFSET + 100, // Position below SNS notifications
		});

		// Background for notification
		const notificationBg = new g.FilledRect({
			scene: this.scene,
			width: 350,
			height: 80,
			x: 0,
			y: 0,
			cssColor: "#2980b9", // Blue color for shopping
		});
		achievementNotification.append(notificationBg);

		// Achievement text
		const achievementText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "white",
			}),
			text: `通販連携完了！ +${taskData.rewardPoints}pt\n通販アプリが利用可能に！`,
			x: 10,
			y: 15,
		});
		achievementNotification.append(achievementText);

		this.append(achievementNotification);

		// Animate notification: slide in, wait, slide out
		const timeline = new Timeline(this.scene);
		timeline.create(achievementNotification)
			.to({ x: this.screenWidth - ANIMATION_CONFIG.SNS_ACHIEVEMENT_POSITION_FROM_RIGHT }, ANIMATION_CONFIG.ACHIEVEMENT_SLIDE_DURATION)
			.wait(ANIMATION_CONFIG.ACHIEVEMENT_DISPLAY_DURATION + 500) // Longer display for shopping
			.to({ x: this.screenWidth }, ANIMATION_CONFIG.ACHIEVEMENT_SLIDE_DURATION)
			.call(() => {
				achievementNotification.destroy();
			});
	}

	/**
	 * Handles item purchase completion
	 * @param item The purchased item
	 */
	private onItemPurchased(item: ItemData): void {
		// Refresh item list to show newly purchased item
		this.itemList.refreshItems();

		// Check for collection completion and auto-complete tasks
		this.checkCollectionCompletion(item.category);

		// Notify timeline about the purchase to update button states
		if (this.timeline && this.isTimelineVisible) {
			this.timeline.onItemPurchasedExternal(item);
		}
	}

	/**
	 * Checks if collection is complete and auto-completes collection tasks
	 * @param category The category of the purchased item
	 */
	private checkCollectionCompletion(category: string): void {
		if (!this.itemManager.isCollectionComplete(category)) {
			return;
		}

		// Find and complete the corresponding collection task
		const taskId = `${category}_collection`;
		const task = this.taskManager.getTask(taskId);

		if (task && !task.completed) {
			// Complete the collection task automatically (not execute)
			this.taskManager.completeTask(taskId);
		}
	}

	/**
	 * Handles product sharing from shop
	 * @param item The item being shared
	 * @param sharedPrice The price at which it was shared
	 */
	private handleProductShare(item: ItemData, sharedPrice: number): void {
		if (!this.isTimelineVisible) {
			console.warn("Timeline not revealed yet, cannot share products");
			return;
		}

		// Get current player name from GameContext
		const playerName = this.gameContext.currentPlayer.profile.name;

		// Create shared post
		const postId = `affiliate_${++this.postIdCounter}`;
		const sharedPost = createSharedPost({
			id: postId,
			sharerId: this.gameContext.currentPlayer.id,
			sharerName: playerName,
			item: item,
			sharedPrice: sharedPrice,
			sharedAt: this.getNextTimestamp()
		});

		// Broadcast to all players
		const affiliateMessage: AffiliateBroadcastMessage = {
			playerId: this.gameContext.currentPlayer.id,
			playerName: playerName,
			sharedPost: sharedPost
		};

		const message = {
			type: "affiliatePostShared",
			affiliateData: affiliateMessage
		};

		this.scene.game.raiseEvent(new g.MessageEvent(message));

		// Add to local timeline (since broadcast handler only processes messages from other players)
		this.timeline.addSharedPost(sharedPost);
	}

	/**
	 * Handles affiliate purchase completion
	 * @param _postId The shared post ID (unused but required for callback interface)
	 * @param buyerName The buyer's name
	 * @param rewardPoints Affiliate reward points
	 */
	private handleAffiliatePurchase(_postId: string, buyerName: string, rewardPoints: number): void {
		// Add affiliate reward points to current player
		this.addScore(rewardPoints);

		// Show notification about affiliate reward
		this.showAffiliateRewardNotification(rewardPoints, buyerName);
	}

	/**
	 * Shows affiliate reward notification
	 * @param rewardPoints Points earned from affiliate
	 * @param buyerName Name of the buyer
	 */
	private showAffiliateRewardNotification(rewardPoints: number, buyerName: string): void {
		// Create achievement notification that slides in from the right
		const achievementNotification = new g.E({
			scene: this.scene,
			x: this.screenWidth, // Start off-screen to the right
			y: ANIMATION_CONFIG.SNS_ACHIEVEMENT_Y_OFFSET + 200, // Position below other notifications
		});

		// Background for notification
		const notificationBg = new g.FilledRect({
			scene: this.scene,
			width: 350,
			height: 80,
			x: 0,
			y: 0,
			cssColor: "#e67e22", // Orange color for affiliate
		});
		achievementNotification.append(notificationBg);

		// Achievement text
		const achievementText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "white",
			}),
			text: `アフィリエイト報酬獲得！ +${rewardPoints}pt\n${buyerName}さんが商品を購入しました！`,
			x: 10,
			y: 15,
		});
		achievementNotification.append(achievementText);

		this.append(achievementNotification);

		// Animate notification: slide in, wait, slide out
		const timeline = new Timeline(this.scene);
		timeline.create(achievementNotification)
			.to({ x: this.screenWidth - ANIMATION_CONFIG.SNS_ACHIEVEMENT_POSITION_FROM_RIGHT }, ANIMATION_CONFIG.ACHIEVEMENT_SLIDE_DURATION)
			.wait(ANIMATION_CONFIG.ACHIEVEMENT_DISPLAY_DURATION + 500) // Longer display for affiliate
			.to({ x: this.screenWidth }, ANIMATION_CONFIG.ACHIEVEMENT_SLIDE_DURATION)
			.call(() => {
				achievementNotification.destroy();
			});
	}

	/**
	 * Handles SNS connection request from disabled share button
	 * @param fromProfile Whether this request is from profile screen (true) or shop screen (false)
	 */
	private handleSnsConnectionRequest(fromProfile: boolean = false): void {
		if (fromProfile) {
			// From profile screen - execute task without screen transition
			this.executeSnsTask();
		} else {
			// From shop screen - go back to home first, then execute task
			if (this.isShopVisible) {
				this.switchBackFromShop();

				// Wait for shop-to-home animation to complete before executing SNS task
				// This prevents layout issues caused by modal interference during animation
				this.scene.setTimeout(() => {
					this.executeSnsTask();
				}, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION + 50); // Small buffer for animation completion
			} else {
				// If not in shop, execute immediately
				this.executeSnsTask();
			}
		}
	}

	/**
	 * Executes the SNS connection task
	 */
	private executeSnsTask(): void {
		const snsTask = this.taskManager.getTask("sns");
		if (snsTask) {
			try {
				const result = this.taskManager.executeTask(snsTask);
				if (!result.success) {
					console.warn(`SNS task execution failed: ${result.message}`);
				}
			} catch (error) {
				console.error("SNS task execution error:", error);
			}
		}
	}

	/**
	 * Handles shopping connection request from profile editor
	 * @param fromProfile Whether this request is from profile screen (true) or other locations (false)
	 */
	private handleShoppingConnectionRequest(fromProfile: boolean = false): void {
		if (fromProfile) {
			// From profile screen - execute task without screen transition to shop
			this.executeShoppingTaskFromProfile();
		} else {
			// From other locations - execute task and may transition to shop
			if (this.isShopVisible) {
				this.switchBackFromShop();

				// Wait for shop-to-home animation to complete before executing shopping task
				// This prevents layout issues caused by modal interference during animation
				this.scene.setTimeout(() => {
					this.executeShoppingTask();
				}, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION + 50); // Small buffer for animation completion
			} else {
				// If not in shop, execute immediately
				this.executeShoppingTask();
			}
		}
	}

	/**
	 * Executes the shopping connection task
	 */
	private executeShoppingTask(): void {
		const shoppingTask = this.taskManager.getTask("shopping");
		if (shoppingTask) {
			try {
				const result = this.taskManager.executeTask(shoppingTask);
				if (!result.success) {
					console.warn(`Shopping task execution failed: ${result.message}`);
				}
			} catch (error) {
				console.error("Shopping task execution error:", error);
			}
		}
	}

	/**
	 * Executes the shopping connection task from profile screen (without shop app reveal)
	 */
	private executeShoppingTaskFromProfile(): void {
		const shoppingTask = this.taskManager.getTask("shopping");
		if (shoppingTask && !shoppingTask.completed) {
			// Show shopping connection modal first
			this.showShoppingConnectionModal(shoppingTask);
		}
	}

	/**
	 * Shows shopping connection modal and handles task completion
	 */
	private showShoppingConnectionModal(shoppingTask: TaskData): void {
		// Close any existing modal first
		if (this.currentModal) {
			this.currentModal.destroy();
			this.currentModal = undefined;
		}

		const modalMessage = "通販サービスと連携しました！\n\n通販アプリが利用可能になりました。\n商品を購入してポイントを獲得しましょう！";

		this.currentModal = new ModalE({
			scene: this.scene,
			multi: this.gameContext.gameMode.mode === "multi",
			name: "shoppingConnectionModal",
			args: shoppingTask.id,
			title: "通販アプリ解放！",
			message: modalMessage,
			width: 500,
			height: 300,
			onClose: () => {
				this.currentModal = undefined;
			},
		});

		// Add OK button to modal
		this.currentModal.replaceCloseButton({
			text: "OK",
			width: 180,
			height: 120,
			onComplete: () => {
				// Complete task when OK is pressed
				this.completeShoppingTaskFromProfile(shoppingTask);
			}
		});

		// Append modal to scene
		this.scene.append(this.currentModal);
	}

	/**
	 * Completes shopping task from profile without automatic shop transition
	 */
	private completeShoppingTaskFromProfile(shoppingTask: TaskData): void {
		// Manually complete the task
		shoppingTask.completed = true;

		// Add points for task completion
		this.addScore(shoppingTask.rewardPoints, "task", `Task completed: ${shoppingTask.title}`);

		// Ensure shop app is available by revealing it without auto-open
		this.appList.revealShopApp(false); // false = don't auto-open

		// Remove task from UI
		this.taskList.completeTaskExternal(shoppingTask.id);
	}

	/**
	 * Closes the current modal
	 */
	private closeModal(): void {
		if (this.currentModal) {
			this.currentModal.destroy();
			this.currentModal = undefined;
		}
	}

	/**
	 * Creates a full screen overlay to prevent user interactions during swipe animations
	 */
	private createSwipeOverlay(): void {
		if (this.swipeOverlay) return;

		this.swipeOverlay = new g.FilledRect({
			scene: this.scene,
			width: this.screenWidth,
			height: this.screenHeight,
			x: 0,
			y: 0,
			cssColor: "transparent",
			touchable: true, // Block all touch events
			local: true
		});

		this.scene.append(this.swipeOverlay);
	}

	/**
	 * Removes the full screen overlay after swipe animation completes
	 */
	private removeSwipeOverlay(): void {
		if (this.swipeOverlay) {
			this.swipeOverlay.destroy();
			this.swipeOverlay = undefined;
		}
	}

	/**
	 * Reactivates a task button after modal closure
	 * @param taskId The ID of the task button to reactivate
	 */
	private reactivateTaskButton(taskId: string): void {
		if (this.taskList) {
			this.taskList.reactivateTaskButton(taskId);
		}
	}

	/**
	 * Gets the next incremental timestamp for consistent ordering
	 */
	private getNextTimestamp(): number {
		return ++this.timestampCounter;
	}
}
