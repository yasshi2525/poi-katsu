import { POINT_CONSTANTS } from "../manager/pointManager";

/**
 * When this instance is the active, no id was assigned by Akashic Engine.
 * To simplify implmentation, we use a dummy ID to represent the active instance.
 */
export const DUMMY_ID_FOR_ACTIVE_INSTANCE = "<__active_instance_dummy_id__>";

/**
 * Player profile information
 */
export interface PlayerProfile {
	/** Player display name */
	name: string;
	/** Player avatar emoji */
	avatar: string;
}

/**
 * Player task progress tracking
 */
export interface TaskProgress {
	/** Task ID */
	taskId: string;
	/** Whether the task is completed */
	completed: boolean;
	/** When the task was completed (if completed) - timestamp in milliseconds */
	completedAt?: number;
}

/**
 * Player data interface representing all player information
 * Centralizes player state according to 1.1 データモデル設計
 */
export interface PlayerData {
	/** Unique player identifier given by Akashic Engine. When  */
	id: string;
	/** Player profile information (name, avatar) */
	profile: PlayerProfile;
	/** Current point balance */
	points: number;
	/** Array of owned item IDs */
	ownedItems: string[];
	/** Task completion progress */
	taskProgress: Map<string, TaskProgress>;
	/** When the player joined the game - timestamp in milliseconds */
	joinedAt: number;
	/** Last time the player was active - timestamp in milliseconds */
	lastActiveAt: number;
	/** Number of items owned before settlement (for ranking display) */
	preSettlementItemCount?: number;
}

export function createInitialPlayerProfile(): PlayerProfile {
	return {
		name: "プレイヤー",
		avatar: "😀" // Default emoji avatar
	};
}

/**
 * Creates a new PlayerData instance with default values
 * @param id Pre-defined player id by Akashic Engine
 * @param profile Initial player profile
 * @param currentTime Current timestamp (optional, defaults to 0 for testing)
 * @returns New PlayerData instance
 */
export function createPlayerData(id: string | undefined, profile: PlayerProfile, currentTime: number = 0): PlayerData {
	return {
		id: id ?? DUMMY_ID_FOR_ACTIVE_INSTANCE, // Use dummy ID for active instance
		profile: profile,
		points: POINT_CONSTANTS.INITIAL_POINTS, // Initial points as per game specification
		ownedItems: [],
		taskProgress: new Map(),
		joinedAt: currentTime,
		lastActiveAt: currentTime
	};
}

/**
 * Updates player points and last active time
 * @param playerData Player data to update
 * @param points Points to add (can be negative)
 * @param currentTime Current timestamp (optional, defaults to 0 for testing)
 * @returns Updated player data
 */
export function updatePlayerPoints(playerData: PlayerData, points: number, currentTime: number = 0): PlayerData {
	return {
		...playerData,
		points: playerData.points + points,
		lastActiveAt: currentTime
	};
}

/**
 * Marks a task as completed for the player
 * @param playerData Player data to update
 * @param taskId Task ID to mark as completed
 * @param currentTime Current timestamp (optional, defaults to 0 for testing)
 * @returns Updated player data
 */
export function completePlayerTask(playerData: PlayerData, taskId: string, currentTime: number = 0): PlayerData {
	const newTaskProgress = new Map(playerData.taskProgress);
	newTaskProgress.set(taskId, {
		taskId: taskId,
		completed: true,
		completedAt: currentTime
	});

	return {
		...playerData,
		taskProgress: newTaskProgress,
		lastActiveAt: currentTime
	};
}

/**
 * Adds an item to player's owned items
 * @param playerData Player data to update
 * @param itemId Item ID to add
 * @param currentTime Current timestamp (optional, defaults to 0 for testing)
 * @returns Updated player data
 */
export function addPlayerItem(playerData: PlayerData, itemId: string, currentTime: number = 0): PlayerData {
	if (playerData.ownedItems.indexOf(itemId) !== -1) {
		return playerData; // Already owned
	}

	return {
		...playerData,
		ownedItems: [...playerData.ownedItems, itemId],
		lastActiveAt: currentTime
	};
}
