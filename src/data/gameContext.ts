
import { NotificationData } from "./notificationData";
import { PlayerData } from "./playerData";

/**
 * Game phase enumeration representing different stages of the game
 */
export enum GamePhase {
	/** Initial phase - tutorial and basic setup */
	INITIAL = "initial",
	/** Basic phase - profile, SNS, basic tasks */
	BASIC = "basic",
	/** Shopping phase - shopping features unlocked */
	SHOPPING = "shopping",
	/** Advanced phase - affiliate and flea market */
	ADVANCED = "advanced",
	/** Settlement phase - final settlement and scoring */
	SETTLEMENT = "settlement",
	/** Game ended - ranking and results */
	ENDED = "ended"
}

/**
 * Game state information
 */
export interface GameState {
	/** Current total score/points */
	score: number;
	/** Current game phase */
	phase: GamePhase;
	/** Game start time - timestamp in milliseconds */
	startTime: number;
	/** Total time limit in seconds */
	totalTimeLimit: number;
	/** Remaining time in seconds */
	remainingTime: number;
	/** Whether the game is paused */
	paused: boolean;
}

/**
 * Game mode configuration
 */
export interface GameMode {
	/** Game mode type */
	mode: "ranking" | "multi_admission";
	/** Maximum number of players */
	maxPlayers: number;
	/** Current number of players */
	currentPlayers: number;
}

/**
 * GameContext class - Central game state management
 * Manages all game data according to 1.1 データモデル設計
 */
export class GameContext {
	private _gameState: GameState;
	private _gameMode: GameMode;
	private _currentPlayer: PlayerData;
	private _allPlayers: Map<string, PlayerData>;
	private _notifications: NotificationData[];
	private _eventListeners: Map<string, Array<(data: any) => void>>;

	/**
	 * Creates a game context for testing with default values
	 * @param currentTime Current timestamp (optional, defaults to 0 for testing)
	 * @returns GameContext instance for testing
	 */
	static createForTesting(currentTime: number = 0): GameContext {
		const testPlayer: PlayerData = {
			profile: { name: "テストプレイヤー", avatar: "😀" },
			points: 500,
			ownedItems: [],
			taskProgress: new Map(),
			joinedAt: currentTime,
			lastActiveAt: currentTime
		};

		const testGameMode: GameMode = {
			mode: "ranking",
			maxPlayers: 4,
			currentPlayers: 1
		};

		return new GameContext(testPlayer, testGameMode, 120, currentTime);
	}

	constructor(initialPlayerData: PlayerData, gameMode: GameMode, timeLimit: number = 120, currentTime: number = 0) {
		this._gameState = {
			score: initialPlayerData.points,
			phase: GamePhase.INITIAL,
			startTime: currentTime,
			totalTimeLimit: timeLimit,
			remainingTime: timeLimit,
			paused: false
		};

		this._gameMode = gameMode;
		this._currentPlayer = initialPlayerData;
		this._allPlayers = new Map();
		this._notifications = [];
		this._eventListeners = new Map();

		// Add current player to all players map
		this._allPlayers.set("current", this._currentPlayer);
	}

	/**
	 * Gets the current game mode
	 */
	get gameMode(): GameMode {
		return { ...this._gameMode };
	}

	/**
	 * Gets the current player data
	 */
	get currentPlayer(): PlayerData {
		return { ...this._currentPlayer };
	}

	/**
	 * Gets all players data (readonly reference for performance)
	 */
	get allPlayers(): ReadonlyMap<string, PlayerData> {
		return this._allPlayers;
	}

	/**
	 * Gets all notifications
	 */
	get notifications(): NotificationData[] {
		return [...this._notifications];
	}

	/**
	 * Updates the current player data
	 * @param playerData New player data
	 */
	updateCurrentPlayer(playerData: PlayerData): void {
		this._currentPlayer = playerData;
		this._allPlayers.set("current", playerData);
		this._gameState.score = playerData.points;
		this.emit("playerUpdated", playerData);
	}

