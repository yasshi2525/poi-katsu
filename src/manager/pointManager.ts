
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
	type: "earned" | "spent";
}

/**
 * Score broadcast message data for multi-player synchronization
 */
interface ScoreBroadcastMessage {
	playerId: string;
	score: number;
}

/**
 * Centralized point constants for game balance tuning
 */
export const POINT_CONSTANTS = {
	// Initial player points
	INITIAL_POINTS: 0,

	// Task reward points
	TASK_PROFILE_REWARD: 50,
	TASK_SNS_REWARD: 100,
	TASK_SHOPPING_REWARD: 100,
	TASK_AGREEMENT_REWARD: 100,

	// Series collection bonus points
	SERIES_COLLECTION_BONUS: 1000,

	// Ad banner reward points
	AD_BANNER_CLICK_REWARD: 100,

	// Banner specific rewards
	BANNER_SALE_CAMPAIGN_REWARD: 50,
	BANNER_POINT_BONUS_REWARD: 25,

	// Shopping point back rate
	SHOPPING_POINT_BACK_RATE: 0.1, // 10% point back rate

	// Set completion bonus points
	SET_CLOTHES_BONUS: 1000,
	SET_ELECTRONICS_BONUS: 2500,
} as const;

/**
 * PointManager - Unified point calculation and management system
 * Implements 1.2 ゲーム進行管理システム according to plan.md
 */
export class PointManager {
	private gameContext: GameContext;
	private game: g.Game;
	private transactions: PointTransaction[];
	private transactionCounter: number = 0;

	constructor(gameContext: GameContext, game: g.Game) {
		this.gameContext = gameContext;
		this.game = game;
		this.transactions = [];
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
			.reduce((total, t) => total + t.amount, 0);
	}

	/**
	 * Gets all unique point sources for the current player
	 * @returns Array of unique source names
	 */
	getAllPointSources(): string[] {
		const currentPlayerId = this.getCurrentPlayerId();
		const sources = new Set<string>();
		this.transactions
			.filter(t => t.playerId === currentPlayerId)
			.forEach(t => sources.add(t.source));
		return Array.from(sources);
	}

	/**
	 * Gets transaction summary by source for the current player
	 * @returns Map of source to total points
	 */
	getPointSummaryBySource(): Map<string, number> {
		const summary = new Map<string, number>();
		const sources = this.getAllPointSources();

		sources.forEach(source => {
			const total = this.getTotalPointsFromSource(source);
			if (total > 0) {
				summary.set(source, total);
			}
		});

		return summary;
	}

	/**
	 * Broadcasts current player's score to other participants
	 */
	broadcastScore(score?: number): void {
		const finalScore = score ?? this.getCurrentPoints();

		if (this.gameContext.gameMode.mode === "multi") {
			const message = {
				type: "scoreUpdate",
				scoreData: {
					playerId: this.getCurrentPlayerId(),
					score: finalScore
				} as ScoreBroadcastMessage
			};

			this.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	/**
	 * Internal method to add a point transaction
	 */
	private addPointTransaction(
		amount: number,
		source: string,
		description: string,
		type: "earned" | "spent",
		showNotification: boolean
	): PlayerData {
		const currentPlayer = this.gameContext.currentPlayer;
		const currentPlayerId = this.getCurrentPlayerId();

		// Create transaction record
		const nextTimestamp = ++this.transactionCounter;
		const transaction: PointTransaction = {
			id: this.generateTransactionId(),
			playerId: currentPlayerId,
			amount: amount,
			source: source,
			description: description,
			timestamp: nextTimestamp, // Use incremental counter instead of game.age
			type: type
		};

		this.transactions.push(transaction);

		// Update player data
		const updatedPlayer = updatePlayerPoints(currentPlayer, amount, nextTimestamp);
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
		return this.gameContext.currentPlayer.id;
	}

	/**
	 * Generates a unique transaction ID using incrementing counter
	 */
	private generateTransactionId(): string {
		return `tx_${++this.transactionCounter}`;
	}

}
