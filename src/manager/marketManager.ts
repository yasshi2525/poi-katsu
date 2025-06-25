import { AFFILIATE_CONFIG } from "../config/affiliateConfig";
import { GameContext } from "../data/gameContext";
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
	private context: GameContext;
	private priceUpdateListeners: Array<() => void> = [];
	private timestampCounter: number = 0;

	/**
	 * Creates a new MarketManager instance
	 */
	constructor(scene: g.Scene, context: GameContext) {
		this.scene = scene;
		this.context = context;
		this.isActive = context.gameMode.mode === "ranking" || scene.game.isActiveInstance();
	}

	/**
	 * Initializes the market manager
	 */
	initialize(): void {
		if (this.getMode() === "multi" && this.isActive) {
			// Active instance in multi mode: setup listeners first, then start broadcasting
			this.setupPriceBroadcastListener(); // Setup our own listener for consistency

			// Delay initial price calculation to allow other instances to setup listeners
			this.scene.setTimeout(() => {
				this.updateAllPrices(); // Initial price calculation
				this.startPriceUpdates(); // Periodic updates
			}, 100); // 100ms delay to prevent race condition
		} else if (this.getMode() === "multi") {
			// Non-active instance in multi mode: listen for price broadcasts
			this.setupPriceBroadcastListener();
		} else {
			// In ranking mode: calculate and cache prices locally every 3 seconds
			this.scene.setTimeout(() => {
				this.updateAllPricesLocally(); // Initial price calculation
				this.startPriceUpdates(); // Periodic updates (same interval as multi mode)
			}, 100);
		}
	}

	/**
	 * Gets the current dynamic price for an item from cache
	 */
	getDynamicPrice(item: ItemData, _remainingTime: number): number {
		// Both ranking and multi modes use cached prices only - no dynamic calculation
		const marketPrice = this.marketPrices.get(item.id);
		if (marketPrice) {
			return marketPrice.dynamicPrice;
		}

		// If no cached price available (initial state), return base price
		// In multi mode: wait for active instance broadcast
		// In ranking mode: use static base price throughout

		// Validate base price and provide fallback for invalid values
		const basePrice = item.purchasePrice;
		if (basePrice <= 0) {
			console.warn(`Invalid base price: ${basePrice}, using default value 100`);
			return 100;
		}

		return basePrice;
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
		return this.context.gameMode.mode;
	}

	/**
	 * Registers a listener for price updates
	 * @param listener Function to call when prices are updated
	 */
	addPriceUpdateListener(listener: () => void): void {
		this.priceUpdateListeners.push(listener);
	}

	/**
	 * Removes a price update listener
	 * @param listener Function to remove from listeners
	 */
	removePriceUpdateListener(listener: () => void): void {
		const index = this.priceUpdateListeners.indexOf(listener);
		if (index >= 0) {
			this.priceUpdateListeners.splice(index, 1);
		}
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
		const maxTime = this.getTotalTimeLimit();
		const timeFactor = Math.max(0, Math.min(1, remainingTime / maxTime));

		// Generate random value
		const randomValue = this.random();

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
		if (this.getMode() === "multi") {
			this.marketPrices.set(item.id, {
				dynamicPrice,
				lastCalculated: this.getNextTimestamp(),
				lastRemainingTime: remainingTime
			});
		}

		return dynamicPrice;
	}

	private random(): number {
		return this.context.localRandom.generate();
	}

	/**
	 * Starts periodic price updates for active instance
	 */
	private startPriceUpdates(): void {
		// Update prices every 3 seconds for maximum visible price changes
		this.priceUpdateInterval = this.scene.setInterval(() => {
			if (this.getMode() === "multi" && this.isActive) {
				// Multi mode: calculate and broadcast prices
				this.updateAllPrices();
			} else if (this.getMode() === "ranking") {
				// Ranking mode: calculate and cache prices locally
				this.updateAllPricesLocally();
			}
			// Non-active multi instances don't calculate, they only listen
		}, 3000);
	}

	/**
	 * Updates all item prices and broadcasts them
	 */
	private updateAllPrices(): void {
		// Get all available items from catalog
		const allItems = getDefaultCatalogItems();

		// Calculate and broadcast prices for all items
		allItems.forEach((item: ItemData) => {
			const dynamicPrice = this.calculateDynamicPrice(item, this.getRemainingTime());

			// Always broadcast in multi mode, even for our own calculation
			if (this.getMode() === "multi") {
				this.broadcastPriceUpdate(item.id, dynamicPrice, this.getRemainingTime());
			}
		});

		// Notify local listeners that prices have been updated (no network traffic)
		this.notifyPriceUpdateListeners();
	}

	/**
	 * Updates all item prices locally for ranking mode (no broadcasting)
	 */
	private updateAllPricesLocally(): void {
		// Get all available items from catalog
		const allItems = getDefaultCatalogItems();

		// Calculate and cache prices for all items locally
		allItems.forEach((item: ItemData) => {
			const dynamicPrice = this.calculateDynamicPrice(item, this.getRemainingTime());
			// Cache the price locally for ranking mode
			this.marketPrices.set(item.id, {
				dynamicPrice,
				lastCalculated: this.getNextTimestamp(),
				lastRemainingTime: this.getRemainingTime()
			});
		});

		// Notify local listeners that prices have been updated
		this.notifyPriceUpdateListeners();
	}

	/**
	 * Broadcasts a price update to all clients
	 */
	private broadcastPriceUpdate(itemId: string, dynamicPrice: number, remainingTime: number): void {
		const message: PriceUpdateMessage = {
			itemId,
			dynamicPrice,
			calculatedAt: this.getNextTimestamp(),
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

		// Notify local listeners that prices have been updated
		this.notifyPriceUpdateListeners();
	}

	/**
	 * Notifies all registered listeners that prices have been updated
	 */
	private notifyPriceUpdateListeners(): void {
		this.priceUpdateListeners.forEach(listener => {
			try {
				listener();
			} catch (error) {
				console.error("Error in price update listener:", error);
			}
		});
	}

	private getRemainingTime(): number {
		return this.context.gameState.remainingTime;
	}

	private getTotalTimeLimit(): number {
		return this.context.gameState.totalTimeLimit;
	}

	/**
	 * Gets the next incremental timestamp for consistent ordering
	 */
	private getNextTimestamp(): number {
		return ++this.timestampCounter;
	}
}
