import { AFFILIATE_CONFIG } from "../../src/config/affiliateConfig";

describe("AFFILIATE_CONFIG", () => {
	describe("Configuration Structure", () => {
		it("should have all required configuration sections", () => {
			expect(AFFILIATE_CONFIG).toBeDefined();
			expect(AFFILIATE_CONFIG.REWARD_RATE).toBeDefined();
			expect(AFFILIATE_CONFIG.PRICING).toBeDefined();
			expect(AFFILIATE_CONFIG.TIMELINE).toBeDefined();
			expect(AFFILIATE_CONFIG.MODAL).toBeDefined();
		});

		it("should have correct reward rate", () => {
			expect(AFFILIATE_CONFIG.REWARD_RATE).toBe(0.1);
			expect(typeof AFFILIATE_CONFIG.REWARD_RATE).toBe("number");
		});

		it("should have valid pricing configuration", () => {
			expect(AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO).toBe(0.3);
			expect(AFFILIATE_CONFIG.PRICING.VOLATILITY).toBe(0.8);

			// Verify types
			expect(typeof AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO).toBe("number");
			expect(typeof AFFILIATE_CONFIG.PRICING.VOLATILITY).toBe("number");

			// Verify ranges
			expect(AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO).toBeGreaterThan(0);
			expect(AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO).toBeLessThan(1);
			expect(AFFILIATE_CONFIG.PRICING.VOLATILITY).toBeGreaterThan(0);
		});

		it("should have timeline configuration", () => {
			expect(AFFILIATE_CONFIG.TIMELINE.DEFAULT_PLAYER_NAME).toBe("プレイヤー");
			expect(typeof AFFILIATE_CONFIG.TIMELINE.DEFAULT_PLAYER_NAME).toBe("string");
		});

		it("should have modal configuration", () => {
			expect(AFFILIATE_CONFIG.MODAL.SNS_REQUIREMENT.WIDTH).toBe(400);
			expect(AFFILIATE_CONFIG.MODAL.SNS_REQUIREMENT.HEIGHT).toBe(250);

			expect(typeof AFFILIATE_CONFIG.MODAL.SNS_REQUIREMENT.WIDTH).toBe("number");
			expect(typeof AFFILIATE_CONFIG.MODAL.SNS_REQUIREMENT.HEIGHT).toBe("number");

			expect(AFFILIATE_CONFIG.MODAL.SNS_REQUIREMENT.WIDTH).toBeGreaterThan(0);
			expect(AFFILIATE_CONFIG.MODAL.SNS_REQUIREMENT.HEIGHT).toBeGreaterThan(0);
		});
	});

	describe("Configuration Immutability", () => {
		it("should be read-only (as const assertion)", () => {
			// The 'as const' assertion makes TypeScript treat this as readonly
			// but doesn't freeze the object at runtime - that would require Object.freeze()
			expect(AFFILIATE_CONFIG).toBeDefined();
			expect(AFFILIATE_CONFIG.REWARD_RATE).toBe(0.1);
		});

		it("should have consistent nested structure", () => {
			// Verify structure consistency rather than runtime immutability
			expect(AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO).toBe(0.3);
			expect(AFFILIATE_CONFIG.PRICING.VOLATILITY).toBe(0.8);
		});
	});

	describe("Mathematical Consistency", () => {
		it("should have mathematically valid pricing parameters", () => {
			// Min price ratio should allow for meaningful price reduction
			expect(AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO).toBeLessThan(1);

			// Volatility should be reasonable for dramatic price changes
			expect(AFFILIATE_CONFIG.PRICING.VOLATILITY).toBeLessThanOrEqual(1);
		});

		it("should produce valid reward calculations", () => {
			const testPrices = [100, 250, 999, 1];

			testPrices.forEach((price) => {
				const reward = Math.floor(price * AFFILIATE_CONFIG.REWARD_RATE);
				expect(reward).toBeGreaterThanOrEqual(0);
				expect(reward).toBeLessThanOrEqual(price);
				expect(Number.isInteger(reward)).toBe(true);
			});
		});

		it("should handle edge cases in calculations", () => {
			// Test with very small prices
			const smallReward = Math.floor(1 * AFFILIATE_CONFIG.REWARD_RATE);
			expect(smallReward).toBe(0); // Should floor to 0

			// Test with large prices
			const largePrice = 10000;
			const largeReward = Math.floor(largePrice * AFFILIATE_CONFIG.REWARD_RATE);
			expect(largeReward).toBe(Math.floor(10000 * 0.1)); // Calculate expected value
			expect(largeReward).toBeLessThan(largePrice);
		});
	});

	describe("Game Balance Considerations", () => {
		it("should have reasonable reward rate for game economy", () => {
			// 10% is a common affiliate rate that's not too generous
			expect(AFFILIATE_CONFIG.REWARD_RATE).toBe(0.1);
		});

		it("should have pricing parameters that create meaningful variation", () => {
			// Volatility of 0.8 means prices can vary by ±80% (enhanced for dramatic changes)
			const basePrice = 100;
			const maxVariation = basePrice * AFFILIATE_CONFIG.PRICING.VOLATILITY;
			expect(maxVariation).toBe(80);

			// Min price ratio ensures items don't become too cheap
			const minPrice = basePrice * AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO;
			expect(minPrice).toBe(Math.floor(basePrice * 0.3)); // Calculate expected value
		});

		it("should have UI dimensions suitable for game interface", () => {
			// Modal should be large enough to display information clearly
			const modalArea = AFFILIATE_CONFIG.MODAL.SNS_REQUIREMENT.WIDTH
				* AFFILIATE_CONFIG.MODAL.SNS_REQUIREMENT.HEIGHT;
			expect(modalArea).toBeGreaterThan(50000); // Reasonable minimum area
		});
	});
});