	/**
	 * Updates the game phase
	 * @param phase New game phase
	 */
	updateGamePhase(phase: GamePhase): void {
		const oldPhase = this._gameState.phase;
		this._gameState.phase = phase;
		this.emit("phaseChanged", { oldPhase, newPhase: phase });
	}

	/**
	 * Updates the remaining time
	 * @param remainingTime New remaining time in seconds
	 */
	updateRemainingTime(remainingTime: number): void {
		this._gameState.remainingTime = Math.max(0, remainingTime);
		this.emit("timeUpdated", this._gameState.remainingTime);

		// Check if time has run out
		if (this._gameState.remainingTime <= 0 && this._gameState.phase !== GamePhase.ENDED) {
			this.updateGamePhase(GamePhase.SETTLEMENT);
		}
	}

	/**
	 * Pauses or resumes the game
	 * @param paused Whether to pause the game
	 */
	setPaused(paused: boolean): void {
		this._gameState.paused = paused;
		this.emit("pauseChanged", paused);
	}

	/**
	 * Adds a notification to the queue
	 * @param notification Notification to add
	 */
	addNotification(notification: NotificationData): void {
		this._notifications.push(notification);
		this.emit("notificationAdded", notification);
	}

	/**
	 * Removes a notification by ID
	 * @param notificationId Notification ID to remove
	 */
	removeNotification(notificationId: string): void {
		const index = this._notifications.findIndex(n => n.id === notificationId);
		if (index >= 0) {
			const removed = this._notifications.splice(index, 1)[0];
			this.emit("notificationRemoved", removed);
		}
	}

	/**
	 * Clears all notifications
	 */
	clearNotifications(): void {
		this._notifications.length = 0;
		this.emit("notificationsCleared", null);
	}

	/**
	 * Adds another player to the game
	 * @param playerId Player ID
	 * @param playerData Player data
	 */
	addPlayer(playerId: string, playerData: PlayerData): void {
		this._allPlayers.set(playerId, playerData);
		this._gameMode.currentPlayers = this._allPlayers.size;
		this.emit("playerAdded", { playerId, playerData });
	}

	/**
	 * Removes a player from the game
	 * @param playerId Player ID to remove
	 */
	removePlayer(playerId: string): void {
		if (this._allPlayers.delete(playerId)) {
			this._gameMode.currentPlayers = this._allPlayers.size;
			this.emit("playerRemoved", playerId);
		}
	}

	/**
	 * Gets the current ranking of all players
	 * @returns Array of players sorted by score (highest first)
	 */
	getPlayerRanking(): Array<{ playerId: string; playerData: PlayerData; rank: number }> {
		const players = Array.from(this._allPlayers.entries());
		players.sort((a, b) => b[1].points - a[1].points);

		return players.map(([playerId, playerData], index) => ({
			playerId,
			playerData,
			rank: index + 1
		}));
	}

	/**
	 * Registers an event listener
	 * @param event Event name
	 * @param listener Event listener function
	 */
	on(event: string, listener: (data: any) => void): void {
		if (!this._eventListeners.has(event)) {
			this._eventListeners.set(event, []);
		}
		this._eventListeners.get(event)!.push(listener);
	}

	/**
	 * Removes an event listener
	 * @param event Event name
	 * @param listener Event listener function to remove
	 */
	off(event: string, listener: (data: any) => void): void {
		const listeners = this._eventListeners.get(event);
		if (listeners) {
			const index = listeners.indexOf(listener);
			if (index >= 0) {
				listeners.splice(index, 1);
			}
		}
	}

	/**
	 * Emits an event to all registered listeners
	 * @param event Event name
	 * @param data Event data
	 */
	private emit(event: string, data: any): void {
		const listeners = this._eventListeners.get(event);
		if (listeners) {
			listeners.forEach(listener => listener(data));
		}
	}

	/**
	 * Gets the current game state
	 */
	get gameState(): GameState {
		return { ...this._gameState };
	}
}
