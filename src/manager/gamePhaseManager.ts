/* eslint-disable @typescript-eslint/member-ordering */
import { GameContext, GamePhase } from "../data/gameContext";
import { NotificationData, createNotification } from "../data/notificationData";

/**
 * Phase transition conditions interface
 */
interface PhaseTransitionCondition {
	/** Required completed tasks for this phase */
	requiredTasks: string[];
	/** Minimum points required for this phase */
	minimumPoints?: number;
	/** Custom condition function */
	customCondition?: (gameContext: GameContext) => boolean;
}

/**
 * Phase configuration interface
 */
interface PhaseConfig {
	/** Phase identifier */
	phase: GamePhase;
	/** Phase display name */
	name: string;
	/** Phase description */
	description: string;
	/** Conditions to transition to this phase */
	transitionConditions: PhaseTransitionCondition;
	/** Features unlocked in this phase */
	unlockedFeatures: string[];
	/** Notification to show when entering this phase */
	unlockNotification?: NotificationData;
}

/**
 * GamePhaseManager - Manages game progression phases
 * Implements 1.2 ゲーム進行管理システム according to plan.md
 */
export class GamePhaseManager {
	private gameContext: GameContext;
	private phaseConfigs: Map<GamePhase, PhaseConfig>;
	private unlockedFeatures: Set<string>;

	constructor(gameContext: GameContext) {
		this.gameContext = gameContext;
		this.unlockedFeatures = new Set();
		this.phaseConfigs = this.initializePhaseConfigs();

		// Listen for player updates to check phase transitions
		this.gameContext.on("playerUpdated", () => this.checkPhaseTransitions());
		this.gameContext.on("timeUpdated", (remainingTime: number) => this.handleTimeUpdate(remainingTime));
	}

	/**
	 * Initializes phase configuration data
	 */
	private initializePhaseConfigs(): Map<GamePhase, PhaseConfig> {
		const configs = new Map<GamePhase, PhaseConfig>();

		configs.set(GamePhase.INITIAL, {
			phase: GamePhase.INITIAL,
			name: "チュートリアル",
			description: "ゲームを開始しました。最初のタスクを完了してください。",
			transitionConditions: {
				requiredTasks: []
			},
			unlockedFeatures: ["tasks", "profile"]
		});

		configs.set(GamePhase.BASIC, {
			phase: GamePhase.BASIC,
			name: "基本機能",
			description: "基本的な機能が解禁されました。",
			transitionConditions: {
				requiredTasks: ["profile"]
			},
			unlockedFeatures: ["sns", "timeline", "ads"],
			unlockNotification: createNotification({
				type: "phase_unlock",
				message: "新機能解禁！",
				description: "SNS機能とタイムライン機能が使用可能になりました！",
				priority: "high",
				timing: "immediate",
				icon: "🎉",
				autoDismissMs: 4000
			})
		});

		configs.set(GamePhase.SHOPPING, {
			phase: GamePhase.SHOPPING,
			name: "ショッピング",
			description: "ショッピング機能が解禁されました。",
			transitionConditions: {
				requiredTasks: ["shopping"]
			},
			unlockedFeatures: ["shop", "items"],
			unlockNotification: createNotification({
				type: "phase_unlock",
				message: "ショッピング解禁！",
				description: "通販機能でアイテムを購入できるようになりました！",
				priority: "high",
				timing: "immediate",
				icon: "🛍️",
				autoDismissMs: 4000
			})
		});

		configs.set(GamePhase.ADVANCED, {
			phase: GamePhase.ADVANCED,
			name: "発展機能",
			description: "発展機能が解禁されました。",
			transitionConditions: {
				requiredTasks: ["sns", "shopping"],
				minimumPoints: 1000
			},
			unlockedFeatures: ["affiliate", "flea_market", "social_game"],
			unlockNotification: createNotification({
				type: "phase_unlock",
				message: "発展機能解禁！",
				description: "アフィリエイトとフリマ機能が使用可能になりました！",
				priority: "high",
				timing: "immediate",
				icon: "💰",
				autoDismissMs: 4000
			})
		});

		configs.set(GamePhase.SETTLEMENT, {
			phase: GamePhase.SETTLEMENT,
			name: "精算フェーズ",
			description: "ゲーム終了時刻です。アイテムを精算してポイントに変換します。",
			transitionConditions: {
				requiredTasks: [],
				customCondition: (context) => context.gameState.remainingTime <= 0
			},
			unlockedFeatures: ["settlement"],
			unlockNotification: createNotification({
				type: "phase_unlock",
				message: "精算フェーズ開始！",
				description: "所持アイテムをポイントに変換します。",
				priority: "urgent",
				timing: "immediate",
				icon: "⏰",
				autoDismissMs: 5000
			})
		});

		configs.set(GamePhase.ENDED, {
			phase: GamePhase.ENDED,
			name: "ゲーム終了",
			description: "ゲームが終了しました。",
			transitionConditions: {
				requiredTasks: [],
				customCondition: (context) => context.gameState.phase === GamePhase.SETTLEMENT
			},
			unlockedFeatures: ["ranking"],
			unlockNotification: createNotification({
				type: "phase_unlock",
				message: "ゲーム終了！",
				description: "結果を確認してランキングを見てみましょう！",
				priority: "urgent",
				timing: "immediate",
				icon: "🏆",
				autoDismissMs: 0 // Manual dismiss for final result
			})
		});

		return configs;
	}

