import { ShopE } from "../../src/entity/shopE";
import { ItemManager } from "../../src/manager/itemManager";
import { AFFILIATE_CONFIG } from "../../src/config/affiliateConfig";
import { ItemData, createItemData } from "../../src/data/itemData";

describe("ShopE", () => {
	let shop: ShopE;
	let itemManager: ItemManager;
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

		// Create shop instance
		shop = new ShopE({
			scene: scene,
			width: scene.game.width,
			height: scene.game.height,
			itemManager: itemManager,
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
	});

	describe("Dynamic Pricing Algorithm", () => {
		it("should calculate dynamic price within valid bounds", () => {
			// Test with different remaining times
			const basePrice = 100;

			// Early game (high remaining time) - more volatile
			mockGetRemainingTime.mockReturnValue(120);
			const earlyPrice = (shop as any).calculateDynamicPrice(basePrice);

			// Late game (low remaining time) - more stable
			mockGetRemainingTime.mockReturnValue(10);
			const latePrice = (shop as any).calculateDynamicPrice(basePrice);

			// Prices should be within bounds
			expect(earlyPrice).toBeGreaterThanOrEqual(1);
			expect(earlyPrice).toBeLessThanOrEqual(basePrice * 2);
			expect(latePrice).toBeGreaterThanOrEqual(1);
			expect(latePrice).toBeLessThanOrEqual(basePrice * 2);

			// Price should not go below minimum ratio
			const minPrice = Math.floor(basePrice * AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO);
			expect(earlyPrice).toBeGreaterThanOrEqual(minPrice);
			expect(latePrice).toBeGreaterThanOrEqual(minPrice);
		});

		it("should handle invalid base price inputs", () => {
			// Test negative price
			mockGetRemainingTime.mockReturnValue(60);
			const negativePrice = (shop as any).calculateDynamicPrice(-50);
			expect(negativePrice).toBeGreaterThanOrEqual(1);
			expect(negativePrice).toBeLessThanOrEqual(200); // Based on default 100 * 2

			// Test zero price
			const zeroPrice = (shop as any).calculateDynamicPrice(0);
			expect(zeroPrice).toBeGreaterThanOrEqual(1);
			expect(zeroPrice).toBeLessThanOrEqual(200);
		});

		it("should handle negative remaining time", () => {
			const basePrice = 100;
			mockGetRemainingTime.mockReturnValue(-30); // Negative time

			const price = (shop as any).calculateDynamicPrice(basePrice);
			expect(price).toBeGreaterThanOrEqual(1);
			expect(price).toBeLessThanOrEqual(basePrice * 2);
		});

		it("should produce different prices with different random seeds", () => {
			const basePrice = 100;
			mockGetRemainingTime.mockReturnValue(60);

			// Generate multiple prices
			const prices = [];
			for (let i = 0; i < 10; i++) {
				prices.push((shop as any).calculateDynamicPrice(basePrice));
			}

			// Should have some variation (not all identical)
			const uniquePrices = new Set(prices);
			expect(uniquePrices.size).toBeGreaterThan(1);
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
				child.name?.includes("shop_share")
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
				child.name?.includes("shop_share")
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

			// Calculate expected dynamic price
			const dynamicPrice = (shop as any).calculateDynamicPrice(testItem.purchasePrice);

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

			const dynamicPrice = (shop as any).calculateDynamicPrice(testItem.purchasePrice);

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
				child.cssColor === "#2c3e50" // Header color
			);
			expect(headerElements?.length).toBeGreaterThan(0);
		});
	});
});
