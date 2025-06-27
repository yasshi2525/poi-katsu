import { GameContext } from "../data/gameContext";
import { TASK_METADATA, COLLECTION_TASK_METADATA } from "../data/taskConstants";
import { TaskData } from "../data/taskData";
import { ModalE } from "../entity/modalE";

/**
 * Task execution context interface
 * Provides necessary dependencies for task execution
 */
export interface TaskExecutionContext {
	scene: g.Scene;
	screenWidth: number;
	screenHeight: number;
	gameContext: GameContext;
	onScoreAdd: (points: number, taskData: TaskData) => void;
	onProfileSwitch: () => void;
	onTimelineReveal: () => void;
	onShopAppReveal: () => void;
	onModalCreate: (modal: ModalE<string>) => void;
	onModalClose: (taskId?: string) => void;
	onAchievementShow: (task: TaskData, notificationType?: string) => void;
	onTaskComplete: (taskId: string) => void;
	onTaskListRefresh?: () => void;
	onTaskButtonReactivate?: (taskId: string) => void;
}

/**
 * Task execution result interface
 */
export interface TaskExecutionResult {
	success: boolean;
	message?: string;
	unlockedFeatures?: string[];
}

/**
 * Centralized task management system
 * Handles task execution logic, completion flows, and feature unlocking
 */
export class TaskManager {
	private context: TaskExecutionContext;

	// Task definitions - centralized task data using constants
	private readonly tasks: TaskData[] = [
		{
			...TASK_METADATA.profile,
			completed: false
		},
		{
			...TASK_METADATA.shopping,
			completed: false
		},
		{
			...TASK_METADATA.sns,
			completed: false
		},
	];

	// Collection tasks - initially hidden, shown after shop unlock
	private readonly collectionTasks: TaskData[] = [
		{
			...COLLECTION_TASK_METADATA.novel_collection,
			completed: false
		},
		{
			...COLLECTION_TASK_METADATA.manga_collection,
			completed: false
		},
	];

	/**
	 * Animation configuration constants
	 */
	private static readonly ANIMATION_CONFIG: {
		readonly ACHIEVEMENT_SLIDE_DURATION: number;
		readonly ACHIEVEMENT_DISPLAY_DURATION: number;
		readonly ACHIEVEMENT_POSITION_FROM_RIGHT: number;
		readonly SNS_ACHIEVEMENT_POSITION_FROM_RIGHT: number;
		readonly SNS_ACHIEVEMENT_Y_OFFSET: number;
		readonly MODAL_CLOSE_DELAY: number;
	} = {
		ACHIEVEMENT_SLIDE_DURATION: 500,
		ACHIEVEMENT_DISPLAY_DURATION: 2000,
		ACHIEVEMENT_POSITION_FROM_RIGHT: 320,
		SNS_ACHIEVEMENT_POSITION_FROM_RIGHT: 370,
		SNS_ACHIEVEMENT_Y_OFFSET: 150,
		MODAL_CLOSE_DELAY: 50,
	} as const;

	constructor(context: TaskExecutionContext) {
		this.context = context;
	}

	/**
	 * Gets all available tasks (including collection tasks if shop is unlocked)
	 * @returns Array of task data
	 */
	getTasks(): TaskData[] {
		const allTasks = [...this.tasks]; // Return copy to prevent external modification

		// Add collection tasks if shop is unlocked
		if (this.isShopUnlocked()) {
			allTasks.push(...this.collectionTasks);
		}

		return allTasks;
	}

	/**
	 * Gets a specific task by ID
	 * @param taskId The task ID to find
	 * @returns Task data or undefined if not found
	 */
	getTask(taskId: string): TaskData | undefined {
		// Check basic tasks first
		const basicTask = this.tasks.find(task => task.id === taskId);
		if (basicTask) return basicTask;

		// Check collection tasks
		return this.collectionTasks.find(task => task.id === taskId);
	}

	/**
	 * Executes a task based on its ID
	 * @param taskData The task data to execute
	 * @returns Execution result
	 */
	executeTask(taskData: TaskData): TaskExecutionResult {
		switch (taskData.id) {
			case "profile":
				return this.executeProfileTask(taskData);
			case "sns":
				return this.executeSnsTask(taskData);
			case "shopping":
				return this.executeShoppingTask(taskData);
			case "novel_collection":
				return this.executeCollectionTask(taskData, "novel");
			case "manga_collection":
				return this.executeCollectionTask(taskData, "manga");
			default:
				return {
					success: false,
					message: `Unknown task: ${taskData.id}`
				};
		}
	}