	/**
	 * Gets the current phase configuration
	 */
	getCurrentPhaseConfig(): PhaseConfig | undefined {
		return this.phaseConfigs.get(this.gameContext.gameState.phase);
	}

	/**
	 * Gets all unlocked features
	 */
	getUnlockedFeatures(): string[] {
		return Array.from(this.unlockedFeatures);
	}

	/**
	 * Checks if a specific feature is unlocked
	 * @param feature Feature name to check
	 */
	isFeatureUnlocked(feature: string): boolean {
		return this.unlockedFeatures.has(feature);
	}

	/**
	 * Manually triggers a phase transition
	 * @param targetPhase Target phase to transition to
	 * @returns True if transition was successful
	 */
	transitionToPhase(targetPhase: GamePhase): boolean {
		const currentPhase = this.gameContext.gameState.phase;

		// Prevent going backwards (except for testing)
		if (this.getPhaseOrder(targetPhase) < this.getPhaseOrder(currentPhase)) {
			return false;
		}

		// Check if conditions are met
		if (!this.checkPhaseConditions(targetPhase)) {
			return false;
		}

		this.executePhaseTransition(targetPhase);
		return true;
	}

	/**
	 * Forces transition to settlement phase (for testing or manual trigger)
	 */
	forceSettlementPhase(): void {
		this.transitionToPhase(GamePhase.SETTLEMENT);
	}

	/**
	 * Forces game end (for testing or manual trigger)
	 */
	forceGameEnd(): void {
		this.transitionToPhase(GamePhase.ENDED);
	}

	/**
	 * Checks all phase transitions and advances if conditions are met
	 */
	private checkPhaseTransitions(): void {
		const currentPhase = this.gameContext.gameState.phase;
		const nextPhase = this.getNextPhase(currentPhase);

		if (nextPhase && this.checkPhaseConditions(nextPhase)) {
			this.executePhaseTransition(nextPhase);
		}
	}

	/**
	 * Checks if conditions are met for a specific phase
	 * @param phase Phase to check conditions for
	 */
	private checkPhaseConditions(phase: GamePhase): boolean {
		const config = this.phaseConfigs.get(phase);
		if (!config) return false;

		const conditions = config.transitionConditions;
		const player = this.gameContext.currentPlayer;

		// Check required tasks
		for (const taskId of conditions.requiredTasks) {
			const taskProgress = player.taskProgress.get(taskId);
			if (!taskProgress || !taskProgress.completed) {
				return false;
			}
		}

		// Check minimum points
		if (conditions.minimumPoints && player.points < conditions.minimumPoints) {
			return false;
		}

		// Check custom condition
		if (conditions.customCondition && !conditions.customCondition(this.gameContext)) {
			return false;
		}

		return true;
	}

	/**
	 * Executes a phase transition
	 * @param targetPhase Target phase to transition to
	 */
	private executePhaseTransition(targetPhase: GamePhase): void {
		const config = this.phaseConfigs.get(targetPhase);
		if (!config) return;

		// Update game context phase
		this.gameContext.updateGamePhase(targetPhase);

		// Unlock new features
		for (const feature of config.unlockedFeatures) {
			this.unlockedFeatures.add(feature);
		}

		// Show unlock notification
		if (config.unlockNotification) {
			this.gameContext.addNotification(config.unlockNotification);
		}
	}

	/**
	 * Gets the next phase in sequence
	 * @param currentPhase Current phase
	 */
	private getNextPhase(currentPhase: GamePhase): GamePhase | null {
		const phases = [
			GamePhase.INITIAL,
			GamePhase.BASIC,
			GamePhase.SHOPPING,
			GamePhase.ADVANCED,
			GamePhase.SETTLEMENT,
			GamePhase.ENDED
		];

		const currentIndex = phases.indexOf(currentPhase);
		if (currentIndex >= 0 && currentIndex < phases.length - 1) {
			return phases[currentIndex + 1];
		}

		return null;
	}

	/**
	 * Gets the order index of a phase
	 * @param phase Phase to get order for
	 */
	private getPhaseOrder(phase: GamePhase): number {
		const phases = [
			GamePhase.INITIAL,
			GamePhase.BASIC,
			GamePhase.SHOPPING,
			GamePhase.ADVANCED,
			GamePhase.SETTLEMENT,
			GamePhase.ENDED
		];

		return phases.indexOf(phase);
	}

	/**
	 * Handles time updates to trigger settlement phase
	 * @param remainingTime Remaining time in seconds
	 */
	private handleTimeUpdate(remainingTime: number): void {
		// Trigger settlement phase when time runs out
		if (remainingTime <= 0 && this.gameContext.gameState.phase !== GamePhase.SETTLEMENT &&
			this.gameContext.gameState.phase !== GamePhase.ENDED) {
			this.transitionToPhase(GamePhase.SETTLEMENT);
		}
	}
}
