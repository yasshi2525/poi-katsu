import { AppNavigationSectionE } from "./appNavigationSectionE";
import { BannerSectionE, BannerData } from "./bannerSectionE";
import { HeaderSectionE } from "./headerSectionE";
import { TaskSectionE, TaskData } from "./taskSectionE";
import { TimelineSectionE } from "./timelineSectionE";


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

		// Initialize game variables
		const gameVars = options.scene.game.vars as GameVars;
		const remainingSec = gameVars.totalTimeLimit;
		const score = gameVars.gameState.score;

		this.createComponents(options.width, options.height, score, remainingSec);
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