	/**
	 * Completes a task and handles all associated logic
	 * @param taskId The task ID to complete
	 * @param skipScoreReward Whether to skip score reward (for profile task which has separate reward timing)
	 */
	completeTask(taskId: string, skipScoreReward: boolean = false): void {
		const task = this.getTask(taskId);
		if (!task || task.completed) return;

		// Mark task as completed in internal state
		task.completed = true;

		// Track achievement in GameContext
		this.context.gameContext.addAchievedTask(taskId);

		// Notify external system to remove task from UI
		this.context.onTaskComplete(taskId);

		// Add score reward (unless explicitly skipped)
		if (!skipScoreReward) {
			this.context.onScoreAdd(task.rewardPoints, task);
		}

		// Show achievement notification
		this.context.onAchievementShow(task);
	}

	/**
	 * Handles profile task completion (called externally from ProfileEditor)
	 */
	completeProfileTask(): void {
		const profileTask = this.getTask("profile");
		if (profileTask && !profileTask.completed) {
			// For profile task, score is added separately in the completion flow
			this.completeTask("profile", true); // Skip score reward for now

			// Add score reward after completion
			this.context.onScoreAdd(profileTask.rewardPoints, profileTask);
		}
	}


	/**
	 * Executes profile task (screen switching flow)
	 */
	private executeProfileTask(_taskData: TaskData): TaskExecutionResult {
		this.context.onProfileSwitch();
		return {
			success: true,
			message: "Profile editor opened"
		};
	}

	/**
	 * Executes SNS task (modal flow with timeline unlock)
	 */
	private executeSnsTask(taskData: TaskData): TaskExecutionResult {
		this.showTimelineUnlockModal(taskData);
		return {
			success: true,
			message: "SNS task modal shown",
			unlockedFeatures: ["timeline"]
		};
	}

	/**
	 * Executes shopping task (modal flow with shop app unlock)
	 */
	private executeShoppingTask(taskData: TaskData): TaskExecutionResult {
		this.showShoppingUnlockModal(taskData);
		return {
			success: true,
			message: "Shopping task modal shown",
			unlockedFeatures: ["shop"]
		};
	}

	/**
	 * Executes collection task (shows collection explanation modal)
	 */
	private executeCollectionTask(taskData: TaskData, category: string): TaskExecutionResult {
		this.showCollectionModal(taskData, category);
		return {
			success: true,
			message: `Collection task modal shown for ${category}`,
			unlockedFeatures: []
		};
	}

	/**
	 * Checks if shop is unlocked (shopping task completed)
	 * @returns True if shop is unlocked
	 */
	private isShopUnlocked(): boolean {
		const shoppingTask = this.tasks.find(task => task.id === "shopping");
		return shoppingTask?.completed ?? false;
	}

	/**
	 * Shows modal explaining timeline feature unlock
	 */
	private showTimelineUnlockModal(taskData: TaskData): void {
		// Close any existing modal first
		this.context.onModalClose();

		const modalMessage = "SNSと連携しました！\n\nタイムライン機能が利用可能になりました。\n他のユーザーの投稿を見て、いいねやコメントでポイントを獲得しましょう！";

		const modal = new ModalE({
			scene: this.context.scene,
			multi: this.context.gameContext.gameMode.mode === "multi",
			name: "timelineUnlockModal",
			args: taskData.id,
			title: "タイムライン機能解放！",
			message: modalMessage,
			width: 500,
			height: 300,
			onClose: () => this.context.onModalClose(taskData.id),
		});

		// Add OK button to modal
		this.addTimelineModalButton(modal, taskData);

		// Notify context to manage modal
		this.context.onModalCreate(modal);
	}

	/**
	 * Shows modal explaining shopping app feature unlock
	 */
	private showShoppingUnlockModal(taskData: TaskData): void {
		// Close any existing modal first
		this.context.onModalClose();

		const modalMessage = "通販サービスと連携しました！\n\n通販アプリが利用可能になりました。\n商品を購入してポイントを獲得しましょう！";

		const modal = new ModalE({
			scene: this.context.scene,
			multi: this.context.gameContext.gameMode.mode === "multi",
			name: "shoppingUnlockModal",
			args: taskData.id,
			title: "通販アプリ解放！",
			message: modalMessage,
			width: 500,
			height: 300,
			onClose: () => this.context.onModalClose(taskData.id),
		});

		// Add OK button to modal
		this.addShoppingModalButton(modal, taskData);

		// Notify context to manage modal
		this.context.onModalCreate(modal);
	}

