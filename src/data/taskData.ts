/**
 * Task data interface representing a game task
 * Moved from entity/taskListE.ts to centralize data models
 */
export interface TaskData {
	/** Task icon emoji */
	icon: string;
	/** Task title */
	title: string;
	/** Reward description */
	reward: string;
	/** Reward points amount */
	rewardPoints: number;
	/** Unique task identifier */
	id: string;
	/** Whether the task is completed */
	completed: boolean;
}

/**
 * Task requirements interface for unlocking features
 */
export interface TaskRequirement {
	/** Required task ID */
	taskId: string;
	/** Whether this task must be completed */
	required: boolean;
	/** Description of what this requirement unlocks */
	unlocks?: string;
}

/**
 * Task category for grouping related tasks
 */
export type TaskCategory = "basic" | "profile" | "social" | "shopping" | "advanced" | "system";

/**
 * Extended task data with additional metadata
 */
export interface ExtendedTaskData extends TaskData {
	/** Task category */
	category: TaskCategory;
	/** Task description */
	description?: string;
	/** Prerequisites for unlocking this task */
	prerequisites: TaskRequirement[];
	/** Features unlocked when this task is completed */
	unlocks: string[];
	/** Whether this task is currently available */
	available: boolean;
	/** Priority for display order */
	priority: number;
}

/**
 * Creates a basic task data object
 * @param options Task creation options
 */
export function createTaskData(options: {
	id: string;
	icon: string;
	title: string;
	reward: string;
	rewardPoints: number;
	completed?: boolean;
}): TaskData {
	return {
		icon: options.icon,
		title: options.title,
		reward: options.reward,
		rewardPoints: options.rewardPoints,
		id: options.id,
		completed: options.completed || false
	};
}

/**
 * Creates an extended task data object
 * @param baseTask Base task data
 * @param metadata Additional task metadata
 */
export function createExtendedTaskData(
	baseTask: TaskData,
	metadata: {
		category: TaskCategory;
		description?: string;
		prerequisites?: TaskRequirement[];
		unlocks?: string[];
		priority?: number;
	}
): ExtendedTaskData {
	return {
		...baseTask,
		category: metadata.category,
		description: metadata.description,
		prerequisites: metadata.prerequisites || [],
		unlocks: metadata.unlocks || [],
		available: true,
		priority: metadata.priority || 0
	};
}

/**
 * Checks if a task's prerequisites are met
 * @param task Task to check
 * @param completedTasks Set of completed task IDs
 */
export function arePrerequisitesMet(task: ExtendedTaskData, completedTasks: Set<string>): boolean {
	return task.prerequisites.every(req =>
		!req.required || completedTasks.has(req.taskId)
	);
}

/**
 * Gets default game tasks based on specification
 */
export function getDefaultGameTasks(): ExtendedTaskData[] {
	const basicTask = createTaskData({
		id: "profile",
		icon: "👤",
		title: "プロフィール設定",
		reward: "50ポイント",
		rewardPoints: 50
	});

	const snsTask = createTaskData({
		id: "sns",
		icon: "📱",
		title: "SNS連携",
		reward: "100ポイント",
		rewardPoints: 100
	});

	const shoppingTask = createTaskData({
		id: "shopping",
		icon: "🛒",
		title: "通販利用",
		reward: "100ポイント",
		rewardPoints: 100
	});

	return [
		createExtendedTaskData(basicTask, {
			category: "profile",
			description: "プロフィール情報を設定してゲームを開始します",
			prerequisites: [],
			unlocks: ["profile_editor", "basic_features"],
			priority: 1
		}),
		createExtendedTaskData(snsTask, {
			category: "social",
			description: "SNS機能を利用してタイムライン機能を解禁します",
			prerequisites: [{ taskId: "profile", required: true, unlocks: "SNS features" }],
			unlocks: ["timeline", "social_features"],
			priority: 2
		}),
		createExtendedTaskData(shoppingTask, {
			category: "shopping",
			description: "通販機能を利用してアイテム購入を解禁します",
			prerequisites: [{ taskId: "profile", required: true, unlocks: "Shopping features" }],
			unlocks: ["shop", "item_management"],
			priority: 3
		})
	];
}
