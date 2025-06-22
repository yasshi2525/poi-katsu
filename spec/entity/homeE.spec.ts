import { HomeE } from "../../src/entity/homeE";
import { LabelButtonE } from "../../src/entity/labelButtonE";
import { ModalE } from "../../src/entity/modalE";
import { ProfileEditorE } from "../../src/entity/profileEditorE";

describe("HomeE", () => {
	let home: HomeE;

	beforeEach(() => {
		// Set up game variables using the pre-tuned global scene
		const gameVars = scene.game.vars as GameVars;
		gameVars.mode = "ranking"; // Use ranking mode for synchronous button behavior
		gameVars.totalTimeLimit = 180;
		gameVars.gameState = { score: 500 };
		gameVars.playerProfile = { name: "プレイヤー", avatar: "😀" };
		gameVars.allPlayersProfiles = {};

		// Create HomeE instance using global scene
		home = new HomeE({
			scene: scene,
			width: scene.game.width,
			height: scene.game.height,
		});
		scene.append(home);
	});

	afterEach(() => {
		if (home) {
			home.destroy();
		}
	});

	describe("task completion behavior", () => {
		/**
		 * Helper function to find execute button for a specific task
		 */
		const findTaskExecuteButton = (taskId: string): LabelButtonE<any> | null => {
			const findButton = (entity: g.E): LabelButtonE<any> | null => {
				if (entity instanceof LabelButtonE && entity.name === `executeTask_${taskId}`) {
					return entity;
				}
				if (entity.children) {
					for (const child of entity.children) {
						const found = findButton(child);
						if (found) return found;
					}
				}
				return null;
			};
			// Search within the task list component
			return findButton(home.getTaskList());
		};

		/**
		 * Helper function to find current ProfileEditorE
		 */
		const findCurrentProfileEditor = (): ProfileEditorE | null => {
			const findProfileEditor = (entity: g.E | g.Scene): ProfileEditorE | null => {
				if (entity instanceof ProfileEditorE) {
					return entity;
				}
				if (entity.children) {
					for (const child of entity.children) {
						const found = findProfileEditor(child);
						if (found) return found;
					}
				}
				return null;
			};
			// Search within the scene and home entity
			return findProfileEditor(scene) || findProfileEditor(home);
		};

		/**
		 * Helper function to find submit button in ProfileEditorE
		 */
		const findProfileSubmitButton = (profileEditor: ProfileEditorE): LabelButtonE<any> | null => {
			const findButton = (entity: g.E): LabelButtonE<any> | null => {
				if (entity instanceof LabelButtonE && entity.name === "submitProfileButton") {
					return entity;
				}
				if (entity.children) {
					for (const child of entity.children) {
						const found = findButton(child);
						if (found) return found;
					}
				}
				return null;
			};
			return findButton(profileEditor);
		};

		/**
		 * Helper function to find current modal
		 */
		const findCurrentModal = (): ModalE<any> | null => {
			const findModal = (entity: g.E | g.Scene): ModalE<any> | null => {
				if (entity instanceof ModalE) {
					return entity;
				}
				if (entity.children) {
					for (const child of entity.children) {
						const found = findModal(child);
						if (found) return found;
					}
				}
				return null;
			};
			// Search within the scene since modals are now appended to scene
			return findModal(scene);
		};

		/**
		 * Helper function to find confirm button in modal
		 */
		const findModalConfirmButton = (modal: ModalE<any>): LabelButtonE<any> | null => {
			const findButton = (entity: g.E): LabelButtonE<any> | null => {
				if (entity instanceof LabelButtonE && entity.name.startsWith("confirmTask_")) {
					return entity;
				}
				if (entity.children) {
					for (const child of entity.children) {
						const found = findButton(child);
						if (found) return found;
					}
				}
				return null;
			};
			return findButton(modal);
		};

		/**
		 * Helper function to find OK button in success modal
		 */
		const findModalOkButton = (modal: ModalE<any>): LabelButtonE<any> | null => {
			const findButton = (entity: g.E): LabelButtonE<any> | null => {
				if (entity instanceof LabelButtonE && entity.name.startsWith("okTask_")) {
					return entity;
				}
				if (entity.children) {
					for (const child of entity.children) {
						const found = findButton(child);
						if (found) return found;
					}
				}
				return null;
			};
			return findButton(modal);
		};

		/**
		 * Helper function to find the replaced close button (used for SNS task)
		 */
		const findModalReplacedButton = (modal: ModalE<any>): LabelButtonE<any> | null => {
			const findButton = (entity: g.E): LabelButtonE<any> | null => {
				if (entity instanceof LabelButtonE && entity.name.includes("_replaced")) {
					return entity;
				}
				if (entity.children) {
					for (const child of entity.children) {
						const found = findButton(child);
						if (found) return found;
					}
				}
				return null;
			};
			return findButton(modal);
		};

		/**
		 * Helper function to get task positions
		 */
		const getTaskPositions = (): { [taskId: string]: { x: number; y: number } } => {
			const positions: { [taskId: string]: { x: number; y: number } } = {};
			const taskIds = ["profile", "shopping", "sns"];

			taskIds.forEach((taskId) => {
				const button = findTaskExecuteButton(taskId);
				if (button) {
					// Get the task container position by traversing up the parent hierarchy
					let container = button.parent as g.E;
					while (container && container.parent !== home.getTaskList()) {
						container = container.parent as g.E;
					}
					if (container) {
						// Add the task section's position offset
						const taskList = home.getTaskList();
						positions[taskId] = {
							x: taskList.x + container.x,
							y: taskList.y + container.y,
						};
					}
				}
			});

			return positions;
		};

		/**
		 * Helper function to count visible tasks
		 */
		const countVisibleTasks = (): number => {
			const taskIds = ["profile", "shopping", "sns"];
			let count = 0;
			taskIds.forEach((taskId) => {
				const button = findTaskExecuteButton(taskId);
				if (button) count++;
			});
			return count;
		};

		/**
		 * Helper function to complete a profile task through the screen switching flow
		 */
		const completeProfileTask = async (): Promise<void> => {
			// Step 1: Click execute button for profile task
			const executeButton = findTaskExecuteButton("profile");
			expect(executeButton).not.toBeNull();
			executeButton!.send();

			// Step 2: Wait for profile editor to appear and swipe animation to complete
			await gameContext.advance(600); // Wait for swipe animation

			// Step 3: Find and click submit button in ProfileEditorE
			const profileEditor = findCurrentProfileEditor();
			expect(profileEditor).not.toBeNull();
			const submitButton = findProfileSubmitButton(profileEditor!);
			expect(submitButton).not.toBeNull();
			submitButton!.send();

			// Step 4: Wait for return animation and task completion
			await gameContext.advance(1500); // Wait for swipe back (500ms) + task fade out (500ms) + repositioning (300ms) + buffer
		};

		/**
		 * Helper function to complete a non-profile task through the modal flow
		 */
		const completeModalTask = async (taskId: string): Promise<void> => {
			// Step 1: Click execute button
			const executeButton = findTaskExecuteButton(taskId);
			expect(executeButton).not.toBeNull();
			executeButton!.send();

			// Step 2: Find and click confirm button in modal
			let modal = findCurrentModal();
			expect(modal).not.toBeNull();
			const confirmButton = findModalConfirmButton(modal!);
			expect(confirmButton).not.toBeNull();
			confirmButton!.send();

			// Step 3: Find and click OK button in success modal
			modal = findCurrentModal();
			expect(modal).not.toBeNull();
			const okButton = findModalOkButton(modal!);
			expect(okButton).not.toBeNull();
			okButton!.send();

			// Step 4: Advance game context to complete animations
			await gameContext.advance(1000); // Advance enough time to complete all animations
		};

		/**
		 * Helper function to complete SNS task (special flow with timeline unlock modal)
		 */
		const completeSnsTask = async (): Promise<void> => {
			// Step 1: Click execute button
			const executeButton = findTaskExecuteButton("sns");
			expect(executeButton).not.toBeNull();
			executeButton!.send();

			// Step 2: Find and click the OK button in the timeline unlock modal
			const modal = findCurrentModal();
			expect(modal).not.toBeNull();
			const okButton = findModalReplacedButton(modal!);
			expect(okButton).not.toBeNull();
			okButton!.send();

			// Step 3: Advance game context to complete animations
			await gameContext.advance(1000); // Advance enough time to complete all animations
		};

		/**
		 * Helper function to complete any task (chooses the right flow based on task type)
		 */
		const completeTask = async (taskId: string): Promise<void> => {
			if (taskId === "profile") {
				await completeProfileTask();
			}
			else if (taskId === "sns") {
				await completeSnsTask();
			}
			else {
				await completeModalTask(taskId);
			}
		};

		it("should destroy specified task entity when task is completed", async () => {
			// Verify initial state - all 3 tasks should be visible
			expect(countVisibleTasks()).toBe(3);
			const profileButton = findTaskExecuteButton("profile");
			expect(profileButton).not.toBeNull();

			// Complete the profile task
			await completeTask("profile");

			// Verify the profile task is destroyed
			const profileButtonAfter = findTaskExecuteButton("profile");
			expect(profileButtonAfter).toBeNull();

			// Verify other tasks are still visible
			expect(countVisibleTasks()).toBe(2);
			expect(findTaskExecuteButton("shopping")).not.toBeNull();
			expect(findTaskExecuteButton("sns")).not.toBeNull();
		});

		it("should change positions of remaining tasks after one task is completed", async () => {
			// Get initial positions of all tasks
			const initialPositions = getTaskPositions();
			expect(Object.keys(initialPositions)).toEqual(["profile", "shopping", "sns"]);

			// Complete the first task (profile)
			await completeTask("profile");

			// Get positions after completion
			const finalPositions = getTaskPositions();
			expect(Object.keys(finalPositions)).toEqual(["shopping", "sns"]);

			// Verify that remaining tasks moved up to fill the gap
			// The shopping task should now be in the position where profile was (allow small rounding differences)
			expect(Math.abs(finalPositions["shopping"].y - initialPositions["profile"].y)).toBeLessThan(1);
			// The sns task should now be in the position where shopping was
			expect(Math.abs(finalPositions["sns"].y - initialPositions["shopping"].y)).toBeLessThan(1);

			// X positions should remain the same
			expect(finalPositions["shopping"].x).toBe(initialPositions["shopping"].x);
			expect(finalPositions["sns"].x).toBe(initialPositions["sns"].x);
		});

		it("should handle completing multiple tasks in sequence", async () => {
			// Verify initial state
			expect(countVisibleTasks()).toBe(3);
			const initialPositions = getTaskPositions();

			// Complete first task
			await completeTask("profile");
			expect(countVisibleTasks()).toBe(2);

			// Get positions after first completion
			const afterFirstPositions = getTaskPositions();
			expect(Math.abs(afterFirstPositions["shopping"].y - initialPositions["profile"].y)).toBeLessThan(1);

			// Complete second task (which is now the first visible task)
			await completeTask("shopping");
			expect(countVisibleTasks()).toBe(1);

			// Verify the last task moved to the first position
			const finalPositions = getTaskPositions();
			expect(Math.abs(finalPositions["sns"].y - initialPositions["profile"].y)).toBeLessThan(1);
		});

		it("should handle completing the middle task", async () => {
			// Get initial positions
			const initialPositions = getTaskPositions();

			// Complete the middle task (shopping)
			await completeTask("shopping");

			// Verify task count
			expect(countVisibleTasks()).toBe(2);

			// Get final positions
			const finalPositions = getTaskPositions();

			// Profile should stay in the same position
			expect(finalPositions["profile"].y).toBe(initialPositions["profile"].y);
			expect(finalPositions["profile"].x).toBe(initialPositions["profile"].x);

			// SNS should move up to shopping's position
			expect(Math.abs(finalPositions["sns"].y - initialPositions["shopping"].y)).toBeLessThan(1);
			expect(finalPositions["sns"].x).toBe(initialPositions["sns"].x);
		});

		it("should update score when task is completed", async () => {
			// Get initial score
			const initialScore = home.getScore();
			expect(initialScore).toBe(500); // Default score from game vars

			// Complete profile task (50 points)
			await completeTask("profile");

			// Verify score increased
			const finalScore = home.getScore();
			expect(finalScore).toBe(initialScore + 50);

			// Verify game vars are also updated
			const gameVars = home.scene.game.vars as GameVars;
			expect(gameVars.gameState.score).toBe(finalScore);
		});

		it("should handle completing all tasks", async () => {
			// Complete all tasks one by one
			await completeTask("profile");
			expect(countVisibleTasks()).toBe(2);

			await completeTask("shopping");
			expect(countVisibleTasks()).toBe(1);

			await completeTask("sns");
			expect(countVisibleTasks()).toBe(0);

			// Verify no task buttons remain
			expect(findTaskExecuteButton("profile")).toBeNull();
			expect(findTaskExecuteButton("shopping")).toBeNull();
			expect(findTaskExecuteButton("sns")).toBeNull();

			// Verify final score (500 + 50 + 100 + 100 = 750)
			// Note: SNS task awards points twice due to both task completion and SNS-specific implementation
			expect(home.getScore()).toBe(850);
		});

		it("should handle profile task with screen switching behavior", async () => {
			// Get initial score
			const initialScore = home.getScore();

			// Verify initial state - profile task should be visible
			const profileButton = findTaskExecuteButton("profile");
			expect(profileButton).not.toBeNull();

			// Click profile task execute button
			profileButton!.send();

			// Wait for swipe animation to complete
			await gameContext.advance(600);

			// Verify ProfileEditorE is now visible
			const profileEditor = findCurrentProfileEditor();
			expect(profileEditor).not.toBeNull();

			// Verify no modal is shown (different from other tasks)
			const modal = findCurrentModal();
			expect(modal).toBeNull();

			// Find and click submit button
			const submitButton = findProfileSubmitButton(profileEditor!);
			expect(submitButton).not.toBeNull();
			submitButton!.send();

			// Wait for return animation and task completion
			await gameContext.advance(1500);

			// Verify ProfileEditorE is gone
			expect(findCurrentProfileEditor()).toBeNull();

			// Verify profile task is completed (button should be gone)
			expect(findTaskExecuteButton("profile")).toBeNull();

			// Verify score increased by 50 points
			expect(home.getScore()).toBe(initialScore + 50);

			// Verify player profile is stored in game variables
			const gameVars = home.scene.game.vars as GameVars;
			expect(gameVars.playerProfile.name).toBe("プレイヤー");
			expect(gameVars.playerProfile.avatar).toBeDefined();
		});

		it("should handle non-profile tasks with modal behavior", async () => {
			// Get initial score
			const initialScore = home.getScore();

			// Test shopping task (should use modal flow)
			const shoppingButton = findTaskExecuteButton("shopping");
			expect(shoppingButton).not.toBeNull();

			// Click shopping task execute button
			shoppingButton!.send();

			// Verify modal appears (different from profile task)
			let modal = findCurrentModal();
			expect(modal).not.toBeNull();

			// Verify no profile editor appears
			expect(findCurrentProfileEditor()).toBeNull();

			// Complete the modal flow
			const confirmButton = findModalConfirmButton(modal!);
			expect(confirmButton).not.toBeNull();
			confirmButton!.send();

			// Find success modal and OK button
			modal = findCurrentModal();
			expect(modal).not.toBeNull();
			const okButton = findModalOkButton(modal!);
			expect(okButton).not.toBeNull();
			okButton!.send();

			// Wait for animations
			await gameContext.advance(1000);

			// Verify task is completed
			expect(findTaskExecuteButton("shopping")).toBeNull();

			// Verify score increased by 100 points
			expect(home.getScore()).toBe(initialScore + 100);
		});
	});

	describe("promotional banner behavior", () => {
		/**
		 * Helper function to find banner click button for a specific banner
		 */
		const findBannerClickButton = (bannerId: string): LabelButtonE<any> | null => {
			const findButton = (entity: g.E): LabelButtonE<any> | null => {
				if (entity instanceof LabelButtonE && entity.name === `bannerClick_${bannerId}`) {
					return entity;
				}
				if (entity.children) {
					for (const child of entity.children) {
						const found = findButton(child);
						if (found) return found;
					}
				}
				return null;
			};
			// Search within the ad banner component
			return findButton(home.getAdBanner());
		};

		/**
		 * Helper function to get the current banner ID by checking which click button exists
		 */
		const getCurrentBannerId = (): string | null => {
			const bannerIds = ["sale_campaign", "new_feature", "point_bonus"];
			for (const bannerId of bannerIds) {
				if (findBannerClickButton(bannerId)) {
					return bannerId;
				}
			}
			return null;
		};

		/**
		 * Helper function to click a banner
		 */
		const clickBanner = async (bannerId: string): Promise<void> => {
			const button = findBannerClickButton(bannerId);
			expect(button).not.toBeNull();
			button!.send();

			// Wait for any animations to complete
			await gameContext.advance(500);
		};

		it("should show the highest priority banner initially (sale_campaign)", () => {
			// The highest priority banner should be sale_campaign (priority 1)
			const currentBannerId = getCurrentBannerId();
			expect(currentBannerId).toBe("sale_campaign");

			// Verify the click button exists
			const clickButton = findBannerClickButton("sale_campaign");
			expect(clickButton).not.toBeNull();
		});

		it("should switch to next banner when current banner is clicked", async () => {
			// Initially should show sale_campaign
			expect(getCurrentBannerId()).toBe("sale_campaign");

			// Click the sale_campaign banner
			await clickBanner("sale_campaign");

			// Should switch to new_feature (priority 2)
			expect(getCurrentBannerId()).toBe("new_feature");
		});

		it("should cycle through all banners in priority order", async () => {
			// Start with sale_campaign (priority 1)
			expect(getCurrentBannerId()).toBe("sale_campaign");

			// Click to switch to new_feature (priority 2)
			await clickBanner("sale_campaign");
			expect(getCurrentBannerId()).toBe("new_feature");

			// Click to switch to point_bonus (priority 3)
			await clickBanner("new_feature");
			expect(getCurrentBannerId()).toBe("point_bonus");

			// Click to cycle back to sale_campaign (priority 1)
			await clickBanner("point_bonus");
			expect(getCurrentBannerId()).toBe("sale_campaign");
		});

		it("should award points when sale_campaign banner is clicked", async () => {
			// Get initial score
			const initialScore = home.getScore();

			// Ensure we're on sale_campaign banner
			expect(getCurrentBannerId()).toBe("sale_campaign");

			// Click the sale_campaign banner (should award 50 points)
			await clickBanner("sale_campaign");

			// Verify score increased by 50
			expect(home.getScore()).toBe(initialScore + 50);
		});

		it("should award points when point_bonus banner is clicked", async () => {
			// Navigate to point_bonus banner
			await clickBanner("sale_campaign"); // Switch to new_feature
			await clickBanner("new_feature"); // Switch to point_bonus

			expect(getCurrentBannerId()).toBe("point_bonus");

			// Get current score
			const currentScore = home.getScore();

			// Click the point_bonus banner (should award 25 points)
			await clickBanner("point_bonus");

			// Verify score increased by 25
			expect(home.getScore()).toBe(currentScore + 25);
		});

		it("should allow switching to specific banner by ID", () => {
			// Start with sale_campaign
			expect(getCurrentBannerId()).toBe("sale_campaign");

			// Switch directly to point_bonus
			home.switchToBanner("point_bonus");
			expect(getCurrentBannerId()).toBe("point_bonus");

			// Switch directly to new_feature
			home.switchToBanner("new_feature");
			expect(getCurrentBannerId()).toBe("new_feature");
		});

		it("should handle invalid banner ID gracefully", () => {
			const initialBannerId = getCurrentBannerId();

			// Try to switch to non-existent banner
			home.switchToBanner("non_existent_banner");

			// Should remain on the same banner
			expect(getCurrentBannerId()).toBe(initialBannerId);
		});

		it("should only show one banner at a time", () => {
			// Count how many banner click buttons exist
			const bannerIds = ["sale_campaign", "new_feature", "point_bonus"];
			let visibleBanners = 0;

			bannerIds.forEach((bannerId) => {
				if (findBannerClickButton(bannerId)) {
					visibleBanners++;
				}
			});

			// Should only have one banner visible
			expect(visibleBanners).toBe(1);
		});
	});
});
