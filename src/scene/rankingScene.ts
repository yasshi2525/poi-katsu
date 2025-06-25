import { GameContext } from "../data/gameContext";
import { PlayerRankingE } from "../entity/playerRankingE";
import { PointManager } from "../manager/pointManager";
import { BaseScene } from "./baseScene";

/**
 * Ranking scene for displaying final game results
 * Based on specification section 2.8 ランキング画面 (RankingScene)
 */
export class RankingScene extends BaseScene {
	private gameContext: GameContext;
	private pointManager: PointManager;
	private rankingDisplay?: PlayerRankingE;

	constructor(param: g.SceneParameterObject & { gameContext: GameContext; pointManager: PointManager }) {
		super({
			...param,
			assetIds: [
				...param.assetIds ?? [],
				...PlayerRankingE.assetIds || []
			]
		});

		this.gameContext = param.gameContext;
		this.pointManager = param.pointManager;

		this.onLoad.add(() => {
			this.setupRankingDisplay();
		});
	}


	/**
	 * Gets the ranking display for testing
	 */
	getRankingDisplayForTesting(): PlayerRankingE | undefined {
		return this.rankingDisplay;
	}

	/**
	 * Sets up the ranking display
	 */
	private setupRankingDisplay(): void {
		this.rankingDisplay = new PlayerRankingE({
			scene: this,
			gameContext: this.gameContext,
			pointManager: this.pointManager
		});

		this.append(this.rankingDisplay);
	}

	/**
	 * Called when scene becomes active
	 */
	protected override onSwipeIn(): void {
		if (this.rankingDisplay) {
			this.rankingDisplay.show();
		}
	}

	/**
	 * Called when scene becomes inactive
	 */
	protected override onSwipeOut(): void {
		if (this.rankingDisplay) {
			this.rankingDisplay.hide();
		}
	}
}
