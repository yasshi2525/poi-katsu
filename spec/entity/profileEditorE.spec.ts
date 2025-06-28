import { GameContext } from "../../src/data/gameContext";
import { ProfileEditorE, ProfileData } from "../../src/entity/profileEditorE";
import { LabelButtonE } from "../../src/entity/labelButtonE";
import { RadioButtonGroupE } from "../../src/entity/radioButtonGroupE";

// Mock resolvePlayerInfo from @akashic-extension/resolve-player-info
jest.mock("@akashic-extension/resolve-player-info", () => ({
	resolvePlayerInfo: jest.fn(),
}));

// Import the mocked function
import { resolvePlayerInfo } from "@akashic-extension/resolve-player-info";

describe("ProfileEditorE", () => {
	let profileEditor: ProfileEditorE;
	let submittedData: ProfileData | null = null;
	let mockResolvePlayerInfo: jest.MockedFunction<typeof resolvePlayerInfo>;

	beforeEach(() => {
		// Reset submitted data
		submittedData = null;

		// Set up mock for resolvePlayerInfo
		mockResolvePlayerInfo = resolvePlayerInfo as jest.MockedFunction<typeof resolvePlayerInfo>;
		mockResolvePlayerInfo.mockClear();

		// Initialize game variables with proper playerProfile structure
		const gameVars: GameVars = {
			gameState: {
				score: 0,
			},
		};
		scene.game.vars = gameVars;

		// Create GameContext for testing
		const gameContext = GameContext.createForTesting("test-player", "ranking");

		// Create ProfileEditorE instance using global scene
		profileEditor = new ProfileEditorE({
			scene: scene,
			gameContext: gameContext,
			width: scene.game.width,
			height: scene.game.height,
			onComplete: () => {
				// ProfileEditorE now updates game context directly, so read from there
				submittedData = {
					name: gameContext.currentPlayer.profile.name,
					avatar: gameContext.currentPlayer.profile.avatar,
				};
			},
		});
		scene.append(profileEditor);
	});

	afterEach(() => {
		if (profileEditor) {
			profileEditor.destroy();
		}
	});

	describe("initialization", () => {
		it("should create with proper layout elements", () => {
			// Verify ProfileEditorE was created successfully
			expect(profileEditor).toBeDefined();
			expect(profileEditor.scene).toBe(scene);
		});

		it("should have name setting button", () => {
			const nameButtonBg = findNameButtonBackground();
			expect(nameButtonBg).not.toBeNull();
		});

		it("should have avatar selection radio button group", () => {
			const radioGroup = findRadioButtonGroup();
			expect(radioGroup).not.toBeNull();
		});

		it("should have submit button", () => {
			const submitButton = findButton("submitProfileButton");
			expect(submitButton).not.toBeNull();
		});
	});

	describe("avatar selection", () => {
		it("should have default avatar selected", () => {
			const radioGroup = findRadioButtonGroup();
			expect(radioGroup).not.toBeNull();
			expect(radioGroup!.getSelectedId()).toBe("avatar1");
			expect(radioGroup!.getSelectedValue()).toBe("😀");
		});

		it("should allow changing avatar selection", () => {
			const radioGroup = findRadioButtonGroup();
			expect(radioGroup).not.toBeNull();

			// Change selection to avatar2
			radioGroup!.setSelectedId("avatar2");
			expect(radioGroup!.getSelectedId()).toBe("avatar2");
			expect(radioGroup!.getSelectedValue()).toBe("😎");
		});

		it("should have all expected avatar options", () => {
			const radioGroup = findRadioButtonGroup();
			expect(radioGroup).not.toBeNull();

			// Test all avatar options
			const expectedAvatars = [
				{ id: "avatar1", value: "😀" },
				{ id: "avatar2", value: "😎" },
				{ id: "avatar3", value: "🥰" },
				{ id: "avatar4", value: "🤔" },
				{ id: "avatar5", value: "😴" },
			];

			expectedAvatars.forEach(({ id, value }) => {
				radioGroup!.setSelectedId(id);
				expect(radioGroup!.getSelectedId()).toBe(id);
				expect(radioGroup!.getSelectedValue()).toBe(value);
			});
		});

		it("should submit with the currently selected avatar value", () => {
			const radioGroup = findRadioButtonGroup();
			const submitButton = findButton("submitProfileButton");
			expect(radioGroup).not.toBeNull();
			expect(submitButton).not.toBeNull();

			// Change to avatar5 and immediately check submission
			radioGroup!.setSelectedId("avatar5");
			expect(radioGroup!.getSelectedValue()).toBe("😴");

			submitButton!.send();
			expect(submittedData!.avatar).toBe("😴");
		});
	});

	describe("form submission", () => {
		it("should submit with default values", () => {
			const submitButton = findButton("submitProfileButton");
			expect(submitButton).not.toBeNull();

			// Submit form
			submitButton!.send();

			// Verify submitted data
			expect(submittedData).not.toBeNull();
			expect(submittedData!.name).toBe("プレイヤー"); // From GameContext
			expect(submittedData!.avatar).toBe("😀"); // Default avatar
		});

		it("should submit with selected avatar", () => {
			// Change avatar selection
			const radioGroup = findRadioButtonGroup();
			expect(radioGroup).not.toBeNull();
			radioGroup!.setSelectedId("avatar3");

			// Submit form
			const submitButton = findButton("submitProfileButton");
			expect(submitButton).not.toBeNull();
			submitButton!.send();

			// Verify submitted data includes selected avatar
			expect(submittedData).not.toBeNull();
			expect(submittedData!.name).toBe("プレイヤー"); // From GameContext
			expect(submittedData!.avatar).toBe("🥰");
		});
	});

	describe("interaction behavior", () => {
		it("should handle name button click without errors", () => {
			const nameButtonBg = findNameButtonBackground();
			expect(nameButtonBg).not.toBeNull();

			// Click name button (should not throw error even though handler is placeholder)
			expect(() => {
				nameButtonBg!.onPointDown.fire({
					type: "point-down",
					eventFlags: 0,
					player: undefined,
					point: { x: 100, y: 160 },
					pointerId: 0,
					button: 0,
					target: nameButtonBg!,
					local: true,
				});
			}).not.toThrow();
		});

		it("should handle avatar selection clicks", () => {
			const radioGroup = findRadioButtonGroup();
			expect(radioGroup).not.toBeNull();

			// Find and click avatar2 button
			const avatar2Button = findAvatarButton("avatar2");
			expect(avatar2Button).not.toBeNull();

			avatar2Button!.send();

			// Verify selection changed
			expect(radioGroup!.getSelectedId()).toBe("avatar2");
		});
	});

	describe("multi-player broadcasting", () => {
		let multiGameContext: GameContext;

		beforeEach(() => {
			// Set up multi mode for broadcasting tests
			// Mock selfId for testing
			scene.game.selfId = "player1";

			// Create multi-player GameContext
			multiGameContext = GameContext.createForTesting(scene.game.selfId, "multi");
		});

		it("should broadcast profile on initialization in multi mode", () => {
			const gameVars = scene.game.vars as GameVars;
			let broadcastedMessage: any = null;

			// Mock raiseEvent to capture broadcast
			const originalRaiseEvent = scene.game.raiseEvent;
			scene.game.raiseEvent = jest.fn((event: any) => {
				if (event.data?.type === "profileUpdate") {
					broadcastedMessage = event.data;
				}
			});

			// Create new ProfileEditorE to trigger initialization broadcast
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
				gameContext: multiGameContext,
				width: scene.game.width,
				height: scene.game.height,
				onComplete: () => {},
			});

			// Verify broadcast was sent with current profile data
			expect(broadcastedMessage).not.toBeNull();
			expect(broadcastedMessage.type).toBe("profileUpdate");
			expect(broadcastedMessage.profileData.playerId).toBe("player1");
			expect(broadcastedMessage.profileData.name).toBe("プレイヤー"); // From GameContext
			expect(broadcastedMessage.profileData.avatar).toBe("😀"); // From GameContext

			// Cleanup
			testProfileEditor.destroy();
			scene.game.raiseEvent = originalRaiseEvent;
		});

		it("should receive and store other players' profile broadcasts", () => {
			// Import createPlayerData for test
			const { createPlayerData } = require("../../src/data/playerData");

			// Set up message handlers directly on test scene (simulating MainScene behavior)
			scene.onMessage.add((ev: g.MessageEvent) => {
				// Handle profile broadcasts
				if (ev.data?.type === "profileUpdate" && ev.data?.profileData) {
					const profileData = ev.data.profileData;
					if (profileData.playerId && profileData.playerId !== scene.game.selfId) {
						// Add new player to GameContext if not exists
						if (!multiGameContext.allPlayers.has(profileData.playerId)) {
							const newPlayer = createPlayerData(
								profileData.playerId,
								{ name: profileData.name, avatar: profileData.avatar },
								0
							);
							multiGameContext.addPlayer(profileData.playerId, newPlayer);
						}
						else {
							// Update existing player profile
							multiGameContext.updatePlayerProfile(profileData.playerId, {
								name: profileData.name,
								avatar: profileData.avatar,
							});
						}
					}
				}
			});

			// Create ProfileEditorE instance for testing
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
				gameContext: multiGameContext,
				width: scene.game.width,
				height: scene.game.height,
				onComplete: () => {},
			});

			// Simulate receiving a profile update from another player
			const mockMessage = {
				data: {
					type: "profileUpdate",
					profileData: {
						playerId: "player2",
						name: "他のプレイヤー",
						avatar: "😎",
					},
				},
			};

			// Trigger the message handler
			scene.onMessage.fire(mockMessage as any);

			// Verify the other player's profile was stored in GameContext
			const player2 = multiGameContext.allPlayers.get("player2");
			expect(player2).toBeDefined();
			expect(player2!.profile.name).toBe("他のプレイヤー");
			expect(player2!.profile.avatar).toBe("😎");

			// Cleanup
			testProfileEditor.destroy();
		});

		it("should call onProfileChange callback when profile changes", () => {
			let profileChangeCallCount = 0;

			// Create ProfileEditorE instance with profile change callback
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
				gameContext: multiGameContext,
				width: scene.game.width,
				height: scene.game.height,
				onComplete: () => {},
				onProfileChange: () => {
					profileChangeCallCount++;
				},
			});

			// Change avatar selection to trigger onProfileChange
			const radioGroup = testProfileEditor.children?.find(child => child instanceof RadioButtonGroupE) as RadioButtonGroupE;
			expect(radioGroup).toBeDefined();
			radioGroup.setSelectedId("avatar2");

			// Verify callback was called
			expect(profileChangeCallCount).toBe(1);

			// Cleanup
			testProfileEditor.destroy();
		});

		it("should call onProfileChange callback when name changes via resolvePlayerInfo", () => {
			// Set up mock resolvePlayerInfo to simulate successful name change
			mockResolvePlayerInfo.mockImplementation((_opts, callback?) => {
				if (callback) {
					callback(null, { name: "新しい名前", userData: {} });
				}
			});

			let profileChangeCallCount = 0;

			// Create ProfileEditorE instance with profile change callback
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
				gameContext: multiGameContext,
				width: scene.game.width,
				height: scene.game.height,
				onComplete: () => {},
				onProfileChange: () => {
					profileChangeCallCount++;
				},
			});

			// Find and click the name button to trigger resolvePlayerInfo
			const nameButtonBg = testProfileEditor.children?.find(child =>
				child instanceof g.FilledRect && child.touchable && child.cssColor === "#689f38"
			) as g.FilledRect;
			expect(nameButtonBg).toBeDefined();

			// Simulate clicking the name button
			nameButtonBg.onPointDown.fire({
				type: "point-down",
				eventFlags: 0,
				player: undefined,
				point: { x: 100, y: 160 },
				pointerId: 0,
				button: 0,
				target: nameButtonBg,
				local: true,
			});

			// Verify callback was called
			expect(profileChangeCallCount).toBe(1);

			// Cleanup
			testProfileEditor.destroy();
		});

		it("should update name button text when player name is resolved", () => {
			// Set up mock resolvePlayerInfo to simulate successful name resolution
			mockResolvePlayerInfo.mockImplementation((_opts, callback?) => {
				if (callback) {
					callback(null, { name: "解決されたプレイヤー名", userData: {} });
				}
			});

			// Create ProfileEditorE instance
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
				gameContext: multiGameContext,
				width: scene.game.width,
				height: scene.game.height,
				onComplete: () => {},
			});

			// Find the initial name button text
			const initialNameButtonText = testProfileEditor.children?.find(child =>
				child instanceof g.Label && child.text === "名前を設定する"
			) as g.Label;
			expect(initialNameButtonText).toBeDefined();
			expect(initialNameButtonText.text).toBe("名前を設定する");

			// Find and click the name button to trigger resolvePlayerInfo
			const nameButtonBg = testProfileEditor.children?.find(child =>
				child instanceof g.FilledRect && child.touchable && child.cssColor === "#689f38"
			) as g.FilledRect;
			expect(nameButtonBg).toBeDefined();

			// Simulate clicking the name button
			nameButtonBg.onPointDown.fire({
				type: "point-down",
				eventFlags: 0,
				player: undefined,
				point: { x: 100, y: 160 },
				pointerId: 0,
				button: 0,
				target: nameButtonBg,
				local: true,
			});

			// Find the updated name button text
			const updatedNameButtonText = testProfileEditor.children?.find(child =>
				child instanceof g.Label && child.text === "解決されたプレイヤー名"
			) as g.Label;
			expect(updatedNameButtonText).toBeDefined();

			// Cleanup
			testProfileEditor.destroy();
		});

		it("should use resolvePlayerInfo when name button clicked in multi mode", () => {
			// Set up mock resolvePlayerInfo to simulate successful player name resolution
			mockResolvePlayerInfo.mockImplementation((_opts, callback?) => {
				// Simulate successful resolution with player name
				if (callback) {
					callback(null, { name: "新しいプレイヤー名", userData: {} });
				}
			});

			let profileChangeCallCount = 0;

			// Create ProfileEditorE instance in multi mode with profile change callback
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
				gameContext: multiGameContext,
				width: scene.game.width,
				height: scene.game.height,
				onComplete: () => {},
				onProfileChange: () => {
					profileChangeCallCount++;
				},
			});

			// Find the name button background (clickable area)
			const nameButtonBg = testProfileEditor.children?.find(child =>
				child instanceof g.FilledRect && child.touchable && child.cssColor === "#689f38"
			) as g.FilledRect;
			expect(nameButtonBg).toBeDefined();

			// Simulate clicking the name button
			nameButtonBg.onPointDown.fire({
				type: "point-down",
				eventFlags: 0,
				player: undefined,
				point: { x: 100, y: 160 },
				pointerId: 0,
				button: 0,
				target: nameButtonBg,
				local: true,
			});

			// Verify that resolvePlayerInfo was called
			expect(mockResolvePlayerInfo).toHaveBeenCalledTimes(1);
			expect(mockResolvePlayerInfo).toHaveBeenCalledWith({}, expect.any(Function));

			// Verify that the player name was updated in GameContext
			expect(multiGameContext.currentPlayer.profile.name).toBe("新しいプレイヤー名");

			// Verify that onProfileChange callback was called
			expect(profileChangeCallCount).toBe(1);

			// Find the name button text and verify it was updated
			const nameButtonText = testProfileEditor.children?.find(child =>
				child instanceof g.Label && child.text === "新しいプレイヤー名"
			) as g.Label;
			expect(nameButtonText).toBeDefined();

			// Cleanup
			testProfileEditor.destroy();
		});

		it("should handle resolvePlayerInfo errors gracefully", () => {
			// Set up mock resolvePlayerInfo to simulate error
			mockResolvePlayerInfo.mockImplementation((_opts, callback?) => {
				// Simulate error in resolution
				if (callback) {
					callback(new Error("Failed to resolve player info"));
				}
			});

			// Create ProfileEditorE instance in multi mode
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
				gameContext: multiGameContext,
				width: scene.game.width,
				height: scene.game.height,
				onComplete: () => {},
			});

			// Store initial player name
			const initialPlayerName = multiGameContext.currentPlayer.profile.name;

			// Find the name button background (clickable area)
			const nameButtonBg = testProfileEditor.children?.find(child =>
				child instanceof g.FilledRect && child.touchable && child.cssColor === "#689f38"
			) as g.FilledRect;
			expect(nameButtonBg).toBeDefined();

			// Simulate clicking the name button
			expect(() => {
				nameButtonBg.onPointDown.fire({
					type: "point-down",
					eventFlags: 0,
					player: undefined,
					point: { x: 100, y: 160 },
					pointerId: 0,
					button: 0,
					target: nameButtonBg,
					local: true,
				});
			}).not.toThrow();

			// Verify that resolvePlayerInfo was called
			expect(mockResolvePlayerInfo).toHaveBeenCalledTimes(1);

			// Verify that player name remains unchanged when there's an error
			expect(multiGameContext.currentPlayer.profile.name).toBe(initialPlayerName);

			// Cleanup
			testProfileEditor.destroy();
		});
	});

	// Helper functions
	function findButton(buttonName: string): LabelButtonE<any> | null {
		const findButtonRecursive = (entity: g.E): LabelButtonE<any> | null => {
			if (entity instanceof LabelButtonE && entity.name === buttonName) {
				return entity;
			}
			if (entity.children) {
				for (const child of entity.children) {
					const found = findButtonRecursive(child);
					if (found) return found;
				}
			}
			return null;
		};
		return findButtonRecursive(profileEditor);
	}

	function findRadioButtonGroup(): RadioButtonGroupE | null {
		const findGroupRecursive = (entity: g.E): RadioButtonGroupE | null => {
			if (entity instanceof RadioButtonGroupE) {
				return entity;
			}
			if (entity.children) {
				for (const child of entity.children) {
					const found = findGroupRecursive(child);
					if (found) return found;
				}
			}
			return null;
		};
		return findGroupRecursive(profileEditor);
	}

	function findAvatarButton(avatarId: string): LabelButtonE<any> | null {
		const findButtonRecursive = (entity: g.E): LabelButtonE<any> | null => {
			if (entity instanceof LabelButtonE && entity.name === `radioButton_${avatarId}`) {
				return entity;
			}
			if (entity.children) {
				for (const child of entity.children) {
					const found = findButtonRecursive(child);
					if (found) return found;
				}
			}
			return null;
		};
		return findButtonRecursive(profileEditor);
	}

	function findNameButtonBackground(): g.FilledRect | null {
		const findBgRecursive = (entity: g.E): g.FilledRect | null => {
			if (entity instanceof g.FilledRect && entity.touchable && entity.cssColor === "#689f38") {
				return entity;
			}
			if (entity.children) {
				for (const child of entity.children) {
					const found = findBgRecursive(child);
					if (found) return found;
				}
			}
			return null;
		};
		return findBgRecursive(profileEditor);
	}
});
