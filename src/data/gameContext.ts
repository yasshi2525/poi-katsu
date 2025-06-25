
import { NotificationData } from "./notificationData";
import { PlayerData, PlayerProfile, createPlayerData } from "./playerData";

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
	/** Current game phase */
	phase: GamePhase;
	/** Game start time - timestamp in milliseconds */
	startTime: number;
	/** Total time limit in seconds */
	totalTimeLimit: number;
	/** Remaining time in seconds */
	remainingTime: number;
	/** Remaining time in frames for consistent cross-scene timing */
	remainingFrame: number;
	/** Whether the game is paused */
	paused: boolean;
}

/**
 * Game mode configuration
 */
export interface GameMode {
	/** Game mode type */
	mode: "ranking" | "multi";
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
	private _refGameVarsGameState: { score: number };
	private _fps: number;
	private _localRandom: g.RandomGenerator;
	private _currentPlayer: PlayerData;
	private _allPlayers: Map<string, PlayerData>;
	private _notifications: NotificationData[];
	private _eventListeners: Map<string, Array<(data: any) => void>>;
	private _achievedTaskIds: Set<string>;

	/**
	 * Creates a game context for testing with default values
	 * @returns GameContext instance for testing
	 */
	static createForTesting(playerId: string, mode: "ranking" | "multi" = "ranking"): GameContext {
		const testPlayer: PlayerData = createPlayerData(
			playerId,
			{ name: "プレイヤー", avatar: "😀" },
			0
		);

		const testGameMode: GameMode = {
			mode: mode,
			maxPlayers: 4,
			currentPlayers: 1
		};

		return new GameContext(testPlayer, testGameMode, { score: testPlayer.points });
	}

	constructor(
		initialPlayerData: PlayerData,
		gameMode: GameMode,
		refGameVarsGameState: { score: number },
		localRandom: g.RandomGenerator = new g.XorshiftRandomGenerator(0),
		timeLimit: number = 120,
		fps: number = 60,
		currentTime: number = 0
	) {
		this._refGameVarsGameState = refGameVarsGameState;
		this._gameState = {
			phase: GamePhase.INITIAL,
			startTime: currentTime,
			totalTimeLimit: timeLimit,
			remainingTime: timeLimit,
			remainingFrame: timeLimit * fps, // Convert seconds to frames
			paused: false
		};
		this._fps = fps;
		this._localRandom = localRandom;

		this._gameMode = gameMode;
		this._currentPlayer = initialPlayerData;
		this._allPlayers = new Map();
		this._notifications = [];
		this._eventListeners = new Map();
		this._achievedTaskIds = new Set();

		// Add current player to all players map
		this._allPlayers.set(this._currentPlayer.id, this._currentPlayer);
	}

	/**
	 * Gets the current game mode
	 */
	get gameMode(): Readonly<GameMode> {
		return this._gameMode;
	}

	get localRandom(): g.RandomGenerator {
		return this._localRandom;
	}

	/**
	 * Gets the current player data
	 */
	get currentPlayer(): Readonly<PlayerData> {
		return this._currentPlayer;
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
		this._allPlayers.set(playerData.id, playerData);
		this._refGameVarsGameState.score = playerData.points;
		this.emit("playerUpdated", playerData);
	}

	updatePlayerProfile(playerId: string, profile: PlayerProfile): void {
		const player = this._allPlayers.get(playerId);
		if (player) {
			player.profile = profile;
		}
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
	 * Decrement the remaining time in frames for consistent cross-scene timing
	 * @returns whether the time was decremented successfully
	 */
	decrementRemainingFrame(): boolean {
		if (this._gameState.remainingFrame <= 0) {
			return false; // No time left to decrement
		}

		this._gameState.remainingFrame--;
		// Also update remainingTime for backward compatibility
		const oldRemainingTime = this._gameState.remainingTime;
		this._gameState.remainingTime = Math.max(0, Math.floor(this._gameState.remainingFrame / this._fps));
		if (this._gameState.remainingTime !== oldRemainingTime) {
			this.emit("timeUpdated", this._gameState.remainingTime);
		}
		if (this._gameState.remainingFrame <= 0) {
			this.emit("timeEnded", null);
		}

		// Check if time has run out
		if (this._gameState.remainingFrame <= 0 && this._gameState.phase !== GamePhase.ENDED) {
			this.updateGamePhase(GamePhase.SETTLEMENT);
		}
		return true; // Successfully decremented time
	}

	getCurrentTimestamp(): number {
		return this._gameState.totalTimeLimit * this._fps - this._gameState.remainingFrame;
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
		const players = Array.from(this._allPlayers.entries())
			.sort((a, b) => b[1].points - a[1].points);

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
	 * Gets the current game state
	 */
	get gameState(): Readonly<GameState> {
		return this._gameState;
	}

	/**
	 * Adds a task ID to the achieved tasks list
	 * @param taskId Task ID to mark as achieved
	 */
	addAchievedTask(taskId: string): void {
		this._achievedTaskIds.add(taskId);
		this.emit("taskAchieved", taskId);
	}

	/**
	 * Gets all achieved task IDs
	 * @returns Array of achieved task IDs
	 */
	getAchievedTaskIds(): string[] {
		return Array.from(this._achievedTaskIds);
	}

	/**
	 * Checks if a task has been achieved
	 * @param taskId Task ID to check
	 * @returns True if task has been achieved, false otherwise
	 */
	hasAchievedTask(taskId: string): boolean {
		return this._achievedTaskIds.has(taskId);
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
}
