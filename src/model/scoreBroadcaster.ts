/**
 * Score broadcast message data
 * Used to synchronize score information across all participants in multi mode
 */
interface ScoreBroadcastMessage {
	playerId: string;
	score: number;
}

/**
 * Score broadcaster utility for synchronizing scores across participants
 */
export class ScoreBroadcaster {
	private scene: g.Scene;

	constructor(scene: g.Scene) {
		this.scene = scene;
	}

	/**
	 * Broadcasts current player's score to other participants
	 */
	broadcastScore(score: number): void {
		if (!this.scene) return;

		const gameVars = this.scene.game.vars as GameVars;
		if (gameVars.mode === "multi" && this.scene.game.selfId) {
			// Also update in allPlayersScores for current player
			gameVars.allPlayersScores[this.scene.game.selfId] = score;

			const message = {
				type: "scoreUpdate",
				scoreData: {
					playerId: this.scene.game.selfId,
					score: score
				} as ScoreBroadcastMessage
			};

			this.scene.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	/**
	 * Gets all players' scores
	 */
	getAllPlayersScores(): { [playerId: string]: number } {
		const gameVars = this.scene.game.vars as GameVars;
		return { ...gameVars.allPlayersScores };
	}

	/**
	 * Gets a specific player's score
	 */
	getPlayerScore(playerId: string): number | undefined {
		const gameVars = this.scene.game.vars as GameVars;
		return gameVars.allPlayersScores[playerId];
	}

	/**
	 * Initializes current player's score in the scores collection
	 */
	initializeCurrentPlayerScore(initialScore: number): void {
		if (!this.scene?.game.selfId) return;

		const gameVars = this.scene.game.vars as GameVars;
		if (gameVars.mode === "multi") {
			gameVars.allPlayersScores[this.scene.game.selfId] = initialScore;
		}
	}

}
