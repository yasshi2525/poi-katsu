
import { GameContext } from "../data/gameContext";
import { createPointEarnedNotification } from "../data/notificationData";
import { PlayerData, updatePlayerPoints } from "../data/playerData";

/**
 * Point transaction record for audit and history
 */
export interface PointTransaction {
	/** Unique transaction ID */
	id: string;
	/** Player ID who earned/lost points */
	playerId: string;
	/** Points amount (positive for earned, negative for spent) */
	amount: number;
	/** Source of the points (task, banner, purchase, etc.) */
	source: string;
	/** Detailed description of the transaction */
	description: string;
	/** When the transaction occurred - timestamp in milliseconds */
	timestamp: number;
	/** Transaction type */
	type: "earned" | "spent" | "bonus" | "penalty";
}

/**
 * Score broadcast message data for multi-player synchronization
 * Maintains compatibility with existing ScoreBroadcaster
 */
interface ScoreBroadcastMessage {
	playerId: string;
	score: number;
}

/**
 * PointManager - Unified point calculation and management system
 * Merges ScoreBroadcaster functionality with enhanced point management
 * Implements 1.2 ゲーム進行管理システム according to plan.md
 */
export class PointManager {
	private gameContext: GameContext;
	private scene: g.Scene;
	private transactions: PointTransaction[];
	private transactionCounter: number = 0;

	constructor(gameContext: GameContext, scene: g.Scene) {
		this.gameContext = gameContext;
		this.scene = scene;
		this.transactions = [];

		// Initialize current player score for multi-player mode
		this.initializeCurrentPlayerScore();
	}

	/**
	 * Awards points to the current player
	 * @param amount Points to award (must be positive)
	 * @param source Source of the points
	 * @param description Detailed description
	 * @param showNotification Whether to show notification
	 * @returns Updated player data
	 */
	awardPoints(amount: number, source: string, description: string, showNotification: boolean = true): PlayerData {
		if (amount <= 0) {
			throw new Error("Award amount must be positive");
		}

		return this.addPointTransaction(amount, source, description, "earned", showNotification);
	}

	/**
	 * Deducts points from the current player
	 * @param amount Points to deduct (must be positive)
	 * @param source Source of the deduction
	 * @param description Detailed description
	 * @returns Updated player data or null if insufficient points
	 */
	deductPoints(amount: number, source: string, description: string): PlayerData | null {
		if (amount <= 0) {
			throw new Error("Deduct amount must be positive");
		}

		const currentPlayer = this.gameContext.currentPlayer;
		if (currentPlayer.points < amount) {
			return null; // Insufficient points
		}

		return this.addPointTransaction(-amount, source, description, "spent", false);
	}

	/**
	 * Awards bonus points with special handling
	 * @param amount Bonus points to award
	 * @param source Source of the bonus
	 * @param description Detailed description
	 * @returns Updated player data
	 */
	awardBonusPoints(amount: number, source: string, description: string): PlayerData {
		if (amount <= 0) {
			throw new Error("Bonus amount must be positive");
		}

		return this.addPointTransaction(amount, source, description, "bonus", true);
	}

	/**
	 * Gets the current player's point balance
	 */
	getCurrentPoints(): number {
		return this.gameContext.currentPlayer.points;
	}

	/**
	 * Gets all point transactions for the current player
	 */
	getTransactionHistory(): PointTransaction[] {
		const currentPlayerId = this.getCurrentPlayerId();
		return this.transactions.filter(t => t.playerId === currentPlayerId);
	}

	/**
	 * Gets transactions by source for analysis
	 * @param source Transaction source to filter by
	 */
	getTransactionsBySource(source: string): PointTransaction[] {
		const currentPlayerId = this.getCurrentPlayerId();
		return this.transactions.filter(t => t.playerId === currentPlayerId && t.source === source);
	}

	/**
	 * Calculates total points earned from a specific source
	 * @param source Source to calculate total for
	 */
	getTotalPointsFromSource(source: string): number {
		return this.getTransactionsBySource(source)
			.filter(t => t.type === "earned" || t.type === "bonus")
			.reduce((total, t) => total + t.amount, 0);
	}

	/**
	 * Broadcasts current player's score to other participants (ScoreBroadcaster compatibility)
	 */
	broadcastScore(score?: number): void {
		if (!this.scene) return;

		const finalScore = score ?? this.getCurrentPoints();
		const gameVars = this.scene.game.vars as GameVars;

		if (gameVars.mode === "multi" && this.scene.game.selfId) {
			// Update in allPlayersScores for current player
			gameVars.allPlayersScores[this.scene.game.selfId] = finalScore;

			const message = {
				type: "scoreUpdate",
				scoreData: {
					playerId: this.scene.game.selfId,
					score: finalScore
				} as ScoreBroadcastMessage
			};

			this.scene.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	/**
	 * Gets all players' scores (ScoreBroadcaster compatibility)
	 */
	getAllPlayersScores(): { [playerId: string]: number } {
		const gameVars = this.scene.game.vars as GameVars;
		return { ...gameVars.allPlayersScores };
	}

	/**
	 * Gets a specific player's score (ScoreBroadcaster compatibility)
	 */
	getPlayerScore(playerId: string): number | undefined {
		const gameVars = this.scene.game.vars as GameVars;
		return gameVars.allPlayersScores[playerId];
	}


	/**
	 * Initializes current player's score in the scores collection (ScoreBroadcaster compatibility)
	 */
	private initializeCurrentPlayerScore(): void {
		if (!this.scene?.game.selfId) return;

		const gameVars = this.scene.game.vars as GameVars;
		if (gameVars.mode === "multi") {
			const initialScore = this.gameContext.currentPlayer.points;
			gameVars.allPlayersScores[this.scene.game.selfId] = initialScore;
		}
	}

	/**
	 * Internal method to add a point transaction
	 */
	private addPointTransaction(
		amount: number,
		source: string,
		description: string,
		type: "earned" | "spent" | "bonus" | "penalty",
		showNotification: boolean
	): PlayerData {
		const currentPlayer = this.gameContext.currentPlayer;
		const currentPlayerId = this.getCurrentPlayerId();

		// Create transaction record
		const transaction: PointTransaction = {
			id: this.generateTransactionId(),
			playerId: currentPlayerId,
			amount: amount,
			source: source,
			description: description,
			timestamp: this.scene?.game.age || 0,
			type: type
		};

		this.transactions.push(transaction);

		// Update player data
		const updatedPlayer = updatePlayerPoints(currentPlayer, amount, this.scene?.game.age || 0);
		this.gameContext.updateCurrentPlayer(updatedPlayer);

		// Broadcast score update for multi-player
		this.broadcastScore(updatedPlayer.points);

		// Show notification if requested
		if (showNotification && amount > 0) {
			const notification = createPointEarnedNotification(amount, source);
			this.gameContext.addNotification(notification);
		}

		return updatedPlayer;
	}

	/**
	 * Gets the current player ID for transactions
	 */
	private getCurrentPlayerId(): string {
		return this.scene?.game.selfId || "current";
	}

	/**
	 * Generates a unique transaction ID using incrementing counter
	 */
	private generateTransactionId(): string {
		return `tx_${++this.transactionCounter}`;
	}

}
