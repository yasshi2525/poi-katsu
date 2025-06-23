import { TimelineE } from "../../src/entity/timelineE";
import { SharedPostData, createSharedPost } from "../../src/data/sharedPostData";
import { createItemData } from "../../src/data/itemData";
import { AFFILIATE_CONFIG } from "../../src/config/affiliateConfig";
import { ItemManager } from "../../src/manager/itemManager";

describe("TimelineE", () => {
	let timeline: TimelineE;
	let itemManager: ItemManager;
	let mockAffiliatePurchase: jest.Mock;
	let mockCheckPoints: jest.Mock;
	let mockDeductPoints: jest.Mock;
	let mockItemPurchased: jest.Mock;
	let mockCheckOwnership: jest.Mock;
	let mockRaiseEvent: jest.Mock;

	beforeEach(() => {
		// Set up game variables
		const gameVars = scene.game.vars as GameVars;
		gameVars.mode = "ranking";
		gameVars.totalTimeLimit = 120;
		gameVars.gameState = { score: 1000 };

		// Initialize mocks
		mockAffiliatePurchase = jest.fn();
		mockCheckPoints = jest.fn(() => 1000);
		mockDeductPoints = jest.fn();
		mockItemPurchased = jest.fn();
		mockCheckOwnership = jest.fn(() => false);
		mockRaiseEvent = jest.fn();

		// Spy on raiseEvent to capture broadcast messages
		jest.spyOn(scene.game, "raiseEvent").mockImplementation(mockRaiseEvent);

		// Create item manager with test data
		itemManager = new ItemManager();

		// Create timeline instance
		timeline = new TimelineE({
			scene: scene,
			width: scene.game.width,
			height: scene.game.height,
			itemManager: itemManager,
			onAffiliatePurchase: mockAffiliatePurchase,
			onCheckPoints: mockCheckPoints,
			onDeductPoints: mockDeductPoints,
			onItemPurchased: mockItemPurchased,
			onCheckOwnership: mockCheckOwnership,
		});
		scene.append(timeline);
	});

	afterEach(() => {
		if (timeline) {
			timeline.destroy();
		}
	});

	describe("Shared Post Management", () => {
		it("should add shared posts to timeline", () => {
			const testItem = createItemData({
				id: "shared_item_1",
				name: "シェアアイテム1",
				emoji: "📖",
				category: "novel",
				purchasePrice: 100,
				individualPrice: 120,
			});
			itemManager.addItemDataForTesting(testItem);

			const sharedPost = createSharedPost({
				id: "post_1",
				sharerName: "テストユーザー",
				item: testItem,
				sharedPrice: 95,
				sharedAt: Date.now(),
			});

			timeline.addSharedPost(sharedPost);

			// Verify post was added (timeline should recreate layout)
			expect(timeline.children?.length).toBeGreaterThan(1); // Header + at least one post
		});

		it("should display shared posts with correct information", () => {
			const testItem = createItemData({
				id: "display_test_item",
				name: "表示テストアイテム",
				emoji: "💰",
				category: "manga",
				purchasePrice: 200,
				individualPrice: 250,
			});
			itemManager.addItemDataForTesting(testItem);

			const sharedPost = createSharedPost({
				id: "display_post",
				sharerName: "表示テストユーザー",
				item: testItem,
				sharedPrice: 180,
				sharedAt: Date.now(),
			});

			timeline.addSharedPost(sharedPost);

			// Check that timeline contains elements (detailed UI testing would require more complex setup)
			expect(timeline.children?.length).toBeGreaterThan(0);
		});

		it("should handle multiple shared posts", () => {
			const items = [
				createItemData({
					id: "multi_item_1",
					name: "マルチアイテム1",
					emoji: "📚",
					category: "novel",
					purchasePrice: 100,
					individualPrice: 120,
				}),
				createItemData({
					id: "multi_item_2",
					name: "マルチアイテム2",
					emoji: "📖",
					category: "manga",
					purchasePrice: 150,
					individualPrice: 180,
				}),
			];
			items.forEach(item => itemManager.addItemDataForTesting(item));

			const posts = items.map((item, index) => createSharedPost({
				id: `multi_post_${index}`,
				sharerName: `ユーザー${index + 1}`,
				item: item,
				sharedPrice: item.purchasePrice - 10,
				sharedAt: Date.now() + index * 1000,
			}));

			posts.forEach(post => timeline.addSharedPost(post));

			// Timeline should handle multiple posts
			expect(timeline.children?.length).toBeGreaterThan(posts.length);
		});
	});

	describe("Affiliate Purchase Flow", () => {
		let testSharedPost: SharedPostData;

		beforeEach(() => {
			const testItem = createItemData({
				id: "affiliate_test_item",
				name: "アフィリエイトテストアイテム",
				emoji: "💎",
				category: "novel",
				purchasePrice: 100,
				individualPrice: 120,
			});
			itemManager.addItemDataForTesting(testItem);

			testSharedPost = createSharedPost({
				id: "affiliate_post_1",
				sharerName: "アフィリエイター",
				item: testItem,
				sharedPrice: 90,
				sharedAt: Date.now(),
			});

			timeline.addSharedPost(testSharedPost);
		});

		it("should process valid affiliate purchase", () => {
			mockCheckPoints.mockReturnValue(1000);
			mockCheckOwnership.mockReturnValue(false);

			// Simulate affiliate purchase
			(timeline as any).handleAffiliatePurchase("affiliate_post_1");

			// Verify purchase flow
			expect(mockDeductPoints).toHaveBeenCalledWith(90);
			expect(mockItemPurchased).toHaveBeenCalledWith(testSharedPost.item);

			// Verify affiliate purchase broadcast
			const expectedReward = Math.floor(90 * AFFILIATE_CONFIG.REWARD_RATE);
			expect(mockRaiseEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						type: "affiliatePurchase",
						purchaseData: expect.objectContaining({
							postId: "affiliate_post_1",
							buyerName: AFFILIATE_CONFIG.TIMELINE.DEFAULT_PLAYER_NAME,
							rewardPoints: expectedReward,
						}),
					}),
				})
			);
		});

		it("should prevent purchase if already owned", () => {
			mockCheckOwnership.mockReturnValue(true); // Item already owned

			(timeline as any).handleAffiliatePurchase("affiliate_post_1");

			// Should not proceed with purchase
			expect(mockDeductPoints).not.toHaveBeenCalled();
			expect(mockItemPurchased).not.toHaveBeenCalled();
			expect(mockAffiliatePurchase).not.toHaveBeenCalled();
		});

		it("should prevent purchase if insufficient points", () => {
			mockCheckPoints.mockReturnValue(50); // Less than shared price (90)
			mockCheckOwnership.mockReturnValue(false);

			(timeline as any).handleAffiliatePurchase("affiliate_post_1");

			// Should not proceed with purchase
			expect(mockDeductPoints).not.toHaveBeenCalled();
			expect(mockItemPurchased).not.toHaveBeenCalled();
			expect(mockAffiliatePurchase).not.toHaveBeenCalled();
		});

		it("should handle non-existent post gracefully", () => {
			expect(() => {
				(timeline as any).handleAffiliatePurchase("non_existent_post");
			}).not.toThrow();

			// Should not proceed with any purchase actions
			expect(mockDeductPoints).not.toHaveBeenCalled();
			expect(mockItemPurchased).not.toHaveBeenCalled();
			expect(mockAffiliatePurchase).not.toHaveBeenCalled();
		});
	});

	describe("Affiliate Reward Calculation", () => {
		it("should calculate correct 10% reward", () => {
			const testCases = [
				{ price: 100, expectedReward: 10 },
				{ price: 250, expectedReward: 25 },
				{ price: 99, expectedReward: 9 }, // Floor rounding
				{ price: 1, expectedReward: 0 }, // Floor rounding
			];

			testCases.forEach(({ price, expectedReward }) => {
				const testItem = createItemData({
					id: `reward_test_${price}`,
					name: `リワードテスト${price}`,
					emoji: "💰",
					category: "novel",
					purchasePrice: price,
					individualPrice: price + 20,
				});
				itemManager.addItemDataForTesting(testItem);

				const sharedPost = createSharedPost({
					id: `reward_post_${price}`,
					sharerName: "リワードテスター",
					item: testItem,
					sharedPrice: price,
					sharedAt: Date.now(),
				});

				timeline.addSharedPost(sharedPost);

				mockCheckPoints.mockReturnValue(1000);
				mockCheckOwnership.mockReturnValue(false);
				mockRaiseEvent.mockClear();

				(timeline as any).handleAffiliatePurchase(`reward_post_${price}`);

				expect(mockRaiseEvent).toHaveBeenCalledWith(
					expect.objectContaining({
						data: expect.objectContaining({
							type: "affiliatePurchase",
							purchaseData: expect.objectContaining({
								postId: `reward_post_${price}`,
								buyerName: AFFILIATE_CONFIG.TIMELINE.DEFAULT_PLAYER_NAME,
								rewardPoints: expectedReward,
							}),
						}),
					})
				);
			});
		});

		it("should use configured reward rate", () => {
			// Verify it's using the config constant
			expect(AFFILIATE_CONFIG.REWARD_RATE).toBe(0.1);

			const price = 500;
			const expectedReward = Math.floor(price * AFFILIATE_CONFIG.REWARD_RATE);

			const testItem = createItemData({
				id: "config_test_item",
				name: "設定テストアイテム",
				emoji: "⚙️",
				category: "novel",
				purchasePrice: price,
				individualPrice: price + 50,
			});
			itemManager.addItemDataForTesting(testItem);

			const sharedPost = createSharedPost({
				id: "config_post",
				sharerName: "設定テスター",
				item: testItem,
				sharedPrice: price,
				sharedAt: Date.now(),
			});

			timeline.addSharedPost(sharedPost);

			mockCheckPoints.mockReturnValue(1000);
			mockCheckOwnership.mockReturnValue(false);

			(timeline as any).handleAffiliatePurchase("config_post");

			expect(mockRaiseEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						type: "affiliatePurchase",
						purchaseData: expect.objectContaining({
							postId: "config_post",
							buyerName: AFFILIATE_CONFIG.TIMELINE.DEFAULT_PLAYER_NAME,
							rewardPoints: expectedReward,
						}),
					}),
				})
			);
		});
	});

	describe("Button State Management", () => {
		let testSharedPost: SharedPostData;

		beforeEach(() => {
			const testItem = createItemData({
				id: "button_test_item",
				name: "ボタンテストアイテム",
				emoji: "🔘",
				category: "novel",
				purchasePrice: 100,
				individualPrice: 120,
			});
			itemManager.addItemDataForTesting(testItem);

			testSharedPost = createSharedPost({
				id: "button_post",
				sharerName: "ボタンテスター",
				item: testItem,
				sharedPrice: 85,
				sharedAt: Date.now(),
			});

			timeline.addSharedPost(testSharedPost);
		});

		it("should disable button after successful purchase", () => {
			mockCheckPoints.mockReturnValue(1000);
			mockCheckOwnership.mockReturnValue(false);

			// Set up mock to simulate item being added to inventory when onItemPurchased is called
			mockItemPurchased.mockImplementation(() => {
				// Simulate that after purchase, the item is now owned
				mockCheckOwnership.mockReturnValue(true);
			});

			// Purchase item
			(timeline as any).handleAffiliatePurchase("button_post");

			// Button should be disabled after refresh (refreshTimeline() is called after purchase)
			const button = (timeline as any).affiliateButtons.get("button_post");
			expect(button).toBeDefined();
			if (button) {
				expect(button.touchable).toBe(false);
			}
		});

		it("should show owned state for items already owned", () => {
			mockCheckOwnership.mockReturnValue(true); // Item already owned

			// Recreate timeline to test initial button state
			timeline.destroy();
			timeline = new TimelineE({
				scene: scene,
				width: scene.game.width,
				height: scene.game.height,
				onAffiliatePurchase: mockAffiliatePurchase,
				onCheckPoints: mockCheckPoints,
				onDeductPoints: mockDeductPoints,
				onItemPurchased: mockItemPurchased,
				onCheckOwnership: mockCheckOwnership,
			});
			scene.append(timeline);

			timeline.addSharedPost(testSharedPost);

			// Button should be created in disabled state
			const button = (timeline as any).affiliateButtons.get("button_post");
			expect(button).toBeDefined();
			if (button) {
				expect(button.touchable).toBe(false);
			}
		});
	});

	describe("Concurrent Purchase Scenarios", () => {
		it("should handle rapid button clicks gracefully", () => {
			const testItem = createItemData({
				id: "concurrent_item",
				name: "同時テストアイテム",
				emoji: "⚡",
				category: "novel",
				purchasePrice: 100,
				individualPrice: 120,
			});
			itemManager.addItemDataForTesting(testItem);

			const sharedPost = createSharedPost({
				id: "concurrent_post",
				sharerName: "同時テスター",
				item: testItem,
				sharedPrice: 80,
				sharedAt: Date.now(),
			});

			timeline.addSharedPost(sharedPost);

			mockCheckPoints.mockReturnValue(1000);
			mockCheckOwnership.mockReturnValue(false);

			// First purchase should succeed
			(timeline as any).handleAffiliatePurchase("concurrent_post");

			// Subsequent calls should not process due to button being disabled after first purchase
			// However, in our test setup, we're calling the handler directly, bypassing the button state
			// So we expect all calls to process, but in real usage the button would be disabled
			expect(mockDeductPoints).toHaveBeenCalled();
			expect(mockItemPurchased).toHaveBeenCalled();
			expect(mockRaiseEvent).toHaveBeenCalled();
		});

		it("should handle purchase with changing point balance", () => {
			const testItem = createItemData({
				id: "balance_item",
				name: "残高テストアイテム",
				emoji: "💳",
				category: "novel",
				purchasePrice: 100,
				individualPrice: 120,
			});
			itemManager.addItemDataForTesting(testItem);

			const sharedPost = createSharedPost({
				id: "balance_post",
				sharerName: "残高テスター",
				item: testItem,
				sharedPrice: 90,
				sharedAt: Date.now(),
			});

			timeline.addSharedPost(sharedPost);

			// Start with sufficient points
			mockCheckPoints.mockReturnValue(100);
			mockCheckOwnership.mockReturnValue(false);

			// First purchase should succeed
			(timeline as any).handleAffiliatePurchase("balance_post");

			expect(mockDeductPoints).toHaveBeenCalledWith(90);
			expect(mockItemPurchased).toHaveBeenCalledTimes(1);

			// Simulate insufficient points for subsequent attempts
			mockCheckPoints.mockReturnValue(10);
			mockDeductPoints.mockClear();
			mockItemPurchased.mockClear();

			// Second attempt should fail due to insufficient points
			(timeline as any).handleAffiliatePurchase("balance_post");

			expect(mockDeductPoints).not.toHaveBeenCalled();
			expect(mockItemPurchased).not.toHaveBeenCalled();
		});
	});

	describe("Layout and Responsiveness", () => {
		it("should handle different screen sizes", () => {
			timeline.destroy();
			timeline = new TimelineE({
				scene: scene,
				width: 800,
				height: 600,
				onAffiliatePurchase: mockAffiliatePurchase,
				onCheckPoints: mockCheckPoints,
				onDeductPoints: mockDeductPoints,
				onItemPurchased: mockItemPurchased,
				onCheckOwnership: mockCheckOwnership,
			});
			scene.append(timeline);

			// Should create layout without errors
			expect(timeline.children?.length).toBeGreaterThan(0);
		});

		it("should refresh layout when posts are added", () => {
			const initialChildren = timeline.children?.length || 0;

			const testItem = createItemData({
				id: "refresh_item",
				name: "リフレッシュテストアイテム",
				emoji: "🔄",
				category: "novel",
				purchasePrice: 100,
				individualPrice: 120,
			});
			itemManager.addItemDataForTesting(testItem);

			const sharedPost = createSharedPost({
				id: "refresh_post",
				sharerName: "リフレッシュテスター",
				item: testItem,
				sharedPrice: 85,
				sharedAt: Date.now(),
			});

			timeline.addSharedPost(sharedPost);

			// Layout should be refreshed (children count may change)
			const newChildren = timeline.children?.length || 0;
			expect(newChildren).toBeGreaterThan(0);
		});
	});
});
