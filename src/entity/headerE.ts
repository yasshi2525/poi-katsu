import { PointDisplayE } from "./pointDisplayE";

/**
 * Parameter object for Header
 */
export interface HeaderParameterObject extends g.EParameterObject {
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Initial score */
	score: number;
	/** Initial remaining time in seconds */
	remainingSec: number;
}

/**
 * Fixed header component that displays score, time, and player profile
 * Always stays at the top of the screen regardless of current scene
 * Uses PointDisplayE for consistent display logic
 */
export class HeaderE extends g.E {
	static assetIds: string[] = [...PointDisplayE.assetIds];

	private pointDisplay: PointDisplayE;

	/**
	 * Creates a new Header instance
	 * @param options Configuration options for the header
	 */
	constructor(options: HeaderParameterObject) {
		super(options);

		// Create PointDisplayE positioned for header
		this.pointDisplay = new PointDisplayE({
			scene: options.scene,
			width: options.width,
			height: 80, // Header height
			score: options.score,
			remainingSec: options.remainingSec,
			x: 0,
			y: 0
		});
		this.append(this.pointDisplay);
	}

	/**
	 * Updates the displayed score
	 * @param score New score value
	 */
	setScore(score: number): void {
		this.pointDisplay.setScore(score);
	}

	/**
	 * Gets the current score
	 * @returns Current score
	 */
	getScore(): number {
		return this.pointDisplay.getScore();
	}

	/**
	 * Updates the displayed time
	 * @param remainingSec Remaining time in seconds
	 */
	setTime(remainingSec: number): void {
		this.pointDisplay.setTime(remainingSec);
	}

	/**
	 * Updates player profile display
	 * @param name Player name
	 * @param avatar Player avatar
	 */
	setPlayerProfile(name: string, avatar: string): void {
		this.pointDisplay.setPlayerProfile(name, avatar);
	}
}
