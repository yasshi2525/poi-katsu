import { AFFILIATE_CONFIG } from "../config/affiliateConfig";
import { ItemData, getDefaultCatalogItems } from "../data/itemData";

/**
 * Interface for price update message broadcasting
 */
export interface PriceUpdateMessage {
	/** Item ID */
	itemId: string;
	/** New dynamic price */
	dynamicPrice: number;
	/** Timestamp when price was calculated */
	calculatedAt: number;
	/** Remaining time when price was calculated */
	remainingTime: number;
}

/**
 * Interface for market price data
 */
export interface MarketPriceData {
	/** Current dynamic price */
	dynamicPrice: number;
	/** Last calculation timestamp */
	lastCalculated: number;
	/** Last remaining time used for calculation */
	lastRemainingTime: number;
}

/**
 * Market Manager handles dynamic pricing system
 * In multi mode: Active instance calculates and broadcasts prices
 * In ranking mode: Each instance calculates prices directly
 */
export class MarketManager {
	private scene: g.Scene;
	private isActive: boolean;
	private marketPrices: Map<string, MarketPriceData> = new Map();
	private priceUpdateInterval?: g.TimerIdentifier;
	private mode: "multi" | "ranking";

	/**
	 * Creates a new MarketManager instance
	 */
	constructor(scene: g.Scene, mode: "multi" | "ranking") {
		this.scene = scene;
		this.mode = mode;
		this.isActive = mode === "ranking" || scene.game.isActiveInstance();
	}

	/**
	 * Initializes the market manager
	 */
	initialize(): void {
		if (this.mode === "multi" && this.isActive) {
			// Active instance in multi mode: setup listeners first, then start broadcasting
			this.setupPriceBroadcastListener(); // Setup our own listener for consistency

			// Delay initial price calculation to allow other instances to setup listeners
			this.scene.setTimeout(() => {
				this.updateAllPrices(); // Initial price calculation
				this.startPriceUpdates(); // Periodic updates
			}, 100); // 100ms delay to prevent race condition
		} else if (this.mode === "multi") {
			// Non-active instance in multi mode: listen for price broadcasts
			this.setupPriceBroadcastListener();
		}
		// In ranking mode, prices are calculated on-demand
	}

	/**
	 * Gets the current dynamic price for an item from cache
	 */
	getDynamicPrice(item: ItemData, remainingTime: number): number {
		const marketPrice = this.marketPrices.get(item.id);

		if (this.mode === "ranking") {
			// In ranking mode, calculate directly since no broadcasting
			return this.calculateDynamicPrice(item, remainingTime);
		}

		// In multi mode, always use cached price from broadcasts
		if (marketPrice) {
			return marketPrice.dynamicPrice;
		}

		// If no cached price yet, return 0 to indicate unavailable
		// This will trigger fallback to base price in UI
		return 0;
	}


	/**
	 * Gets whether this instance is the active price calculator
	 */
	isActiveInstance(): boolean {
		return this.isActive;
	}

	/**
	 * Gets the current mode
	 */
	getMode(): "multi" | "ranking" {
		return this.mode;
	}

	/**
	 * Cleans up the market manager
	 */
	destroy(): void {
		if (this.priceUpdateInterval) {
			this.scene.clearInterval(this.priceUpdateInterval);
			this.priceUpdateInterval = undefined;
		}
	}

