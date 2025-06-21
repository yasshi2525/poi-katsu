import { NumberE } from "./numberE";

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
 * Parameter object for HeaderSection
 */
export interface HeaderSectionParameterObject extends g.EParameterObject {
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Initial score value */
	score: number;
	/** Initial remaining time in seconds */
	remainingSec: number;
}

/**
 * Header section component that displays score and time
 */
export class HeaderSectionE extends g.E {
	static assetIds: string[] = [...NumberE.assetIds];

	private score: number;
	private remainingSec: number;
	private readonly layout: LayoutConfig;

	// Score display components
	private scorePrefixLabel!: g.Label;
	private scoreNumberE!: NumberE;

	// Time display components
	private timePrefixLabel!: g.Label;
	private timeNumberE!: NumberE;

	/**
	 * Creates a new HeaderSection instance
	 * @param options Configuration options for the header section
	 */
	constructor(options: HeaderSectionParameterObject) {
		super(options);

		this.score = options.score;
		this.remainingSec = options.remainingSec;
		this.layout = this.createLayoutConfig(options.width, options.height);

		this.createLayout();
		this.updateScore();
		this.updateTime();
	}

	/**
	 * Gets the current score
	 * @returns Current score
	 */
	getScore(): number {
		return this.score;
	}

	/**
	 * Sets the score value and updates display
	 * @param score New score value
	 */
	setScore(score: number): void {
		this.score = score;
		this.updateScore();
	}

	/**
	 * Sets the remaining time and updates display
	 * @param remainingSec Remaining time in seconds
	 */
	setTime(remainingSec: number): void {
		this.remainingSec = remainingSec;
		this.updateTime();
	}

	/**
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, _screenHeight: number): LayoutConfig {
		return {
			x: 0,
			y: 0,
			width: screenWidth,
			height: 60,
			children: {
				score: {
					x: 20,
					y: 20,
					width: 160,
					height: 20,
					children: {
						prefix: { x: 0, y: 0, width: 80, height: 20 },
						number: { x: 80, y: 0, width: 80, height: 20 }
					}
				},
				time: {
					x: screenWidth - 300,
					y: 25,
					width: 160,
					height: 16,
					children: {
						prefix: { x: 0, y: 0, width: 80, height: 16 },
						number: { x: 80, y: 0, width: 80, height: 16 }
					}
				}
			}
		};
	}

	/**
	 * Creates the overall layout structure
	 */
	private createLayout(): void {
		// Header background
		const headerBg = new g.FilledRect({
			scene: this.scene,
			width: this.layout.width,
			height: this.layout.height,
			x: this.layout.x,
			y: this.layout.y,
			cssColor: "#1a237e",
		});
		this.append(headerBg);

		// Score display
		this.createScoreDisplay();

		// Time display
		this.createTimeDisplay();
	}

	/**
	 * Creates the score display with prefix label and NumberE
	 */
	private createScoreDisplay(): void {
		const scoreLayout = this.layout.children!.score;
		const prefixLayout = scoreLayout.children!.prefix;
		const numberLayout = scoreLayout.children!.number;

		// Score prefix label
		this.scorePrefixLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 20,
				fontColor: "white",
			}),
			text: "スコア：",
			x: scoreLayout.x + prefixLayout.x,
			y: scoreLayout.y + prefixLayout.y,
		});
		this.append(this.scorePrefixLabel);

		// Score number using NumberE
		this.scoreNumberE = new NumberE({
			scene: this.scene,
			value: this.score,
			x: scoreLayout.x + numberLayout.x,
			y: scoreLayout.y + numberLayout.y,
		});
		this.append(this.scoreNumberE);
	}

	/**
	 * Creates the time display with prefix label and NumberE component
	 */
	private createTimeDisplay(): void {
		const timeLayout = this.layout.children!.time;
		const prefixLayout = timeLayout.children!.prefix;
		const numberLayout = timeLayout.children!.number;

		// Time prefix label
		this.timePrefixLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: "white",
			}),
			text: "残り時間：",
			x: timeLayout.x + prefixLayout.x,
			y: timeLayout.y + prefixLayout.y,
		});
		this.append(this.timePrefixLabel);

		// Time using NumberE with 3-digit format
		this.timeNumberE = new NumberE({
			scene: this.scene,
			value: this.remainingSec,
			digits: 3,
			x: timeLayout.x + numberLayout.x,
			y: timeLayout.y + numberLayout.y,
		});
		this.append(this.timeNumberE);
	}

	/**
	 * Updates the score display
	 */
	private updateScore(): void {
		if (this.scoreNumberE) {
			this.scoreNumberE.value = this.score;
		}
	}

	/**
	 * Updates the time display
	 */
	private updateTime(): void {
		if (this.timeNumberE) {
			this.timeNumberE.value = this.remainingSec;
		}
	}
}
