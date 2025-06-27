import { Timeline } from "@akashic-extension/akashic-timeline";
import { TaskData } from "../data/taskData";
import { LabelButtonE } from "./labelButtonE";
import { ModalE } from "./modalE";

/**
 * Layout configuration interface
 */
interface LayoutConfig {
	x: number;
	y: number;
	width: number;
	height: number;
	children?: { [key: string]: LayoutConfig };
}

/**
 * Task item visual components
 */
interface TaskItem {
	taskData: TaskData;
	container: g.E;
	background: g.FilledRect;
	elements: g.E[];
	executeButton: LabelButtonE<string>;
}

/**
 * Animation configuration constants
 */
const ANIMATION_CONFIG = {
	TASK_FADE_OUT_DURATION: 500,
	TASK_FADE_OUT_TARGET_OPACITY: 0,
	TASK_POSITION_SHIFT_DURATION: 300,
} as const;

/**
 * Parameter object for TaskList
 */
export interface TaskListParameterObject extends g.EParameterObject {
	/** Whether multiplayer mode or not */
	multi: boolean;
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Task data array */
	tasks: TaskData[];
	/** Callback when task execution is requested (before modal/confirmation) */
	onTaskExecute?: (taskData: TaskData) => void;
	/** Callback when task is executed and points should be awarded */
	onTaskComplete: (taskData: TaskData) => void;
}

/**
 * Task section component that displays and manages tasks
 */
export class TaskListE extends g.E {
	static assetIds: string[] = [...ModalE.assetIds];

	private readonly multi: boolean;
	private readonly tasks: TaskData[];
	private readonly layout: LayoutConfig;
	private readonly onTaskExecute?: (taskData: TaskData) => void;
	private readonly onTaskComplete: (taskData: TaskData) => void;
	private taskItems: Map<string, TaskItem> = new Map();
	private currentModal?: ModalE<string>;

	/**
	 * Creates a new TaskList instance
	 * @param options Configuration options for the task list
	 */
	constructor(options: TaskListParameterObject) {
		super(options);

		this.multi = options.multi;
		this.tasks = options.tasks;
		this.onTaskExecute = options.onTaskExecute;
		this.onTaskComplete = options.onTaskComplete;
		this.layout = this.createLayoutConfig(options.width, options.height);

		this.createLayout();
	}

	/**
	 * Gets a task item by ID (for testing)
	 * @param taskId The task ID to find
	 * @returns The task item or undefined if not found
	 */
	getTaskItem(taskId: string): TaskItem | undefined {
		return this.taskItems.get(taskId);
	}

	/**
	 * Gets all visible task items (for testing)
	 * @returns Map of all currently visible task items
	 */
	getVisibleTaskItems(): Map<string, TaskItem> {
		return new Map(this.taskItems);
	}

	/**
	 * Completes a task externally (for tasks that don't use the modal flow)
	 * @param taskId The ID of the task to complete
	 */
	completeTaskExternal(taskId: string): void {
		const taskItem = this.taskItems.get(taskId);
		if (!taskItem) {
			console.error(`Task item with id ${taskId} not found`);
			return;
		}

		// Mark task as completed (modifying the original taskData object)
		taskItem.taskData.completed = true;

		// Notify parent component about task completion
		this.onTaskComplete(taskItem.taskData);

		// Start fade out animation and removal
		this.fadeOutAndRemoveTask(taskId);
	}

	/**
	 * Reactivates a task button after modal closure
	 * @param taskId The ID of the task button to reactivate
	 */
	reactivateTaskButton(taskId: string): void {
		const taskItem = this.taskItems.get(taskId);
		if (taskItem) {
			taskItem.executeButton.reactivate();
		}
	}

	/**
	 * Refreshes the task list with new tasks from TaskManager
	 * @param newTasks The updated task list
	 */
	refreshTasks(newTasks: TaskData[]): void {
		// Update internal tasks array
		this.tasks.length = 0;
		this.tasks.push(...newTasks);

		// Get currently completed tasks to preserve their state
		const completedTaskIds = new Set(
			Array.from(this.taskItems.keys()).filter(taskId => {
				const taskItem = this.taskItems.get(taskId);
				return taskItem?.taskData.completed ?? false;
			})
		);

		// Find new tasks that weren't in the previous list
		const existingTaskIds = new Set(Array.from(this.taskItems.keys()));
		const newTasksToAdd = newTasks.filter(task =>
			!existingTaskIds.has(task.id) && !task.completed
		);

		// Add new task items to the display
		newTasksToAdd.forEach(task => {
			// Calculate position for new task
			const activeTasks = this.tasks.filter(t => !t.completed && !completedTaskIds.has(t.id));
			const index = activeTasks.findIndex(t => t.id === task.id);
			if (index >= 0) {
				const taskY = this.layout.y + this.layout.children!.item.y + (index * 60);
				this.createTaskItem(task, this.layout.children!.item.x, taskY);
			}
		});

		// Refresh layout for all active tasks
		this.refreshTaskLayout();
	}