	/**
	 * Calculates dynamic price based on remaining time
	 */
	private calculateDynamicPrice(item: ItemData, remainingTime: number): number {
		const basePrice = item.purchasePrice;

		// Input validation
		if (basePrice <= 0) {
			console.warn(`Invalid base price: ${basePrice}, using default value 100`);
			return 100;
		}

		// Validate remaining time
		if (remainingTime < 0) {
			remainingTime = 0;
		}

		// Calculate time factor (0 to 1, where 1 is start of game, 0 is end)
		const maxTime = AFFILIATE_CONFIG.PRICING.TOTAL_GAME_TIME;
		const timeFactor = Math.max(0, Math.min(1, remainingTime / maxTime));

		// Generate deterministic "random" value based on item and time
		const seed = this.generateSeed(item.id, Math.floor(remainingTime / 3)); // Update every 3 seconds for maximum dynamic changes
		const randomValue = this.seededRandom(seed);

		// Calculate price variation with DRAMATICALLY enhanced time factor effect
		const volatility = AFFILIATE_CONFIG.PRICING.VOLATILITY;
		const minRatio = AFFILIATE_CONFIG.PRICING.MIN_PRICE_RATIO;

		// EXTREME time factor effect: massive swings early, stability late
		const timeVolatilityBoost = Math.pow(timeFactor, 0.3); // Cube root for even more dramatic early effect
		const volatilityMultiplier = 1 + timeVolatilityBoost * 4; // Up to 5x volatility early game

		// Create massive price swings using sine wave pattern for more dramatic effect
		const waveEffect = Math.sin(randomValue * Math.PI * 2) * timeVolatilityBoost;
		const baseMultiplier = 0.5 + randomValue; // Base range 0.5 to 1.5
		const volatilityEffect = waveEffect * volatility * volatilityMultiplier;

		// Final price calculation with extended bounds
		const priceMultiplier = baseMultiplier + volatilityEffect;
		const dynamicPrice = Math.floor(basePrice * priceMultiplier);

		// Extended validation bounds for more dramatic price swings
		const minValidPrice = Math.floor(basePrice * minRatio); // Can go as low as 30% of base
		const maxValidPrice = Math.floor(basePrice * 3); // Can go as high as 3x base price
		if (dynamicPrice < minValidPrice || dynamicPrice > maxValidPrice) {
			const clampedPrice = Math.max(minValidPrice, Math.min(maxValidPrice, dynamicPrice));
			return clampedPrice;
		}

		// Cache the price in multi mode
		if (this.mode === "multi") {
			this.marketPrices.set(item.id, {
				dynamicPrice,
				lastCalculated: this.scene.game.age,
				lastRemainingTime: remainingTime
			});
		}

		return dynamicPrice;
	}

	/**
	 * Generates a seed for deterministic random values
	 */
	private generateSeed(itemId: string, timeSlot: number): number {
		let hash = 0;
		const str = `${itemId}_${timeSlot}`;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}

	/**
	 * Generates a seeded random value between 0 and 1
	 */
	private seededRandom(seed: number): number {
		const x = Math.sin(seed) * 10000;
		return x - Math.floor(x);
	}

	/**
	 * Starts periodic price updates for active instance
	 */
	private startPriceUpdates(): void {
		// Update prices every 3 seconds for maximum visible price changes
		this.priceUpdateInterval = this.scene.setInterval(() => {
			this.updateAllPrices();
		}, 3000);
	}

	/**
	 * Updates all item prices and broadcasts them
	 */
	private updateAllPrices(): void {
		const gameVars = this.scene.game.vars as GameVars;
		const totalTimeLimit = gameVars.totalTimeLimit || AFFILIATE_CONFIG.PRICING.TOTAL_GAME_TIME;
		const currentTime = this.scene.game.age / 1000; // Convert to seconds
		const remainingTime = Math.max(0, totalTimeLimit - currentTime);

		// Get all available items from catalog
		const allItems = getDefaultCatalogItems();

		// Calculate and broadcast prices for all items
		allItems.forEach((item: ItemData) => {
			const dynamicPrice = this.calculateDynamicPrice(item, remainingTime);

			// Always broadcast in multi mode, even for our own calculation
			if (this.mode === "multi") {
				this.broadcastPriceUpdate(item.id, dynamicPrice, remainingTime);
			}
		});

		// Broadcast UI update event for all listening components
		this.broadcastUIUpdateEvent();
	}

	/**
	 * Broadcasts UI update event to notify listening components
	 */
	private broadcastUIUpdateEvent(): void {
		const uiUpdateMessage = {
			type: "uiPriceUpdate",
			timestamp: this.scene.game.age
		};

		this.scene.game.raiseEvent(new g.MessageEvent(uiUpdateMessage));
	}

	/**
	 * Broadcasts a price update to all clients
	 */
	private broadcastPriceUpdate(itemId: string, dynamicPrice: number, remainingTime: number): void {
		const message: PriceUpdateMessage = {
			itemId,
			dynamicPrice,
			calculatedAt: this.scene.game.age,
			remainingTime
		};

		const broadcastMessage = {
			type: "priceUpdate",
			priceData: message
		};

		this.scene.game.raiseEvent(new g.MessageEvent(broadcastMessage));
	}

	/**
	 * Sets up listener for price broadcasts from active instance
	 */
	private setupPriceBroadcastListener(): void {
		this.scene.onMessage.add((ev: g.MessageEvent) => {
			if (ev.data?.type === "priceUpdate" && ev.data?.priceData) {
				const priceData = ev.data.priceData as PriceUpdateMessage;
				this.handlePriceUpdate(priceData);
			}
		});
	}

	/**
	 * Handles incoming price updates from active instance
	 */
	private handlePriceUpdate(priceData: PriceUpdateMessage): void {
		this.marketPrices.set(priceData.itemId, {
			dynamicPrice: priceData.dynamicPrice,
			lastCalculated: priceData.calculatedAt,
			lastRemainingTime: priceData.remainingTime
		});
	}

}
