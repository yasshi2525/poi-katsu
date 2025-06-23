import { createSharedPost, SharedPostData } from "../../src/data/sharedPostData";
import { createItemData } from "../../src/data/itemData";

describe("SharedPostData", () => {
	describe("createSharedPost function", () => {
		let testItem: any;

		beforeEach(() => {
			testItem = createItemData({
				id: "test_item_1",
				name: "テストアイテム",
				emoji: "📚",
				category: "novel",
				purchasePrice: 100,
				individualPrice: 120,
			});
		});

		it("should create shared post with all required fields", () => {
			const options = {
				id: "post_1",
				sharerName: "テストユーザー",
				item: testItem,
				sharedPrice: 95,
				sharedAt: Date.now(),
			};

			const sharedPost = createSharedPost(options);

			expect(sharedPost.id).toBe(options.id);
			expect(sharedPost.sharerName).toBe(options.sharerName);
			expect(sharedPost.item).toBe(options.item);
			expect(sharedPost.sharedPrice).toBe(options.sharedPrice);
			expect(sharedPost.sharedAt).toBe(options.sharedAt);
		});

		it("should default isAffiliate to true when not specified", () => {
			const options = {
				id: "post_default",
				sharerName: "デフォルトユーザー",
				item: testItem,
				sharedPrice: 90,
				sharedAt: Date.now(),
			};

			const sharedPost = createSharedPost(options);

			expect(sharedPost.isAffiliate).toBe(true);
		});

		it("should respect explicitly set isAffiliate value", () => {
			const optionsTrue = {
				id: "post_true",
				sharerName: "明示的ユーザー",
				item: testItem,
				sharedPrice: 85,
				sharedAt: Date.now(),
				isAffiliate: true,
			};

			const optionsFalse = {
				id: "post_false",
				sharerName: "非アフィリエイトユーザー",
				item: testItem,
				sharedPrice: 88,
				sharedAt: Date.now(),
				isAffiliate: false,
			};

			const sharedPostTrue = createSharedPost(optionsTrue);
			const sharedPostFalse = createSharedPost(optionsFalse);

			expect(sharedPostTrue.isAffiliate).toBe(true);
			expect(sharedPostFalse.isAffiliate).toBe(false);
		});

		it("should handle various data types correctly", () => {
			const now = Date.now();
			const options = {
				id: "post_types",
				sharerName: "型テストユーザー",
				item: testItem,
				sharedPrice: 150.75, // Float price
				sharedAt: now,
				isAffiliate: false,
			};

			const sharedPost = createSharedPost(options);

			expect(typeof sharedPost.id).toBe("string");
			expect(typeof sharedPost.sharerName).toBe("string");
			expect(typeof sharedPost.item).toBe("object");
			expect(typeof sharedPost.sharedPrice).toBe("number");
			expect(typeof sharedPost.sharedAt).toBe("number");
			expect(typeof sharedPost.isAffiliate).toBe("boolean");

			expect(sharedPost.sharedPrice).toBe(150.75);
			expect(sharedPost.sharedAt).toBe(now);
		});

		it("should create independent objects", () => {
			const baseOptions = {
				id: "post_independent_1",
				sharerName: "独立テストユーザー1",
				item: testItem,
				sharedPrice: 100,
				sharedAt: Date.now(),
			};

			const post1 = createSharedPost(baseOptions);
			const post2 = createSharedPost({
				...baseOptions,
				id: "post_independent_2",
				sharerName: "独立テストユーザー2",
				sharedPrice: 110,
			});

			// Objects should be independent
			expect(post1.id).not.toBe(post2.id);
			expect(post1.sharerName).not.toBe(post2.sharerName);
			expect(post1.sharedPrice).not.toBe(post2.sharedPrice);

			// But shared references should be the same
			expect(post1.item).toBe(post2.item);
		});
	});

	describe("SharedPostData interface compliance", () => {
		it("should match interface structure", () => {
			const testItem = createItemData({
				id: "interface_test_item",
				name: "インターフェーステストアイテム",
				emoji: "🔧",
				category: "manga",
				purchasePrice: 200,
				individualPrice: 240,
			});

			const sharedPost: SharedPostData = createSharedPost({
				id: "interface_post",
				sharerName: "インターフェーステストユーザー",
				item: testItem,
				sharedPrice: 180,
				sharedAt: Date.now(),
				isAffiliate: true,
			});

			// Verify all interface properties exist
			expect(sharedPost).toHaveProperty("id");
			expect(sharedPost).toHaveProperty("sharerName");
			expect(sharedPost).toHaveProperty("item");
			expect(sharedPost).toHaveProperty("sharedPrice");
			expect(sharedPost).toHaveProperty("sharedAt");
			expect(sharedPost).toHaveProperty("isAffiliate");

			// Verify property types match interface
			expect(typeof sharedPost.id).toBe("string");
			expect(typeof sharedPost.sharerName).toBe("string");
			expect(typeof sharedPost.item).toBe("object");
			expect(typeof sharedPost.sharedPrice).toBe("number");
			expect(typeof sharedPost.sharedAt).toBe("number");
			expect(typeof sharedPost.isAffiliate).toBe("boolean");
		});
	});

	describe("Edge Cases and Error Handling", () => {
		let testItem: any;

		beforeEach(() => {
			testItem = createItemData({
				id: "edge_test_item",
				name: "エッジテストアイテム",
				emoji: "⚠️",
				category: "novel",
				purchasePrice: 50,
				individualPrice: 60,
			});
		});

		it("should handle empty strings", () => {
			const options = {
				id: "",
				sharerName: "",
				item: testItem,
				sharedPrice: 0,
				sharedAt: 0,
			};

			const sharedPost = createSharedPost(options);

			expect(sharedPost.id).toBe("");
			expect(sharedPost.sharerName).toBe("");
			expect(sharedPost.sharedPrice).toBe(0);
			expect(sharedPost.sharedAt).toBe(0);
		});

		it("should handle negative values", () => {
			const options = {
				id: "negative_test",
				sharerName: "ネガティブテストユーザー",
				item: testItem,
				sharedPrice: -10,
				sharedAt: -1000,
			};

			const sharedPost = createSharedPost(options);

			expect(sharedPost.sharedPrice).toBe(-10);
			expect(sharedPost.sharedAt).toBe(-1000);
		});

		it("should handle special characters in strings", () => {
			const options = {
				id: "special_テスト_123_!@#",
				sharerName: "特殊文字ユーザー!@#$%^&*()",
				item: testItem,
				sharedPrice: 99.99,
				sharedAt: Date.now(),
			};

			const sharedPost = createSharedPost(options);

			expect(sharedPost.id).toBe(options.id);
			expect(sharedPost.sharerName).toBe(options.sharerName);
		});

		it("should handle very large numbers", () => {
			const largeNumber = Number.MAX_SAFE_INTEGER;
			const options = {
				id: "large_number_test",
				sharerName: "大きな数値テストユーザー",
				item: testItem,
				sharedPrice: largeNumber,
				sharedAt: largeNumber,
			};

			const sharedPost = createSharedPost(options);

			expect(sharedPost.sharedPrice).toBe(largeNumber);
			expect(sharedPost.sharedAt).toBe(largeNumber);
		});
	});

	describe("Business Logic Validation", () => {
		let testItem: any;

		beforeEach(() => {
			testItem = createItemData({
				id: "business_test_item",
				name: "ビジネステストアイテム",
				emoji: "💼",
				category: "manga",
				purchasePrice: 150,
				individualPrice: 180,
			});
		});

		it("should create posts with realistic shared prices", () => {
			const options = {
				id: "realistic_post",
				sharerName: "リアルユーザー",
				item: testItem,
				sharedPrice: 140, // Slightly below purchase price
				sharedAt: Date.now(),
			};

			const sharedPost = createSharedPost(options);

			expect(sharedPost.sharedPrice).toBeLessThan(testItem.purchasePrice);
			expect(sharedPost.sharedPrice).toBeGreaterThan(0);
		});

		it("should handle posts with same timestamp", () => {
			const timestamp = Date.now();
			const options1 = {
				id: "timestamp_post_1",
				sharerName: "タイムスタンプユーザー1",
				item: testItem,
				sharedPrice: 130,
				sharedAt: timestamp,
			};

			const options2 = {
				id: "timestamp_post_2",
				sharerName: "タイムスタンプユーザー2",
				item: testItem,
				sharedPrice: 135,
				sharedAt: timestamp,
			};

			const post1 = createSharedPost(options1);
			const post2 = createSharedPost(options2);

			expect(post1.sharedAt).toBe(post2.sharedAt);
			expect(post1.id).not.toBe(post2.id); // Should still be different posts
		});

		it("should support non-affiliate posts for future extensibility", () => {
			const options = {
				id: "non_affiliate_post",
				sharerName: "非アフィリエイトユーザー",
				item: testItem,
				sharedPrice: 140,
				sharedAt: Date.now(),
				isAffiliate: false,
			};

			const sharedPost = createSharedPost(options);

			expect(sharedPost.isAffiliate).toBe(false);
			// Non-affiliate posts might have different business logic in the future
			expect(sharedPost.item).toBe(testItem);
			expect(sharedPost.sharedPrice).toBe(140);
		});
	});
});