	/**
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, screenHeight: number): LayoutConfig {
		return {
			x: 20, // Match AdBanner margin for left block alignment
			y: 289, // Below header(69) + ItemList(60) + margin(20) + AdBanner(120) + margin(29) = 289
			width: screenWidth - 720, // Right edge aligns with timeline left edge
			height: 240,
			children: {
				header: {
					x: 0,
					y: 0,
					width: screenWidth - 720, // Match container width
					height: 30,
					children: {
						newBadge: { x: 0, y: 0, width: 50, height: 25 },
						newLabel: { x: 5, y: 5, width: 40, height: 15 },
						title: { x: 60, y: 2, width: 100, height: 25 }
					}
				},
				item: {
					x: 20, // Left margin
					y: 40,
					width: screenWidth - 760, // Container width minus left and right margins (20 + 20)
					height: 50,
					children: {
						icon: { x: 15, y: 15, width: 20, height: 20 },
						title: { x: 50, y: 10, width: 200, height: 16 },
						reward: { x: 50, y: 30, width: 100, height: 12 },
						executeBtn: { x: screenWidth - 840, y: 10, width: 60, height: 30 },
						executeLabel: { x: screenWidth - 825, y: 18, width: 30, height: 12 }
					}
				}
			}
		};
	}

	/**
	 * Creates the overall layout structure
	 */
	private createLayout(): void {
		this.createSectionHeader();
		this.renderTasks();
	}

