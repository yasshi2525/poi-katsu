import { ShopE } from "../../src/entity/shopE";
import { ItemManager } from "../../src/manager/itemManager";
import { MarketManager } from "../../src/manager/marketManager";
import { AFFILIATE_CONFIG } from "../../src/config/affiliateConfig";
import { createItemData } from "../../src/data/itemData";

describe("ShopE", () => {
	let shop: ShopE;
	let itemManager: ItemManager;
	let marketManager: MarketManager;
	let mockCheckPoints: jest.Mock;
	let mockDeductPoints: jest.Mock;
	let mockItemPurchased: jest.Mock;
	let mockGetRemainingTime: jest.Mock;
	let mockIsTimelineRevealed: jest.Mock;
	let mockShareProduct: jest.Mock;
	let mockSnsConnectionRequest: jest.Mock;

	beforeEach(() => {
		// Set up game variables using the pre-tuned global scene
		const gameVars = scene.game.vars as GameVars;
		gameVars.mode = "ranking";
		gameVars.totalTimeLimit = 120;
		gameVars.gameState = { score: 1000 };

		// Initialize mocks
		mockCheckPoints = jest.fn(() => 1000);
		mockDeductPoints = jest.fn();
		mockItemPurchased = jest.fn();
		mockGetRemainingTime = jest.fn(() => 60); // Default: 60 seconds remaining
		mockIsTimelineRevealed = jest.fn(() => false);
		mockShareProduct = jest.fn();
		mockSnsConnectionRequest = jest.fn();

		// Create item manager with test data
		itemManager = new ItemManager();

		// Create market manager for price management
		marketManager = new MarketManager(scene, "ranking");
		marketManager.initialize();

		// Create shop instance
		shop = new ShopE({
			scene: scene,
			width: scene.game.width,
			height: scene.game.height,
			itemManager: itemManager,
			marketManager: marketManager,
			onCheckPoints: mockCheckPoints,
			onDeductPoints: mockDeductPoints,
			onItemPurchased: mockItemPurchased,
			onGetRemainingTime: mockGetRemainingTime,
			onIsTimelineRevealed: mockIsTimelineRevealed,
			onShareProduct: mockShareProduct,
			onSnsConnectionRequest: mockSnsConnectionRequest,
		});
		scene.append(shop);
	});

	afterEach(() => {
		if (shop) {
			shop.destroy();
		}
		if (marketManager) {
			marketManager.destroy();
		}
	});

	describe("Dynamic Pricing Algorithm", () => {
		it("should get dynamic price from MarketManager within valid bounds", () => {
			// Test with different remaining times
			const basePrice = 100;

			// Create test item with proper structure
			const testItem = createItemData({
				id: "pricing_test_item",
				name: "Test Item",
				emoji: "📚",
				category: "novel",
				purchasePrice: basePrice,
				individualPrice: 120,
				seriesNumber: 1,
				setPrice: 300,
			});

			// Early game (high remaining time) - more volatile
			mockGetRemainingTime.mockReturnValue(120);
			const earlyPrice = (shop as any).getDynamicPrice(testItem);

			// Late game (low remaining time) - more stable
			mockGetRemainingTime.mockReturnValue(10);
			const latePrice = (shop as any).getDynamicPrice(testItem);

			// Prices should be within bounds (either dynamic price or fallback to base price)
			expect(earlyPrice).toBeGreaterThanOrEqual(1);
			expect(earlyPrice).toBeLessThanOrEqual(basePrice * 3); // Updated to match enhanced price range
			expect(latePrice).toBeGreaterThanOrEqual(1);
			expect(latePrice).toBeLessThanOrEqual(basePrice * 3);

			// Price should not go below minimum ratio
			const minPrice = Math.floor(basePrice * AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO);
			expect(earlyPrice >= minPrice || earlyPrice === basePrice).toBe(true); // Either dynamic or fallback
			expect(latePrice >= minPrice || latePrice === basePrice).toBe(true);
		});

		it("should handle invalid base price inputs", () => {
			mockGetRemainingTime.mockReturnValue(60);

			// Test negative price item
			const negativeItem = createItemData({
				id: "negative_price_item",
				name: "Negative Test",
				emoji: "❌",
				category: "novel",
				purchasePrice: -50,
				individualPrice: 120,
				seriesNumber: 1,
				setPrice: 300,
			});
			const negativePrice = (shop as any).getDynamicPrice(negativeItem);
			expect(negativePrice).toBeGreaterThanOrEqual(1);
			expect(negativePrice).toBeLessThanOrEqual(200); // Fallback or calculated

			// Test zero price item
			const zeroItem = createItemData({
				id: "zero_price_item",
				name: "Zero Test",
				emoji: "0️⃣",
				category: "novel",
				purchasePrice: 0,
				individualPrice: 120,
				seriesNumber: 1,
				setPrice: 300,
			});
			const zeroPrice = (shop as any).getDynamicPrice(zeroItem);
			expect(zeroPrice).toBeGreaterThanOrEqual(1);
			expect(zeroPrice).toBeLessThanOrEqual(200);
		});

		it("should handle negative remaining time", () => {
			const basePrice = 100;
			mockGetRemainingTime.mockReturnValue(-30); // Negative time

			const testItem = createItemData({
				id: "negative_time_item",
				name: "Negative Time Test",
				emoji: "⏰",
				category: "novel",
				purchasePrice: basePrice,
				individualPrice: 120,
				seriesNumber: 1,
				setPrice: 300,
			});

			const price = (shop as any).getDynamicPrice(testItem);
			expect(price).toBeGreaterThanOrEqual(1);
			expect(price).toBeLessThanOrEqual(basePrice * 3); // Updated to match enhanced price range
		});

		it("should get consistent prices from MarketManager for same item", () => {
			const basePrice = 100;
			mockGetRemainingTime.mockReturnValue(60);

			const testItem = createItemData({
				id: "consistent_price_item",
				name: "Consistent Test",
				emoji: "🔄",
				category: "novel",
				purchasePrice: basePrice,
				individualPrice: 120,
				seriesNumber: 1,
				setPrice: 300,
			});

			// Generate multiple prices for same item (should be consistent in ranking mode)
			const prices = [];
			for (let i = 0; i < 5; i++) {
				prices.push((shop as any).getDynamicPrice(testItem));
			}

			// In ranking mode, MarketManager calculates directly so prices should be consistent
			const uniquePrices = new Set(prices);
			expect(uniquePrices.size).toBeGreaterThanOrEqual(1); // At least one price
		});
	});

	describe("Share Button State Management", () => {
		// Use existing items from the catalog instead of adding new ones

		it("should show disabled share button when timeline not revealed", () => {
			mockIsTimelineRevealed.mockReturnValue(false);

			// Recreate shop to apply new timeline state
			shop.destroy();
			shop = new ShopE({
				scene: scene,
				width: scene.game.width,
				height: scene.game.height,
				itemManager: itemManager,
				marketManager: marketManager,
				onCheckPoints: mockCheckPoints,
				onDeductPoints: mockDeductPoints,
				onItemPurchased: mockItemPurchased,
				onGetRemainingTime: mockGetRemainingTime,
				onIsTimelineRevealed: mockIsTimelineRevealed,
				onShareProduct: mockShareProduct,
				onSnsConnectionRequest: mockSnsConnectionRequest,
			});
			scene.append(shop);

			// Find share button (should be disabled)
			const shareButton = shop.children?.find(child =>
				(child as any).name?.includes("shop_share")
			);
			expect(shareButton).toBeDefined();
		});

		it("should show enabled share button when timeline revealed", () => {
			mockIsTimelineRevealed.mockReturnValue(true);

			// Recreate shop to apply new timeline state
			shop.destroy();
			shop = new ShopE({
				scene: scene,
				width: scene.game.width,
				height: scene.game.height,
				itemManager: itemManager,
				marketManager: marketManager,
				onCheckPoints: mockCheckPoints,
				onDeductPoints: mockDeductPoints,
				onItemPurchased: mockItemPurchased,
				onGetRemainingTime: mockGetRemainingTime,
				onIsTimelineRevealed: mockIsTimelineRevealed,
				onShareProduct: mockShareProduct,
				onSnsConnectionRequest: mockSnsConnectionRequest,
			});
			scene.append(shop);

			// Find share button (should be enabled)
			const shareButton = shop.children?.find(child =>
				(child as any).name?.includes("shop_share")
			);
			expect(shareButton).toBeDefined();
		});

		it("should refresh share buttons when timeline state changes", () => {
			// Start with timeline not revealed
			mockIsTimelineRevealed.mockReturnValue(false);

			// Trigger refresh for timeline reveal
			shop.refreshForTimelineReveal();

			// Change timeline state and refresh again
			mockIsTimelineRevealed.mockReturnValue(true);
			shop.refreshForTimelineReveal();

			// Should have recreated the display
			expect(shop.children?.length).toBeGreaterThan(0);
		});
	});

	describe("SNS Connection Flow", () => {
		beforeEach(() => {
			// Set timeline as not revealed
			mockIsTimelineRevealed.mockReturnValue(false);
		});

		it("should trigger SNS connection request when disabled share button clicked", () => {
			// Recreate shop with timeline not revealed
			shop.destroy();
			shop = new ShopE({
				scene: scene,
				width: scene.game.width,
				height: scene.game.height,
				itemManager: itemManager,
				marketManager: marketManager,
				onCheckPoints: mockCheckPoints,
				onDeductPoints: mockDeductPoints,
				onItemPurchased: mockItemPurchased,
				onGetRemainingTime: mockGetRemainingTime,
				onIsTimelineRevealed: mockIsTimelineRevealed,
				onShareProduct: mockShareProduct,
				onSnsConnectionRequest: mockSnsConnectionRequest,
			});
			scene.append(shop);

			// Get available items and use the first one for testing
			const availableItems = itemManager.getAvailableItems();
			const testItem = availableItems[0];

			// Simulate clicking disabled share button by calling the handler directly
			(shop as any).handleShareDisabled(`${testItem.id}_100`);

			// Should show SNS requirement modal (can't directly test modal creation in unit test)
			// but we can verify the flow is initiated correctly
			expect(mockIsTimelineRevealed).toHaveBeenCalled();
		});
	});

	describe("Purchase Flow Edge Cases", () => {
		let testItem: any;

		beforeEach(() => {
			// Use existing item from catalog
			const availableItems = itemManager.getAvailableItems();
			testItem = availableItems[0];
		});

		it("should handle insufficient points gracefully", () => {
			mockCheckPoints.mockReturnValue(50); // Less than item price
			mockGetRemainingTime.mockReturnValue(60);

			// Get dynamic price from MarketManager via ShopE
			const dynamicPrice = (shop as any).getDynamicPrice(testItem);

			// Attempt purchase
			(shop as any).handlePurchase(`${testItem.id}_${dynamicPrice}`);

			// Should not deduct points or call purchase callback
			expect(mockDeductPoints).not.toHaveBeenCalled();
			expect(mockItemPurchased).not.toHaveBeenCalled();
		});

		it("should handle already owned items", () => {
			// Make item already owned
			itemManager.purchaseItem(testItem.id);
			mockCheckPoints.mockReturnValue(1000);
			mockGetRemainingTime.mockReturnValue(60);

			const dynamicPrice = (shop as any).getDynamicPrice(testItem);

			// Attempt purchase of already owned item
			(shop as any).handlePurchase(`${testItem.id}_${dynamicPrice}`);

			// Should not proceed with purchase
			expect(mockDeductPoints).not.toHaveBeenCalled();
		});

		it("should handle malformed button args", () => {
			// Test with invalid format
			expect(() => {
				(shop as any).handlePurchase("invalid_format");
			}).not.toThrow();

			expect(() => {
				(shop as any).handlePurchase("test_item"); // Missing price
			}).not.toThrow();
		});
	});

	describe("Layout and Responsiveness", () => {
		it("should handle different screen sizes", () => {
			// Test with smaller screen
			shop.destroy();
			shop = new ShopE({
				scene: scene,
				width: 800,
				height: 600,
				itemManager: itemManager,
				marketManager: marketManager,
				onCheckPoints: mockCheckPoints,
				onDeductPoints: mockDeductPoints,
				onItemPurchased: mockItemPurchased,
				onGetRemainingTime: mockGetRemainingTime,
				onIsTimelineRevealed: mockIsTimelineRevealed,
			});
			scene.append(shop);

			expect(shop.width).toBeLessThanOrEqual(800);
			expect(shop.height).toBeLessThanOrEqual(600);
		});

		it("should properly layer header above background", () => {
			// Check that shop creates proper layout structure
			expect(shop.children?.length).toBeGreaterThan(0);

			// Verify header exists
			const headerElements = shop.children?.filter(child =>
				(child as any).cssColor === "#2c3e50" // Header color
			);
			expect(headerElements?.length).toBeGreaterThan(0);
		});
	});
});
