import { Timeline } from "@akashic-extension/akashic-timeline";
import { ScoreBroadcaster } from "../model/scoreBroadcaster";
import { AdBannerE, BannerData } from "./adBannerE";
import { AppListE } from "./appListE";
import { HeaderE } from "./headerE";
import { ModalE } from "./modalE";
import { PointDisplayE } from "./pointDisplayE";
import { ProfileEditorE } from "./profileEditorE";
import { ShopE } from "./shopE";
import { TaskListE, TaskData } from "./taskListE";
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
	private profileEditor?: ProfileEditorE;
	private shop?: ShopE;
	private scoreBroadcaster?: ScoreBroadcaster;
	private currentModal?: ModalE<string>;

	// Screen state
	private readonly screenWidth: number;
	private readonly screenHeight: number;
	private isProfileEditorVisible: boolean = false;
	private isTimelineVisible: boolean = false;
	private isShopVisible: boolean = false;

	// Task data
	private readonly tasks: TaskData[] = [
		{
			id: "profile",
			icon: "👤",
			title: "プロフィールを設定する",
			reward: "50pt",
			rewardPoints: 50,
			completed: false
		},
		{
			id: "shopping",
			icon: "🛒",
			title: "通販サービスと連携する",
			reward: "100pt",
			rewardPoints: 100,
			completed: false
		},
		{
			id: "sns",
			icon: "📱",
			title: "SNSと連携する",
			reward: "100pt",
			rewardPoints: 100,
			completed: false
		},
	];

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

		// Initialize game variables
		const gameVars = options.scene.game.vars as GameVars;
		const remainingSec = gameVars.totalTimeLimit;
		const score = gameVars.gameState.score;

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
	 * Creates all component sections
	 */
	private createComponents(width: number, height: number, score: number, remainingSec: number): void {
		// Note: header is created at scene level, not here

		// Create ad banner (adjusted for header)
		this.adBanner = new AdBannerE({
			scene: this.scene,
			width: width,
			height: height - 80,
			banners: this.banners,
			y: 80
		});
		this.append(this.adBanner);

		// Create task list (adjusted for header)
		this.taskList = new TaskListE({
			scene: this.scene,
			width: width,
			height: height - 80,
			tasks: this.tasks,
			onTaskExecute: (taskData: TaskData) => this.onTaskExecute(taskData),
			onTaskComplete: (taskData: TaskData) => this.addScore(taskData.rewardPoints),
			y: 80
		});
		this.append(this.taskList);

		// Create timeline (adjusted for header, initially hidden)
		this.timeline = new TimelineE({
			scene: this.scene,
			width: width,
			height: height - 80,
			opacity: 0, // Initially hide timeline completely - will be shown after SNS task completion
			y: 80
		});
		this.timeline.hide();
		this.append(this.timeline);

		// Create app list (adjusted for header)
		this.appList = new AppListE({
			scene: this.scene,
			width: width,
			height: height - 80,
			onShopClick: () => this.switchToShop(),
			y: 80
		});
		this.append(this.appList);
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
	 * @param taskData The task data for the executed task
	 */
	private onTaskExecute(taskData: TaskData): void {
		if (taskData.id === "profile") {
			this.switchToProfileEditor();
		} else if (taskData.id === "sns") {
			this.handleSnsTaskExecution(taskData);
		} else if (taskData.id === "shopping") {
			this.handleShoppingTaskExecution(taskData);
		} else {
			// For other tasks, use the default modal behavior
			// This will be handled by the task section itself
		}
	}

	/**
	 * Handles SNS task execution with timeline unlock
	 * @param taskData The SNS task data
	 */
	private handleSnsTaskExecution(taskData: TaskData): void {
		// Show modal explaining timeline feature
		this.showTimelineUnlockModal(taskData);
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
				// Complete the profile task
				this.completeProfileTask();
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
			this.appList
		];
	}

	/**
	 * Updates the header with current profile data from gameVars
	 */
	private updateHeaderWithCurrentProfile(): void {
		const gameVars = this.scene.game.vars as GameVars;
		this.header.setPlayerProfile(gameVars.playerProfile.name, gameVars.playerProfile.avatar);
	}

	/**
	 * Completes the profile task and shows achievement effect
	 */
	private completeProfileTask(): void {
		const profileTask = this.tasks.find(task => task.id === "profile");
		if (profileTask && !profileTask.completed) {
			// Use TaskListE's external completion method to handle visual removal
			this.taskList.completeTaskExternal("profile");
			// Show achievement effect for profile completion
			this.showAchievementEffect(profileTask);
		}
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
	 * Shows modal explaining timeline feature unlock
	 * @param taskData The SNS task data
	 */
	private showTimelineUnlockModal(taskData: TaskData): void {
		// Close any existing modal first
		if (this.currentModal) {
			this.closeModal();
		}

		const modalMessage = "SNSと連携しました！\n\nタイムライン機能が利用可能になりました。\n他のユーザーの投稿を見て、いいねやコメントでポイントを獲得しましょう！";

		this.currentModal = new ModalE({
			scene: this.scene,
			name: "timelineUnlockModal",
			args: taskData.id,
			title: "タイムライン機能解放！",
			message: modalMessage,
			width: 500,
			height: 300,
			onClose: () => this.closeModal(),
		});

		// Add OK button to modal
		this.addTimelineModalButton(taskData);

		// Append modal to scene to ensure it's always on top
		if (this.currentModal) {
			this.scene.append(this.currentModal);
		}
	}

	/**
	 * Adds OK button to timeline unlock modal by replacing the close button
	 * @param taskData The task data for the button
	 */
	private addTimelineModalButton(taskData: TaskData): void {
		if (!this.currentModal) return;

		// Replace close button with custom OK button
		// Use the original close button position (bottom right of modal)
		this.currentModal.replaceCloseButton({
			text: "OK",
			backgroundColor: "#27ae60",
			textColor: "white",
			fontSize: 14,
			width: 80,
			height: 35,
			// Don't override x,y - use the original close button position
			onComplete: () => {
				this.completeSnsTask(taskData);
			}
		});
	}

	/**
	 * Completes SNS task and reveals timeline
	 * @param taskData The SNS task data
	 */
	private completeSnsTask(taskData: TaskData): void {
		// Mark task as completed
		this.taskList.completeTaskExternal(taskData.id);

		// Add score reward
		this.addScore(taskData.rewardPoints);

		// Show timeline reveal animation with delay to ensure modal is properly closed
		this.scene.setTimeout(() => {
			this.revealTimeline();
		}, ANIMATION_CONFIG.MODAL_CLOSE_DELAY);

		// Show achievement notification
		this.showSnsRewardNotification(taskData);
	}

	/**
	 * Reveals timeline with fade-in animation
	 */
	private revealTimeline(): void {
		if (this.isTimelineVisible) return;

		this.isTimelineVisible = true;

		// Make timeline visible first
		this.timeline.show();

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
	 * Handles shopping task execution with shop app reveal
	 * @param taskData The shopping task data
	 */
	private handleShoppingTaskExecution(taskData: TaskData): void {
		// Show modal explaining shopping app feature
		this.showShoppingUnlockModal(taskData);
	}

	/**
	 * Shows modal explaining shopping app feature unlock
	 * @param taskData The shopping task data
	 */
	private showShoppingUnlockModal(taskData: TaskData): void {
		// Close any existing modal first
		if (this.currentModal) {
			this.closeModal();
		}

		const modalMessage = "通販サービスと連携しました！\n\n通販アプリが利用可能になりました。\n商品を購入してポイントを獲得しましょう！";

		this.currentModal = new ModalE({
			scene: this.scene,
			name: "shoppingUnlockModal",
			args: taskData.id,
			title: "通販アプリ解放！",
			message: modalMessage,
			width: 500,
			height: 300,
			onClose: () => this.closeModal(),
		});

		// Add OK button to modal
		this.addShoppingModalButton(taskData);

		// Append modal to scene to ensure it's always on top
		if (this.currentModal) {
			this.scene.append(this.currentModal);
		}
	}

	/**
	 * Adds OK button to shopping unlock modal by replacing the close button
	 * @param taskData The task data for the button
	 */
	private addShoppingModalButton(taskData: TaskData): void {
		if (!this.currentModal) return;

		// Replace close button with custom OK button
		this.currentModal.replaceCloseButton({
			text: "OK",
			backgroundColor: "#2980b9",
			textColor: "white",
			fontSize: 14,
			width: 80,
			height: 35,
			onComplete: () => {
				this.completeShoppingTask(taskData);
			}
		});
	}

	/**
	 * Completes shopping task and reveals shop app
	 * @param taskData The shopping task data
	 */
	private completeShoppingTask(taskData: TaskData): void {
		// Mark task as completed
		this.taskList.completeTaskExternal(taskData.id);

		// Reveal shop app in AppList with delay to ensure modal is properly closed
		this.scene.setTimeout(() => {
			this.appList.revealShopApp();
		}, ANIMATION_CONFIG.MODAL_CLOSE_DELAY);

		// Show achievement notification
		this.showShoppingRewardNotification(taskData);
	}

	/**
	 * Switches from HomeE to ShopE with swipe animation
	 */
	private switchToShop(): void {
		if (this.isShopVisible) return;

		// Create or reuse shop positioned off-screen to the right
		if (!this.shop) {
			this.shop = new ShopE({
				scene: this.scene,
				width: this.screenWidth,
				height: this.screenHeight,
				x: this.screenWidth, // Start off-screen to the right
				y: 0,
				onBack: () => this.switchBackFromShop()
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
	 * Closes the current modal
	 */
	private closeModal(): void {
		if (this.currentModal) {
			this.currentModal.destroy();
			this.currentModal = undefined;
		}
	}
}