	/**
	 * Creates the section header with NEW badge and title
	 */
	private createSectionHeader(): void {
		const headerLayout = this.layout.children!.header;
		const newBadgeLayout = headerLayout.children!.newBadge;
		const newLabelLayout = headerLayout.children!.newLabel;
		const titleLayout = headerLayout.children!.title;

		// Section header
		const newBadge = new g.FilledRect({
			scene: this.scene,
			width: newBadgeLayout.width,
			height: newBadgeLayout.height,
			x: this.layout.x + newBadgeLayout.x,
			y: this.layout.y + newBadgeLayout.y,
			cssColor: "#e74c3c",
		});
		this.append(newBadge);

		const newLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: "white",
			}),
			text: "NEW",
			x: this.layout.x + newLabelLayout.x,
			y: this.layout.y + newLabelLayout.y,
		});
		this.append(newLabel);

		const taskTitle = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 20,
				fontColor: "white",
			}),
			text: "タスク",
			x: this.layout.x + titleLayout.x,
			y: this.layout.y + titleLayout.y,
		});
		this.append(taskTitle);
	}

	/**
	 * Renders all non-completed tasks
	 */
	private renderTasks(): void {
		const activeTasks = this.tasks.filter(task => !task.completed);

		activeTasks.forEach((task, index) => {
			const taskItemY = this.layout.y + this.layout.children!.item.y + (index * 60);
			this.createTaskItem(task, this.layout.children!.item.x, taskItemY);
		});
	}

	/**
	 * Creates a single task item
	 */
	private createTaskItem(task: TaskData, x: number, y: number): void {
		const itemLayout = this.layout.children!.item;
		const iconLayout = itemLayout.children!.icon;
		const titleLayout = itemLayout.children!.title;
		const rewardLayout = itemLayout.children!.reward;
		const executeBtnLayout = itemLayout.children!.executeBtn;

		// Create container for the task item
		const container = new g.E({
			scene: this.scene,
			x: x,
			y: y,
		});

		// Task background with margin
		const taskBg = new g.FilledRect({
			scene: this.scene,
			width: itemLayout.width,
			height: itemLayout.height,
			x: 0, // Background starts from item container position (which includes margin)
			y: 0,
			cssColor: "#34495e",
		});
		container.append(taskBg);

		// Icon
		const iconLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 20,
			}),
			text: task.icon,
			x: iconLayout.x,
			y: iconLayout.y,
		});
		container.append(iconLabel);

		// Title
		const titleLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: "white",
			}),
			text: task.title,
			x: titleLayout.x,
			y: titleLayout.y,
		});
		container.append(titleLabel);

		// Reward
		const rewardLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: "#bdc3c7",
			}),
			text: `報酬: ${task.reward}`,
			x: rewardLayout.x,
			y: rewardLayout.y,
		});
		container.append(rewardLabel);

		// Execute button using LabelButtonE
		const executeBtn = new LabelButtonE({
			scene: this.scene,
			multi: this.multi,
			name: `executeTask_${task.id}`,
			args: task.id, // Primitive string - safe to serialize
			width: executeBtnLayout.width,
			height: executeBtnLayout.height,
			x: executeBtnLayout.x,
			y: executeBtnLayout.y,
			text: "実行",
			backgroundColor: "#27ae60",
			textColor: "white",
			fontSize: 12,
			onComplete: (taskId: string) => {
				const taskItem = this.taskItems.get(taskId);
				if (taskItem) {
					this.handleTaskExecute(taskItem.taskData);
				}
			},
		});
		container.append(executeBtn);

		// Store task item for later manipulation
		const taskItem: TaskItem = {
			taskData: task,
			container: container,
			background: taskBg,
			elements: [iconLabel, titleLabel, rewardLabel, executeBtn],
			executeButton: executeBtn
		};
		this.taskItems.set(task.id, taskItem);

		this.append(container);
	}

	/**
	 * Handles task execution when execute button is clicked
	 * @param task The task data for the executed task
	 */
	private handleTaskExecute(task: TaskData): void {
		// Check if there's an external handler for this task (profile, SNS, shopping tasks - complete once)
		if (this.onTaskExecute && (
			task.id === "profile" ||
			task.id === "sns" ||
			task.id === "shopping"
		)) {
			this.onTaskExecute(task);
			// No reactivate needed - these tasks complete permanently
			return;
		}

		// Collection tasks need external handler but with reactivation
		if (this.onTaskExecute && (
			task.id === "novel_collection" ||
			task.id === "manga_collection"
		)) {
			this.onTaskExecute(task);
			// Collection tasks will handle reactivation via TaskManager modal close
			return;
		}

		// Close any existing modal first
		if (this.currentModal) {
			this.closeModal();
		}

		// Create and show modal for task confirmation
		this.showTaskModal(task);
	}

	/**
	 * Shows a modal dialog for task execution
	 * @param task The task data to display in the modal
	 */
	private showTaskModal(task: TaskData): void {
		const modalMessage = `${task.title}\n\nこのタスクを実行しますか？\n報酬: ${task.reward}`;

		this.currentModal = new ModalE({
			scene: this.scene,
			multi: this.multi,
			name: `taskModal_${task.id}`,
			args: task.id, // Primitive string - safe to serialize
			title: "タスク実行",
			message: modalMessage,
			width: 450,
			height: 250,
			onClose: () => this.closeModalWithReactivation(task.id),
		});

		// Add execute confirmation button to modal
		this.addModalButtons(task);

		// Append modal to scene to ensure it's always on top
		if (this.currentModal) {
			this.scene.append(this.currentModal);
		}
	}

	/**
	 * Adds confirmation buttons to the modal
	 * @param task The task data for the buttons
	 */
	private addModalButtons(task: TaskData): void {
		if (!this.currentModal) return;

		// Use new multi-button API instead of manual appending
		this.currentModal.replaceCloseButtons([
			{
				text: "キャンセル",
				backgroundColor: "#95a5a6",
				textColor: "white",
				fontSize: 14,
				width: 100,
				height: 35,
				onComplete: () => {
					// Modal closes automatically after onComplete
				}
			},
			{
				text: "実行",
				backgroundColor: "#27ae60",
				textColor: "white",
				fontSize: 14,
				width: 100,
				height: 35,
				onComplete: () => {
					this.executeTask(task.id);
				}
			}
		]);
	}

	/**
	 * Executes the actual task and awards points
	 * @param taskId The ID of the task to execute
	 */
	private executeTask(taskId: string): void {
		// Get the task item from taskItems map
		const taskItem = this.taskItems.get(taskId);
		if (!taskItem) {
			console.error(`Task item with id ${taskId} not found`);
			return;
		}

		// Mark task as completed (modifying the original taskData object)
		taskItem.taskData.completed = true;

		// Notify parent component about task completion
		this.onTaskComplete(taskItem.taskData);

		// Show success modal
		this.showSuccessModal(taskItem.taskData);
	}

	/**
	 * Shows a success modal after task completion
	 * @param task The completed task
	 */
	private showSuccessModal(task: TaskData): void {
		// Close current modal first
		this.closeModal();

		const successMessage = `${task.title}\n\nタスクを完了しました！\n${task.reward}を獲得しました。`;

		this.currentModal = new ModalE({
			scene: this.scene,
			multi: this.multi,
			name: `successModal_${task.id}`,
			args: task.id, // Primitive string - safe to serialize
			title: "タスク完了",
			message: successMessage,
			width: 400,
			height: 200,
			onClose: () => this.closeModal(),
		});

		// Use new multi-button API instead of manual appending
		this.currentModal.replaceCloseButton({
			text: "OK",
			backgroundColor: "#3498db",
			textColor: "white",
			fontSize: 14,
			width: 80,
			height: 30,
			onComplete: () => {
				// Start fade out animation after modal closes
				this.fadeOutAndRemoveTask(task.id);
			}
		});

		// Append modal to scene to ensure it's always on top
		if (this.currentModal) {
			this.scene.append(this.currentModal);
		}
	}

	/**
	 * Closes the current modal dialog
	 */
	private closeModal(): void {
		if (this.currentModal) {
			this.currentModal.destroy();
			this.currentModal = undefined;
		}
	}

	/**
	 * Closes the current modal dialog and reactivates the task button
	 * @param taskId The ID of the task whose button should be reactivated
	 */
	private closeModalWithReactivation(taskId: string): void {
		this.closeModal();
		this.reactivateTaskButton(taskId);
	}

	/**
	 * Fades out and removes a completed task
	 * @param taskId The ID of the task to remove
	 */
	private fadeOutAndRemoveTask(taskId: string): void {
		const taskItem = this.taskItems.get(taskId);
		if (!taskItem) return;

		// Disable interaction during fade-out
		taskItem.container.touchable = false;

		// Create local Timeline instance for this animation
		const timeline = new Timeline(this.scene);
		timeline.create(taskItem.container)
			.to({
				opacity: ANIMATION_CONFIG.TASK_FADE_OUT_TARGET_OPACITY
			}, ANIMATION_CONFIG.TASK_FADE_OUT_DURATION)
			.call(() => {
				// Animation complete, remove task
				this.removeTaskAndTrimSpace(taskId);
			});
	}

	/**
	 * Removes a task item and trims empty space
	 * @param taskId The ID of the task to remove
	 */
	private removeTaskAndTrimSpace(taskId: string): void {
		const taskItem = this.taskItems.get(taskId);
		if (!taskItem) return;

		// Remove the visual container
		taskItem.container.destroy();
		this.taskItems.delete(taskId);

		// Re-render remaining tasks to trim space
		this.refreshTaskLayout();
	}

	/**
	 * Refreshes the task layout by smoothly animating existing tasks to new positions
	 */
	private refreshTaskLayout(): void {
		const activeTasks = this.tasks.filter(task => !task.completed);

		// Calculate new positions for remaining tasks
		const newPositions = new Map<string, number>();
		activeTasks.forEach((task, index) => {
			const newY = this.layout.y + this.layout.children!.item.y + (index * 60);
			newPositions.set(task.id, newY);
		});

		// Animate existing tasks to their new positions
		activeTasks.forEach((task) => {
			const taskItem = this.taskItems.get(task.id);
			if (taskItem) {
				const newY = newPositions.get(task.id)!;
				this.animateTaskToPosition(taskItem, newY);
			}
		});
	}


	/**
	 * Animates a task item to a new Y position with smooth transition
	 * @param taskItem The task item to animate
	 * @param newY The target Y position
	 */
	private animateTaskToPosition(taskItem: TaskItem, newY: number): void {
		const currentY = taskItem.container.y;

		// Only animate if the position actually changed
		if (Math.abs(currentY - newY) < 1) {
			return;
		}

		// Create local Timeline instance for smooth position animation
		const timeline = new Timeline(this.scene);
		timeline.create(taskItem.container)
			.to({
				y: newY
			}, ANIMATION_CONFIG.TASK_POSITION_SHIFT_DURATION);
	}
}
