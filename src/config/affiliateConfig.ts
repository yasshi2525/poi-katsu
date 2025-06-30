/**
 * Affiliate system configuration constants
 * Centralizes all affiliate-related configuration values
 */
export const AFFILIATE_CONFIG = {
	/** Affiliate reward rate (100% commission) */
	REWARD_RATE: 1,

	/** Dynamic pricing configuration */
	PRICING: {
		/** Minimum price ratio relative to base price */
		MIN_PRICE_RATIO: 0.4,
		/** Maximum price ratio relative to base price */
		MAX_PRICE_RATIO: 1.5,
		/** Price volatility factor for time-based fluctuation (increased for more dramatic changes) */
		VOLATILITY: 0.2,
	},

	/** Timeline configuration */
	TIMELINE: {
		/** Default player name when actual name unavailable */
		DEFAULT_PLAYER_NAME: "プレイヤー",
	},

	/** Modal configuration */
	MODAL: {
		/** SNS requirement modal dimensions */
		SNS_REQUIREMENT: {
			WIDTH: 400,
			HEIGHT: 250,
		},
	},
} as const;
