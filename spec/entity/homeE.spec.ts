import { GameContext } from "../../src/data/gameContext";
import { HeaderE } from "../../src/entity/headerE";
import { HomeE } from "../../src/entity/homeE";
import { LabelButtonE } from "../../src/entity/labelButtonE";
import { ModalE } from "../../src/entity/modalE";
import { ProfileEditorE } from "../../src/entity/profileEditorE";
import { MarketManager } from "../../src/manager/marketManager";
import { PointManager } from "../../src/manager/pointManager";

describe("HomeE", () => {
	let home: HomeE;
	let header: HeaderE;

	beforeEach(() => {
		// Set up game variables using the pre-tuned global scene
		const gameVars = scene.game.vars as GameVars;
		gameVars.mode = "ranking"; // Use ranking mode for synchronous button behavior
		gameVars.totalTimeLimit = 180;
		gameVars.gameState = { score: 500 };
		gameVars.playerProfile = { name: "プレイヤー", avatar: "😀" };
		gameVars.allPlayersProfiles = {};

		// Create GameContext for testing
		const gameContext = GameContext.createForTesting("test-player", "ranking");

		// Mock getMarketManager method for tests
		const marketManager = new MarketManager(scene, gameContext);
		marketManager.initialize();
		(scene as any).getMarketManager = () => marketManager;

		// Create header for testing
		header = new HeaderE({
			scene: scene,
			width: scene.game.width,
			height: 80,
			score: gameVars.gameState.score,
			remainingSec: gameVars.totalTimeLimit,
		});
		scene.append(header);

		// Create HomeE instance using global scene
		home = new HomeE({
			scene: scene,
			width: scene.game.width,
			height: scene.game.height,
			header: header,
			gameContext: gameContext,
			marketManager: marketManager,
			pointManager: new PointManager(gameContext, scene),
			updateCurrentPlayerScore: (score: number) => { /* Mock function */ },
			transitionToRanking: () => { /* Mock function */ },
		});
		scene.append(home);
	});

	afterEach(() => {
		if (home) {
			home.destroy();
		}
		if (header) {
			header.destroy();
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
				if (entity instanceof LabelButtonE
					&& (entity.name.includes("_replaced") || entity.name.includes("_button_"))) {
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
		 * Helper function to complete shopping task (custom modal flow)
		 */
		const completeShoppingTask = async (): Promise<void> => {
			// Step 1: Click execute button
			const executeButton = findTaskExecuteButton("shopping");
			expect(executeButton).not.toBeNull();
			executeButton!.send();

			// Step 2: Find and click the OK button in the shopping unlock modal
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
			else if (taskId === "shopping") {
				// Shopping task uses modal like SNS task
				await completeShoppingTask();
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
			expect(initialScore).toBe(0); // Default initial points from POINT_CONSTANTS

			// Complete profile task (50 points)
			await completeTask("profile");

			// Verify score increased
			const finalScore = home.getScore();
			expect(finalScore).toBe(initialScore + 50);

			// Verify GameContext is also updated
			const gameContext = (home as any).gameContext as GameContext;
			expect(gameContext.currentPlayer.points).toBe(finalScore);
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

			// Verify final score (0 + 50 + 100 + 100 = 250)
			expect(home.getScore()).toBe(250);
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

			// Verify ProfileEditorE is no longer visible (but instance is preserved)
			const profileEditorAfterReturn = findCurrentProfileEditor();
			expect(profileEditorAfterReturn).not.toBeNull(); // Instance should be preserved
			expect(profileEditorAfterReturn!.x).toBe(scene.game.width); // Should be positioned off-screen

			// Verify profile task is completed (button should be gone)
			expect(findTaskExecuteButton("profile")).toBeNull();

			// Verify score increased by 50 points
			expect(home.getScore()).toBe(initialScore + 50);

			// Verify player profile is stored in game variables
			const gameVars = home.scene.game.vars as GameVars;
			expect(gameVars.playerProfile.name).toBe("プレイヤー");
			expect(gameVars.playerProfile.avatar).toBeDefined();
		});

		it("should handle shopping task with modal explanation", async () => {
			// Get initial score
			const initialScore = home.getScore();

			// Test shopping task (should use modal like SNS task)
			const shoppingButton = findTaskExecuteButton("shopping");
			expect(shoppingButton).not.toBeNull();

			// Click shopping task execute button
			shoppingButton!.send();

			// Verify modal appears with shopping app explanation
			const modal = findCurrentModal();
			expect(modal).not.toBeNull();

			// Verify no profile editor appears
			expect(findCurrentProfileEditor()).toBeNull();

			// Complete the modal flow
			const okButton = findModalReplacedButton(modal!);
			expect(okButton).not.toBeNull();
			okButton!.send();

			// Wait for animations (including task fade-out animation)
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
			const bannerIds = ["welcome_ad", "shopping_recommend", "sale_notification", "sns_recommend"];
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
			await gameContext.advance(800);
		};

		it("should show the highest priority banner initially (welcome_ad)", () => {
			// The highest priority banner should be welcome_ad (priority 1)
			const currentBannerId = getCurrentBannerId();
			expect(currentBannerId).toBe("welcome_ad");

			// Verify the click button exists
			const clickButton = findBannerClickButton("welcome_ad");
			expect(clickButton).not.toBeNull();
		});

		it("should switch to next banner when current banner is clicked", async () => {
			// Initially should show welcome_ad
			expect(getCurrentBannerId()).toBe("welcome_ad");

			// Click the welcome_ad banner
			await clickBanner("welcome_ad");

			// Should switch to shopping_recommend (priority 2)
			expect(getCurrentBannerId()).toBe("shopping_recommend");
		});

		it("should progress through banners and disable clicked ones", async () => {
			// Start with welcome_ad (priority 1)
			expect(getCurrentBannerId()).toBe("welcome_ad");

			// Click welcome_ad - should disable it and switch to shopping_recommend (priority 2)
			await clickBanner("welcome_ad");
			expect(getCurrentBannerId()).toBe("shopping_recommend");

			// Click shopping_recommend - should disable it and switch to sale_notification (priority 3)
			await clickBanner("shopping_recommend");
			expect(getCurrentBannerId()).toBe("sale_notification");

			// Click sale_notification - should disable it and switch to sns_recommend (priority 4)
			await clickBanner("sale_notification");
			expect(getCurrentBannerId()).toBe("sns_recommend");

			// Click sns_recommend - should disable it and hide all banners (no more enabled banners)
			await clickBanner("sns_recommend");
			await clickBanner("sale_notification");
			expect(getCurrentBannerId()).toBe(null);
		});

		it("should award points when welcome_ad banner is clicked", async () => {
			// Get initial score
			const initialScore = home.getScore();

			// Ensure we're on welcome_ad banner
			expect(getCurrentBannerId()).toBe("welcome_ad");

			// Click the welcome_ad banner (should award 100 points)
			await clickBanner("welcome_ad");

			// Verify score increased by 100
			expect(home.getScore()).toBe(initialScore + 100);
		});

		it("should award points when sale_notification banner is clicked", async () => {
			// Navigate to sale_notification banner by disabling previous banners
			await clickBanner("welcome_ad"); // Disable welcome_ad, switch to shopping_recommend
			await clickBanner("shopping_recommend"); // Disable shopping_recommend, switch to sale_notification

			expect(getCurrentBannerId()).toBe("sale_notification");

			// Get current score
			const currentScore = home.getScore();

			// Click the sale_notification banner (should award 100 points)
			await clickBanner("sale_notification");

			// Verify score increased by 100
			expect(home.getScore()).toBe(currentScore + 100);
		});

		it("should only show one banner at a time", () => {
			// Count how many banner click buttons exist
			const bannerIds = ["welcome_ad", "shopping_recommend", "sale_notification", "sns_recommend"];
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
