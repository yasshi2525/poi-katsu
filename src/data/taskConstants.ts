import { POINT_CONSTANTS } from "../manager/pointManager";

/**
 * Task metadata interface for consistent task data
 */
export interface TaskMetadata {
	/** Task identifier */
	id: string;
	/** Task icon emoji */
	icon: string;
	/** Task display title */
	title: string;
	/** Task reward points */
	rewardPoints: number;
	/** Task reward display string */
	reward: string;
}

/**
 * Centralized task metadata constants
 * Used by both TaskManager and ScoreBreakdownE to ensure consistency
 */
export const TASK_METADATA: { [key: string]: TaskMetadata } = {
	profile: {
		id: "profile",
		icon: "👤",
		title: "プロフィールを設定する",
		rewardPoints: POINT_CONSTANTS.TASK_PROFILE_REWARD,
		reward: `${POINT_CONSTANTS.TASK_PROFILE_REWARD}pt`,
	},
	shopping: {
		id: "shopping",
		icon: "🛒",
		title: "通販サービスと連携する",
		rewardPoints: POINT_CONSTANTS.TASK_SHOPPING_REWARD,
		reward: `${POINT_CONSTANTS.TASK_SHOPPING_REWARD}pt`,
	},
	sns: {
		id: "sns",
		icon: "📱",
		title: "SNSと連携する",
		rewardPoints: POINT_CONSTANTS.TASK_SNS_REWARD,
		reward: `${POINT_CONSTANTS.TASK_SNS_REWARD}pt`,
	},
	agreement: {
		id: "agreement",
		icon: "📝",
		title: "サービス利用規約に同意する",
		rewardPoints: POINT_CONSTANTS.TASK_AGREEMENT_REWARD,
		reward: `${POINT_CONSTANTS.TASK_AGREEMENT_REWARD}pt`,
	},
} as const;

/**
 * Collection task metadata (series completion tasks)
 */
export const COLLECTION_TASK_METADATA: { [key: string]: TaskMetadata } = {
	novel_collection: {
		id: "novel_collection",
		icon: "📚",
		title: "小説シリーズコレクション",
		rewardPoints: POINT_CONSTANTS.SET_CLOTHES_BONUS,
		reward: `${POINT_CONSTANTS.SET_CLOTHES_BONUS}pt`,
	},
	manga_collection: {
		id: "manga_collection",
		icon: "📖",
		title: "マンガシリーズコレクション",
		rewardPoints: POINT_CONSTANTS.SET_ELECTRONICS_BONUS,
		reward: `${POINT_CONSTANTS.SET_ELECTRONICS_BONUS}pt`,
	},
} as const;

/**
 * Get all task metadata including collections
 */
export function getAllTaskMetadata(): { [key: string]: TaskMetadata } {
	return {
		...TASK_METADATA,
		...COLLECTION_TASK_METADATA,
	};
}

/**
 * Get task metadata by ID
 */
export function getTaskMetadata(taskId: string): TaskMetadata | undefined {
	const allTasks = getAllTaskMetadata();
	return allTasks[taskId];
}
