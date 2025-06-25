import { Timeline } from "@akashic-extension/akashic-timeline";
import { AffiliateBroadcastMessage } from "../data/affiliateMessages";
import { GameContext } from "../data/gameContext";
import { ItemData } from "../data/itemData";
import { createSharedPost, SharedPostData } from "../data/sharedPostData";
import { TaskData } from "../data/taskData";
import { ItemManager } from "../manager/itemManager";
import { MarketManager } from "../manager/marketManager";
import { TaskManager, TaskExecutionContext } from "../manager/taskManager";
import { ScoreBroadcaster } from "../model/scoreBroadcaster";
import { AdBannerE, BannerData } from "./adBannerE";
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
	/** Function to update current player score in MainScene */
	updateCurrentPlayerScore: (score: number) => void;
	/** Function to transition to ranking scene */
	transitionToRanking: () => void;
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
	private scoreBroadcaster?: ScoreBroadcaster;
	private currentModal?: ModalE<string>;

	// Management systems
	private taskManager!: TaskManager;
	private itemManager!: ItemManager;
	private gameContext!: GameContext;
	private marketManager!: MarketManager;

	// MainScene function callbacks
	private updateCurrentPlayerScore!: (score: number) => void;
	private transitionToRanking!: () => void;

	// Screen state
	private readonly screenWidth: number;
	private readonly screenHeight: number;
	private isProfileEditorVisible: boolean = false;
	private isTimelineVisible: boolean = false;
	private isShopVisible: boolean = false;
	private isSettlementVisible: boolean = false;

	// Affiliate system
	private postIdCounter: number = 0;


	// Banner data
	private readonly banners: BannerData[] = [
		{
			id: "sale_campaign",
			priority: 1,
			title: "今だけ限定セール！",
			subtitle: "タップして詳細を見る",
			saleTag: "タップで50ptゲット！",
			backgroundColor: "#2c3e50",
			titleColor: "#f1c40f",
			subtitleColor: "white",
			saleTagColor: "#f39c12",
			clickHandler: () => this.onBannerClick("sale_campaign")
		},
		{
			id: "new_feature",
			priority: 2,
			title: "新機能リリース！",
			subtitle: "アフィリエイト機能を試してみよう",
			saleTag: "NEW!",
			backgroundColor: "#8e44ad",
			titleColor: "#ecf0f1",
			subtitleColor: "#bdc3c7",
			saleTagColor: "#e74c3c",
			clickHandler: () => this.onBannerClick("new_feature")
		},
		{
			id: "point_bonus",
			priority: 3,
			title: "ボーナスポイント実施中",
			subtitle: "今なら2倍ポイント還元",
			saleTag: "2倍!",
			backgroundColor: "#27ae60",
			titleColor: "white",
			subtitleColor: "#ecf0f1",
			saleTagColor: "#e67e22",
			clickHandler: () => this.onBannerClick("point_bonus")
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
		this.updateCurrentPlayerScore = options.updateCurrentPlayerScore;
		this.transitionToRanking = options.transitionToRanking;

		// Initialize game variables
		const gameVars = options.scene.game.vars as GameVars;
		const remainingSec = gameVars.totalTimeLimit;
		const score = gameVars.gameState.score;

		// Initialize managers
		this.initializeItemManager();
		this.initializeTaskManager();

		this.createComponents(options.width, options.height, score, remainingSec);
		this.initializeScoreBroadcaster(score);
	}

	/**
	 * Gets the current score
	 * @returns Current score
	 */
	getScore(): number {
		return this.header.getScore();
	}

	/**
	 * Adds points to the score
	 * @param points Points to add
	 */
	addScore(points: number): void {
		const currentScore = this.header.getScore();
		const newScore = currentScore + points;

		// Update game vars to keep score synchronized
		const gameVars = this.scene.game.vars as GameVars;
		gameVars.gameState.score = newScore;

		// Update header display
		this.header.setScore(newScore);

		// Update score in GameContext for settlement consistency
		this.updateCurrentPlayerScore(newScore);

		// Broadcast score to other participants
		if (this.scoreBroadcaster) {
			this.scoreBroadcaster.broadcastScore(newScore);
		}
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
	 * Switches to a specific banner by ID
	 * @param bannerId The ID of the banner to show
	 */
	switchToBanner(bannerId: string): void {
		this.adBanner.switchToBanner(bannerId);
	}

	/**
	 * Switches to the next priority banner
	 * @param currentBannerId Current banner ID to find the next one
	 */
	switchToNextBanner(currentBannerId?: string): void {
		this.adBanner.switchToNextBanner(currentBannerId);
	}

	/**
	 * Gets the ad banner component (for testing)
	 * @returns Ad banner component
	 */
	getAdBanner(): AdBannerE {
		return this.adBanner;
	}

	/**
	 * Gets the task list component (for testing)
	 * @returns Task list component
	 */
	getTaskList(): TaskListE {
		return this.taskList;
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
		this.addScore(rewardPoints);
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
			onScoreAdd: (points: number) => this.addScore(points),
			onProfileSwitch: () => this.switchToProfileEditor(),
			onTimelineReveal: () => this.revealTimeline(),
			onShopAppReveal: () => this.appList.revealShopApp(),
			onModalCreate: (modal: ModalE<string>) => {
				this.currentModal = modal;
				this.scene.append(modal);
			},
			onModalClose: () => this.closeModal(),
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
			}
		};

		this.taskManager = new TaskManager(context);
	}

	/**
	 * Creates all component sections
	 */
	private createComponents(width: number, height: number, score: number, remainingSec: number): void {
		// Note: header is created at scene level, not here

		// Create ad banner (adjusted for header and item list)
		this.adBanner = new AdBannerE({
			scene: this.scene,
			width: width,
			height: height - 140, // Reduced by item list height
			banners: this.banners,
			y: 140 // Below header + item list
		});
		this.append(this.adBanner);

		// Create task list (adjusted for header and item list) - now using TaskManager's tasks
		this.taskList = new TaskListE({
			scene: this.scene,
			width: width,
			height: height - 140, // Reduced by item list height
			tasks: this.taskManager.getTasks(),
			onTaskExecute: (taskData: TaskData) => this.onTaskExecute(taskData),
			onTaskComplete: () => { /* Score addition is now handled by TaskManager */ },
			y: 140 // Below header + item list
		});
		this.append(this.taskList);

		// Create timeline (adjusted for header and item list, initially hidden)
		this.timeline = new TimelineE({
			scene: this.scene,
			width: width,
			height: height - 140, // Reduced by item list height
			opacity: 0, // Initially hide timeline completely - will be shown after SNS task completion
			y: 140, // Below header + item list
			itemManager: this.itemManager,
			onAffiliatePurchase: (postId: string, buyerName: string, rewardPoints: number) =>
				this.handleAffiliatePurchase(postId, buyerName, rewardPoints),
			onCheckPoints: () => this.getScore(),
			onDeductPoints: (amount: number) => this.addScore(-amount),
			onItemPurchased: (item: ItemData) => this.onItemPurchased(item),
			onCheckOwnership: (itemId: string) => this.itemManager.ownsItem(itemId),
			onGetPlayerName: () => {
				const gameVars = this.scene.game.vars as GameVars;
				return gameVars.playerProfile.name;
			}
		});
		this.timeline.hide();
		this.append(this.timeline);

		// Create app list (adjusted for header and item list)
		this.appList = new AppListE({
			scene: this.scene,
			width: width,
			height: height - 140, // Reduced by item list height
			onShopClick: () => this.switchToShop(),
			onSettlementClick: () => this.switchToSettlement(false), // false = manual settlement
			onAutomaticSettlementClick: () => this.switchToSettlement(true), // true = automatic settlement
			y: 140 // Below header + item list
		});
		this.append(this.appList);

		// Create item list (positioned right below header)
		this.itemList = new ItemListE({
			scene: this.scene,
			width: width,
			height: 60, // Compact height for horizontal layout
			itemManager: this.itemManager,
			y: 80 // Right below header
		});
		this.append(this.itemList);
	}

	/**
	 * Initializes the score broadcaster for multi-player score synchronization
	 */
	private initializeScoreBroadcaster(initialScore: number): void {
		this.scoreBroadcaster = new ScoreBroadcaster(this.scene);
		this.scoreBroadcaster.initializeCurrentPlayerScore(initialScore);
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

		// Create profile editor positioned off-screen to the right
		this.profileEditor = new ProfileEditorE({
			scene: this.scene,
			width: this.screenWidth,
			height: this.screenHeight,
			x: this.screenWidth, // Start off-screen to the right
			y: 0,
			onComplete: () => this.switchBackToHome(),
			onProfileChange: () => this.updateHeaderWithCurrentProfile()
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
			.to({ x: 0 }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
	}

	/**
	 * Switches back from ProfileEditorE to HomeE with swipe animation
	 */
	private switchBackToHome(): void {
		if (!this.isProfileEditorVisible || !this.profileEditor) return;

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
	 * Updates the header with current profile data from gameVars
	 */
	private updateHeaderWithCurrentProfile(): void {
		const gameVars = this.scene.game.vars as GameVars;
		this.header.setPlayerProfile(gameVars.playerProfile.name, gameVars.playerProfile.avatar);

		// Also update the GameContext with the new profile for ranking consistency
		this.updateCurrentPlayerProfileInGameContext(gameVars.playerProfile.name, gameVars.playerProfile.avatar);
	}

	/**
	 * Updates current player profile in GameContext
	 */
	private updateCurrentPlayerProfileInGameContext(name: string, avatar: string): void {
		if (!this.gameContext) return;

		const currentPlayer = this.gameContext.currentPlayer;
		const updatedPlayer = {
			...currentPlayer,
			profile: { name, avatar },
			lastActiveAt: this.scene.game.age
		};
		this.gameContext.updateCurrentPlayer(updatedPlayer);
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
	 * Handles banner click events
	 * @param bannerId The ID of the clicked banner
	 */
	private onBannerClick(bannerId: string): void {
		switch (bannerId) {
			case "sale_campaign":
				// Add 50 points for sale campaign
				this.addScore(50);
				// Switch to next banner
				this.switchToNextBanner(bannerId);
				break;
			case "new_feature":
				// Just switch to next banner for now
				this.switchToNextBanner(bannerId);
				break;
			case "point_bonus":
				// Add bonus points
				this.addScore(25);
				// Switch to next banner
				this.switchToNextBanner(bannerId);
				break;
			default:
				// Unknown banner, just switch
				this.switchToNextBanner(bannerId);
				break;
		}
	}




	/**
	 * Reveals timeline with fade-in animation
	 */
	private revealTimeline(): void {
		if (this.isTimelineVisible) return;

		this.isTimelineVisible = true;

		// Make timeline visible first
		this.timeline.show();

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
				width: this.screenWidth,
				height: this.screenHeight,
				x: this.screenWidth, // Start off-screen to the right
				y: 0,
				itemManager: this.itemManager,
				marketManager: this.marketManager,
				onCheckPoints: () => this.getScore(),
				onDeductPoints: (amount: number) => this.addScore(-amount),
				onItemPurchased: (item: ItemData) => this.onItemPurchased(item),
				onBack: () => this.switchBackFromShop(),
				onGetRemainingTime: () => this.getRemainingTime(),
				onIsTimelineRevealed: () => this.isTimelineVisible,
				onShareProduct: (item: ItemData, sharedPrice: number) => this.handleProductShare(item, sharedPrice),
				onSnsConnectionRequest: () => this.handleSnsConnectionRequest()
			});
			this.append(this.shop);
		} else {
			// Reposition existing shop off-screen for animation
			this.shop.x = this.screenWidth;
		}

		this.isShopVisible = true;

		// Create swipe animation: HomeE slides left, ShopE slides in from right
		const timeline = new Timeline(this.scene);

		// Animate HomeE sections sliding out to the left
		this.getHomeSections().forEach(section => {
			timeline.create(section)
				.to({ x: section.x - ANIMATION_CONFIG.SCREEN_SWIPE_DISTANCE }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
		});

		// Animate ShopE sliding in from the right
		timeline.create(this.shop)
			.to({ x: 0 }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
	}

	/**
	 * Switches back from ShopE to HomeE with swipe animation
	 */
	private switchBackFromShop(): void {
		if (!this.isShopVisible || !this.shop) return;

		// Create swipe animation: ShopE slides right, HomeE slides in from left
		const timeline = new Timeline(this.scene);

		// Animate ShopE sliding out to the right
		timeline.create(this.shop)
			.to({ x: this.screenWidth }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION)
			.call(() => {
				// Don't destroy shop - keep it for reuse, just mark as not visible
				this.isShopVisible = false;
			});

		// Animate HomeE sections sliding back in from the left
		this.getHomeSections().forEach(section => {
			timeline.create(section)
				.to({ x: section.x + ANIMATION_CONFIG.SCREEN_SWIPE_DISTANCE }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
		});
	}

	/**
	 * Switches from HomeE to SettlementE with swipe animation
	 * @param isAutomatic Whether this is automatic settlement triggered by timer
	 */
	private switchToSettlement(isAutomatic: boolean = false): void {
		if (this.isSettlementVisible) return;

		// Create or reuse settlement positioned off-screen to the right
		if (!this.settlement) {
			this.settlement = new SettlementE({
				scene: this.scene,
				gameContext: this.gameContext,
				itemManager: this.itemManager,
				transitionToRanking: this.transitionToRanking
			});
			this.settlement.x = this.screenWidth; // Start off-screen to the right
			this.settlement.y = 0;
			this.append(this.settlement);
		} else {
			// Reposition existing settlement off-screen for animation
			this.settlement.x = this.screenWidth;
		}

		// Set automatic mode if this is automatic settlement
		this.settlement.setAutomaticMode(isAutomatic);

		this.isSettlementVisible = true;

		// Create swipe animation: HomeE slides left, SettlementE slides in from right
		const timeline = new Timeline(this.scene);

		// Animate HomeE sections sliding out to the left
		this.getHomeSections().forEach(section => {
			timeline.create(section)
				.to({ x: section.x - ANIMATION_CONFIG.SCREEN_SWIPE_DISTANCE }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
		});

		// Animate SettlementE sliding in from the right
		timeline.create(this.settlement)
			.to({ x: 0 }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION);
	}

	/**
	 * Switches back from SettlementE to HomeE with swipe animation
	 */
	private switchBackFromSettlement(): void {
		if (!this.isSettlementVisible || !this.settlement) return;

		// Create swipe animation: SettlementE slides right, HomeE slides in from left
		const timeline = new Timeline(this.scene);

		// Animate SettlementE sliding out to the right
		timeline.create(this.settlement)
			.to({ x: this.screenWidth }, ANIMATION_CONFIG.SCREEN_SWIPE_DURATION)
			.call(() => {
				// Don't destroy settlement - keep it for reuse, just mark as not visible
				this.isSettlementVisible = false;
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
			completedAt: this.scene.game.age
		});

		const updatedPlayer = {
			...currentPlayer,
			taskProgress: updatedTaskProgress,
			lastActiveAt: this.scene.game.age
		};
		this.gameContext.updateCurrentPlayer(updatedPlayer);

		// Broadcast task completion to other players
		const gameVars = this.scene.game.vars as GameVars;
		if (gameVars.mode === "multi" && this.scene.game.selfId) {
			const message = {
				type: "taskCompletion",
				taskData: {
					playerId: this.scene.game.selfId,
					taskId: taskId,
					completedAt: this.scene.game.age
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
	 * @param _item The purchased item (unused but required for callback interface)
	 */
	private onItemPurchased(_item: ItemData): void {
		// Refresh item list to show newly purchased item
		this.itemList.refreshItems();
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

		// Get current player name from game vars
		const gameVars = this.scene.game.vars as GameVars;
		const playerName = gameVars.playerProfile.name;

		// Create shared post
		const postId = `affiliate_${++this.postIdCounter}`;
		const sharedPost = createSharedPost({
			id: postId,
			sharerId: this.scene.game.selfId || "unknown",
			sharerName: playerName,
			item: item,
			sharedPrice: sharedPrice,
			sharedAt: this.scene.game.age
		});

		// Broadcast to all players
		const affiliateMessage: AffiliateBroadcastMessage = {
			playerId: this.scene.game.selfId || "unknown",
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
	 */
	private handleSnsConnectionRequest(): void {
		// First, go back to home if we're in shop
		if (this.isShopVisible) {
			this.switchBackFromShop();
		}

		// Get and execute the SNS task
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
	 * Closes the current modal
	 */
	private closeModal(): void {
		if (this.currentModal) {
			this.currentModal.destroy();
			this.currentModal = undefined;
		}
	}
}
