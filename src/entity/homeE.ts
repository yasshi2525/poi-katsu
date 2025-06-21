import { Timeline } from "@akashic-extension/akashic-timeline";
import { ScoreBroadcaster } from "../model/scoreBroadcaster";
import { AppNavigationSectionE } from "./appNavigationSectionE";
import { BannerSectionE, BannerData } from "./bannerSectionE";
import { HeaderSectionE } from "./headerSectionE";
import { ProfileEditorE } from "./profileEditorE";
import { TaskSectionE, TaskData } from "./taskSectionE";
import { TimelineSectionE } from "./timelineSectionE";


/**
 * Animation configuration constants
 */
const ANIMATION_CONFIG = {
	SCREEN_SWIPE_DURATION: 500,
	SCREEN_SWIPE_DISTANCE: 720,
	ACHIEVEMENT_SLIDE_DURATION: 500,
	ACHIEVEMENT_DISPLAY_DURATION: 2000,
	ACHIEVEMENT_POSITION_FROM_RIGHT: 320,
} as const;

/**
 * Parameter object for Home
 */
export interface HomeParameterObject extends g.EParameterObject {
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
}

/**
 * Home screen entity that displays the main game interface
 * Includes score, promotional banner, task list, timeline, and app navigation
 */
export class HomeE extends g.E {
	static assetIds: string[] = [...HeaderSectionE.assetIds, ...TaskSectionE.assetIds];

	// Component sections
	private headerSection!: HeaderSectionE;
	private bannerSection!: BannerSectionE;
	private taskSection!: TaskSectionE;
	private timelineSection!: TimelineSectionE;
	private appNavigationSection!: AppNavigationSectionE;
	private profileEditor?: ProfileEditorE;
	private scoreBroadcaster?: ScoreBroadcaster;

	// Screen state
	private readonly screenWidth: number;
	private readonly screenHeight: number;
	private isProfileEditorVisible: boolean = false;

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
		return this.headerSection.getScore();
	}

	/**
	 * Adds points to the score
	 * @param points Points to add
	 */
	addScore(points: number): void {
		const currentScore = this.headerSection.getScore();
		const newScore = currentScore + points;

		// Update game vars to keep score synchronized
		const gameVars = this.scene.game.vars as GameVars;
		gameVars.gameState.score = newScore;

		// Update header section
		this.headerSection.setScore(newScore);

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
		this.headerSection.setTime(newRemainSecond);
	}

	/**
	 * Switches to a specific banner by ID
	 * @param bannerId The ID of the banner to show
	 */
	switchToBanner(bannerId: string): void {
		this.bannerSection.switchToBanner(bannerId);
	}

	/**
	 * Switches to the next priority banner
	 * @param currentBannerId Current banner ID to find the next one
	 */
	switchToNextBanner(currentBannerId?: string): void {
		this.bannerSection.switchToNextBanner(currentBannerId);
	}

	/**
	 * Gets the banner section component (for testing)
	 * @returns Banner section component
	 */
	getBannerSection(): BannerSectionE {
		return this.bannerSection;
	}

	/**
	 * Gets the task section component (for testing)
	 * @returns Task section component
	 */
	getTaskSection(): TaskSectionE {
		return this.taskSection;
	}


	/**
	 * Creates all component sections
	 */
	private createComponents(width: number, height: number, score: number, remainingSec: number): void {
		// Create header section (full screen, positioned internally)
		this.headerSection = new HeaderSectionE({
			scene: this.scene,
			width: width,
			height: height,
			score: score,
			remainingSec: remainingSec
		});
		this.append(this.headerSection);

		// Create banner section (full screen, positioned internally)
		this.bannerSection = new BannerSectionE({
			scene: this.scene,
			width: width,
			height: height,
			banners: this.banners
		});
		this.append(this.bannerSection);

		// Create task section (full screen, positioned internally)
		this.taskSection = new TaskSectionE({
			scene: this.scene,
			width: width,
			height: height,
			tasks: this.tasks,
			onTaskExecute: (taskData: TaskData) => this.onTaskExecute(taskData),
			onTaskComplete: (taskData: TaskData) => this.addScore(taskData.rewardPoints)
		});
		this.append(this.taskSection);

		// Create timeline section (full screen, positioned internally)
		this.timelineSection = new TimelineSectionE({
			scene: this.scene,
			width: width,
			height: height
		});
		this.append(this.timelineSection);

		// Create app navigation section (full screen, positioned internally)
		this.appNavigationSection = new AppNavigationSectionE({
			scene: this.scene,
			width: width,
			height: height
		});
		this.append(this.appNavigationSection);
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
		} else {
			// For other tasks, use the default modal behavior
			// This will be handled by the task section itself
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
	 * Gets all home screen sections for animation
	 * @returns Array of home screen sections
	 */
	private getHomeSections(): g.E[] {
		return [
			this.headerSection,
			this.bannerSection,
			this.taskSection,
			this.timelineSection,
			this.appNavigationSection
		];
	}

	/**
	 * Updates the header section with current profile data from gameVars
	 */
	private updateHeaderWithCurrentProfile(): void {
		const gameVars = this.scene.game.vars as GameVars;
		this.headerSection.setPlayerProfile(gameVars.playerProfile.name, gameVars.playerProfile.avatar);
	}

	/**
	 * Completes the profile task and shows achievement effect
	 */
	private completeProfileTask(): void {
		const profileTask = this.tasks.find(task => task.id === "profile");
		if (profileTask && !profileTask.completed) {
			// Use TaskSectionE's external completion method to handle visual removal
			this.taskSection.completeTaskExternal("profile");
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
}