	/**
	 * Adds OK button to timeline unlock modal
	 */
	private addTimelineModalButton(modal: ModalE<string>, taskData: TaskData): void {
		modal.replaceCloseButton({
			text: "OK",
			backgroundColor: "#27ae60",
			textColor: "white",
			fontSize: 14,
			width: 80,
			height: 35,
			onComplete: () => {
				this.completeSnsTask(taskData);
			}
		});
	}

	/**
	 * Adds OK button to shopping unlock modal
	 */
	private addShoppingModalButton(modal: ModalE<string>, taskData: TaskData): void {
		modal.replaceCloseButton({
			text: "OK",
			backgroundColor: "#2980b9",
			textColor: "white",
			fontSize: 14,
			width: 80,
			height: 35,
			onComplete: () => {
				this.completeShoppingTask(taskData);
			}
		});
	}

	/**
	 * Completes SNS task with timeline reveal
	 */
	private completeSnsTask(taskData: TaskData): void {
		// Complete the task
		this.completeTask(taskData.id);

		// Reveal timeline with delay to ensure modal is properly closed
		this.context.scene.setTimeout(() => {
			this.context.onTimelineReveal();
		}, TaskManager.ANIMATION_CONFIG.MODAL_CLOSE_DELAY);

		// Show special SNS achievement notification
		this.context.onAchievementShow(taskData, "sns");
	}

	/**
	 * Completes shopping task with shop app reveal
	 */
	private completeShoppingTask(taskData: TaskData): void {
		// Complete the task
		this.completeTask(taskData.id);

		// Reveal shop app with delay to ensure modal is properly closed
		this.context.scene.setTimeout(() => {
			this.context.onShopAppReveal();
		}, TaskManager.ANIMATION_CONFIG.MODAL_CLOSE_DELAY);

		// Refresh task list to show collection tasks after shop unlock
		if (this.context.onTaskListRefresh) {
			this.context.onTaskListRefresh();
		}

		// Show special shopping achievement notification
		this.context.onAchievementShow(taskData, "shopping");
	}

	/**
	 * Shows modal explaining collection task
	 */
	private showCollectionModal(taskData: TaskData, category: string): void {
		// Close any existing modal first
		this.context.onModalClose();

		const rewardPoints = taskData.rewardPoints;
		const categoryName = category === "novel" ? "小説" : "マンガ";
		const modalMessage = `${categoryName}シリーズをコンプリートしよう！\n\n該当する商品をすべて購入すると${rewardPoints}ポイントの報酬がもらえます。\n\n通販アプリで商品を確認してみましょう。`;

		const modal = new ModalE({
			scene: this.context.scene,
			multi: this.context.gameContext.gameMode.mode === "multi",
			name: `collectionModal_${taskData.id}`,
			args: taskData.id,
			title: `${categoryName}コレクション`,
			message: modalMessage,
			width: 500,
			height: 300,
			onClose: () => {
				this.context.onModalClose();
				// Reactivate collection task button to allow multiple views
				if (this.context.onTaskButtonReactivate) {
					this.context.onTaskButtonReactivate(taskData.id);
				}
			},
		});

		// Add OK button to modal with reactivate functionality
		this.addCollectionModalButton(modal, taskData);

		// Notify context to manage modal
		this.context.onModalCreate(modal);
	}

	/**
	 * Adds OK button to collection modal
	 */
	private addCollectionModalButton(modal: ModalE<string>, taskData: TaskData): void {
		modal.replaceCloseButton({
			text: "了解",
			backgroundColor: "#9b59b6",
			textColor: "white",
			fontSize: 14,
			width: 80,
			height: 35,
			onComplete: () => {
				// Manual call to onClose logic since replaceCloseButton bypasses the original onClose
				this.context.onModalClose();
				// Reactivate collection task button to allow multiple views
				if (this.context.onTaskButtonReactivate) {
					this.context.onTaskButtonReactivate(taskData.id);
				}
				// Modal closes automatically, no task completion needed
				// Task will be completed automatically when collection is finished
			}
		});
	}

}
