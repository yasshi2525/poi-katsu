import { ProfileEditorE, ProfileData } from "../../src/entity/profileEditorE";
import { LabelButtonE } from "../../src/entity/labelButtonE";
import { RadioButtonGroupE } from "../../src/entity/radioButtonGroupE";

describe("ProfileEditorE", () => {
	let profileEditor: ProfileEditorE;
	let submittedData: ProfileData | null = null;

	beforeEach(() => {
		// Reset submitted data
		submittedData = null;

		// Initialize game variables with proper playerProfile structure
		const gameVars: GameVars = {
			mode: "ranking", // Use ranking mode for synchronous button behavior
			totalTimeLimit: 100,
			gameState: {
				score: 0,
			},
			playerProfile: {
				name: "プレイヤー",
				avatar: "😀",
			},
			allPlayersProfiles: {},
			allPlayersScores: {},
		};
		scene.game.vars = gameVars;

		// Create ProfileEditorE instance using global scene
		profileEditor = new ProfileEditorE({
			scene: scene,
			width: scene.game.width,
			height: scene.game.height,
			onComplete: () => {
				// ProfileEditorE now updates gameVars directly, so read from there
				const gameVars = scene.game.vars as GameVars;
				submittedData = {
					name: gameVars.playerProfile.name,
					avatar: gameVars.playerProfile.avatar,
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
			expect(submittedData!.name).toBe("プレイヤー");
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
			expect(submittedData!.name).toBe("プレイヤー");
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
		beforeEach(() => {
			// Set up multi mode for broadcasting tests
			const gameVars = scene.game.vars as GameVars;
			gameVars.mode = "multi";
			// Mock selfId for testing
			(scene.game as any).selfId = "player1";
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
				width: scene.game.width,
				height: scene.game.height,
				onComplete: () => {},
			});

			// Verify broadcast was sent with current profile data
			expect(broadcastedMessage).not.toBeNull();
			expect(broadcastedMessage.type).toBe("profileUpdate");
			expect(broadcastedMessage.profileData.playerId).toBe("player1");
			expect(broadcastedMessage.profileData.name).toBe(gameVars.playerProfile.name);
			expect(broadcastedMessage.profileData.avatar).toBe(gameVars.playerProfile.avatar);

			// Cleanup
			testProfileEditor.destroy();
			scene.game.raiseEvent = originalRaiseEvent;
		});

		it("should receive and store other players' profile broadcasts", () => {
			const gameVars = scene.game.vars as GameVars;

			// Set up message handlers directly on test scene (simulating MainScene behavior)
			scene.onMessage.add((ev: g.MessageEvent) => {
				// Handle profile broadcasts
				if (ev.data?.type === "profileUpdate" && ev.data?.profileData) {
					const profileData = ev.data.profileData;
					if (profileData.playerId && profileData.playerId !== scene.game.selfId) {
						gameVars.allPlayersProfiles[profileData.playerId] = {
							name: profileData.name,
							avatar: profileData.avatar,
						};
					}
				}
			});

			// Create ProfileEditorE instance for testing
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
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

			// Verify the other player's profile was stored
			expect(gameVars.allPlayersProfiles["player2"]).toBeDefined();
			expect(gameVars.allPlayersProfiles["player2"].name).toBe("他のプレイヤー");
			expect(gameVars.allPlayersProfiles["player2"].avatar).toBe("😎");

			// Cleanup
			testProfileEditor.destroy();
		});

		it("should call onProfileChange callback when profile changes", () => {
			let profileChangeCallCount = 0;

			// Create ProfileEditorE instance with profile change callback
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
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

		it("should call onProfileChange callback when name changes via playerInfo", () => {
			let profileChangeCallCount = 0;

			// Create ProfileEditorE instance with profile change callback
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
				width: scene.game.width,
				height: scene.game.height,
				onComplete: () => {},
				onProfileChange: () => {
					profileChangeCallCount++;
				},
			});

			// Simulate receiving a playerInfo event for current player
			const mockPlayerInfoEvent = {
				player: {
					id: "player1",
					name: "新しい名前",
				},
			};

			// Trigger the playerInfo handler
			scene.game.onPlayerInfo.fire(mockPlayerInfoEvent as any);

			// Verify callback was called
			expect(profileChangeCallCount).toBe(1);

			// Cleanup
			testProfileEditor.destroy();
		});

		it("should update name button text when player name is received", () => {
			// Create ProfileEditorE instance
			const testProfileEditor = new ProfileEditorE({
				scene: scene,
				width: scene.game.width,
				height: scene.game.height,
				onComplete: () => {},
			});

			// Find the name button text
			const nameButtonText = testProfileEditor.children?.find(child =>
				child instanceof g.Label && child.text === "名前を設定する"
			) as g.Label;
			expect(nameButtonText).toBeDefined();
			expect(nameButtonText.text).toBe("名前を設定する");

			// Simulate receiving a playerInfo event for current player with new name
			const mockPlayerInfoEvent = {
				player: {
					id: "player1",
					name: "テストプレイヤー",
				},
			};

			// Trigger the playerInfo handler
			scene.game.onPlayerInfo.fire(mockPlayerInfoEvent as any);

			// Verify the name button text was updated
			expect(nameButtonText.text).toBe("テストプレイヤー");

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
			if (entity instanceof g.FilledRect && entity.touchable && entity.cssColor === "#34495e") {
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
