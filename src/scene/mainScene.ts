import { Timeline } from "@akashic-extension/akashic-timeline";
import { AffiliateBroadcastMessage, AffiliatePurchaseMessage } from "../data/affiliateMessages";
import { GameContext } from "../data/gameContext";
import { createInitialPlayerProfile, createPlayerData, PlayerData } from "../data/playerData";
import { SharedPostData } from "../data/sharedPostData";
import { AgreementE } from "../entity/agreementE";
import { HeaderE } from "../entity/headerE";
import { HomeE } from "../entity/homeE";
import { InteractionBlockerManager } from "../manager/interactionBlockerManager";
import { MarketManager } from "../manager/marketManager";
import { PointManager } from "../manager/pointManager";
import { BaseScene } from "./baseScene";
import { RankingScene} from "./rankingScene";

const config = {
	fadeIn: { duration: 500 },
};

/**
 * Settlement timing configuration
 */
const SETTLEMENT_CONFIG = {
	FIXED_SETTLEMENT_DURATION: 12000, // Fixed 12 seconds for settlement before ranking (doubled from 6 seconds)
} as const;

export class MainScene extends BaseScene {
	private header?: HeaderE;
	private home?: HomeE;
	private marketManager?: MarketManager;
	private pointManager?: PointManager;
	private interactionBlockerManager?: InteractionBlockerManager;
	private gameContext: GameContext;
	private interactionBlocker?: g.E;
	private pendingSharedPosts: SharedPostData[] = []; // Store posts received before HomeE is created
	private settlementTimer?: g.TimerIdentifier; // Timer ID for fixed settlement duration

	constructor(param: g.SceneParameterObject & { mode: "multi" | "ranking"; totalTimeLimit: number; gameContext?: GameContext }) {
		super({
			...param,
			assetIds: [
				...param.assetIds ?? [],
				...AgreementE.assetIds,
				...HeaderE.assetIds,
				...HomeE.assetIds
			]
		});

		// Initialize GameContext (use provided context or create new one)
		if (param.gameContext) {
			// Use inherited GameContext from TitleScene
			this.gameContext = param.gameContext;
		} else {
			// Create new GameContext (fallback for direct MainScene initialization)
			const initialPlayerData = createPlayerData(this.game.selfId, createInitialPlayerProfile(), 0);

			const gameMode = {
				mode: param.mode,
				maxPlayers: 4,
				currentPlayers: 1
			};

			this.gameContext = new GameContext(
				initialPlayerData,
				gameMode,
				this.game.vars.gameState,
				this.game.localRandom,
				param.totalTimeLimit,
				this.game.fps
			);
		}

		this.onLoad.add(() => {
			// Initialize InteractionBlockerManager for centralized user interaction control
			this.interactionBlockerManager = new InteractionBlockerManager(this, this.game.width, this.game.height);

			// Initialize MarketManager for price management
			this.marketManager = new MarketManager(this, this.gameContext);
			this.marketManager.initialize();

			// Initialize PointManager for centralized point management
			this.pointManager = new PointManager(this.gameContext, this.game);

			// Initialize multi-player broadcast handlers immediately to prevent race conditions
			this.initializeMessageHandlers();
			this.gameContext.on("timeUpdated", (remainingTime: number) => {
				if (this.header) {
					this.header.setTime(remainingTime);
				}
			});
			this.gameContext.on("timeEnded", () => {
				// Time reached zero - start automatic settlement process with user interaction control
				this.handleTimeEnded();
			});

			this.onUpdate.add(() =>
				// Decrement remaining frames and if it reaches zero, remove this handler
				!this.gameContext.decrementRemainingFrame()
			);
		});
	}

	/**
	 * Initializes multi-player message handlers immediately on scene load
	 * This prevents race conditions where fast players broadcast before slow players are ready
	 */
	public initializeMessageHandlers(): void {
		if (this.gameContext.gameMode.mode === "multi") {
			this.onMessage.add((ev: g.MessageEvent) => {
				// Handle profile broadcasts
				if (ev.data?.type === "profileUpdate" && ev.data?.profileData) {
					const profileData = ev.data.profileData;
					if (profileData.playerId && profileData.playerId !== this.gameContext.currentPlayer.id) {
						this.updatePlayerProfileInGameContext(profileData.playerId, profileData.name, profileData.avatar);
					}
				}

				// Handle score broadcasts
				if (ev.data?.type === "scoreUpdate" && ev.data?.scoreData) {
					const scoreData = ev.data.scoreData;
					if (scoreData.playerId && scoreData.playerId !== this.gameContext.currentPlayer.id) {
						this.updatePlayerScoreInGameContext(scoreData.playerId, scoreData.score);
					}
				}

				// Handle affiliate post sharing broadcasts
				if (ev.data?.type === "affiliatePostShared" && ev.data?.affiliateData) {
					const affiliateData = ev.data.affiliateData as AffiliateBroadcastMessage;
					if (affiliateData.playerId && affiliateData.playerId !== this.gameContext.currentPlayer.id) {
						// Add shared post to other players' timelines
						this.addSharedPostToTimeline(affiliateData.sharedPost);
					}
				}

				// Handle affiliate purchase notifications
				if (ev.data?.type === "affiliatePurchase" && ev.data?.purchaseData) {
					const purchaseData = ev.data.purchaseData as AffiliatePurchaseMessage;
					if (purchaseData.sharerId === this.gameContext.currentPlayer.id) {
						// Reward the sharer with affiliate points
						this.awardAffiliateReward(purchaseData.rewardPoints, purchaseData.buyerName);
					}
					// Update purchase count for all players
					this.updateAffiliatePurchaseCount(purchaseData.postId);
				}

				// Handle player joining broadcasts
				if (ev.data?.type === "playerJoined" && ev.data?.playerData) {
					const joinData = ev.data.playerData;
					if (joinData.playerId && joinData.playerId !== this.gameContext.currentPlayer.id) {
						// Create PlayerData from broadcast and add to GameContext
						this.addPlayerFromBroadcast(joinData);
					}
				}

				// Handle task completion broadcasts
				if (ev.data?.type === "taskCompletion" && ev.data?.taskData) {
					const taskData = ev.data.taskData;
					if (taskData.playerId && taskData.playerId !== this.gameContext.currentPlayer.id) {
						// Update task progress for other players in GameContext
						this.updatePlayerTaskProgressInGameContext(taskData.playerId, taskData.taskId);
					}
				}

				// Price updates are handled automatically by MarketManager instances
			});
		}
	}

	/**
	 * Gets the MarketManager instance
	 */
	getMarketManager(): MarketManager | undefined {
		return this.marketManager;
	}

	/**
	 * Gets the PointManager instance
	 */
	getPointManager(): PointManager | undefined {
		return this.pointManager;
	}

	/**
	 * Gets the GameContext instance
	 */
	getGameContext(): GameContext | undefined {
		return this.gameContext;
	}

	/**
	 * Gets the InteractionBlockerManager instance
	 */
	getInteractionBlockerManager(): InteractionBlockerManager | undefined {
		return this.interactionBlockerManager;
	}

	/**
	 * Blocks user interaction with specified blocker ID
	 * @param blockerId Unique identifier for this blocking request
	 * @param reason Optional reason for blocking (for debugging)
	 */
	blockUserInteraction(blockerId: string, reason?: string): void {
		if (this.interactionBlockerManager) {
			this.interactionBlockerManager.blockInteraction(blockerId, reason);
		}
	}

	/**
	 * Unblocks user interaction for specified blocker ID
	 * @param blockerId Unique identifier for this blocking request
	 */
	unblockUserInteraction(blockerId: string): void {
		if (this.interactionBlockerManager) {
			this.interactionBlockerManager.unblockInteraction(blockerId);
		}
	}

	/**
	 * Checks if any user interactions are currently blocked
	 * @returns True if any blocking requests are active
	 */
	isUserInteractionBlocked(): boolean {
		return this.interactionBlockerManager?.isAnyBlocked() ?? false;
	}


	/**
	 * Transitions to ranking scene when settlement is completed
	 */
	transitionToRanking(): void {
		// Clear settlement timer if it exists (in case of manual transition)
		if (this.settlementTimer) {
			this.clearTimeout(this.settlementTimer);
			this.settlementTimer = undefined;
		}

		const rankingScene = new RankingScene({
			game: this.game,
			gameContext: this.gameContext!,
			pointManager: this.pointManager!
		});
		this.swipeOut(rankingScene);
	}

	/**
	 * Updates current player score in GameContext (called when local score changes)
	 */
	updateCurrentPlayerScore(score: number): void {
		const currentPlayer = this.gameContext.currentPlayer;
		const updatedPlayer = {
			...currentPlayer,
			points: score,
			lastActiveAt: this.gameContext.getCurrentTimestamp()
		};
		this.gameContext.updateCurrentPlayer(updatedPlayer);
	}

	/**
	 * Blocks all player interactions by adding a full-screen overlay
	 */
	private blockAllInteractions(): void {
		if (this.interactionBlocker) {
			return; // Already blocked
		}

		// Create full-screen interaction blocker
		this.interactionBlocker = new g.E({
			scene: this,
			width: this.game.width,
			height: this.game.height,
			x: 0,
			y: 0,
			touchable: true,
			local: true
		});

		// Add transparent background to catch all touches
		const overlay = new g.FilledRect({
			scene: this,
			width: this.game.width,
			height: this.game.height,
			x: 0,
			y: 0,
			cssColor: "rgba(0, 0, 0, 0.01)", // Nearly transparent but still catchable
			touchable: true
		});

		// Block all touch events
		overlay.onPointDown.add(() => {
			// Do nothing - absorb all touch events
		});

		this.interactionBlocker.append(overlay);
		this.append(this.interactionBlocker);
	}

	/**
	 * Handles time ended event with proper user interaction control
	 */
	private handleTimeEnded(): void {
		// 1. Block all user interactions immediately
		this.blockUserInteraction("timeEnded", "Game time ended - preparing for settlement");

		// 2. Wait for other locks to be cleared, then proceed
		this.waitForOtherLocksAndProceed();
	}

	/**
	 * Waits for other interaction locks to be cleared, then proceeds with settlement
	 */
	private waitForOtherLocksAndProceed(): void {
		if (!this.interactionBlockerManager) return;

		// Check if only timeEnded lock is active
		const activeBlockers = this.interactionBlockerManager.getActiveBlockers();
		const hasOtherLocks = activeBlockers.some(blockerId => blockerId !== "timeEnded");

		if (hasOtherLocks) {
			// Other locks exist - wait 100ms and check again
			this.setTimeout(() => {
				this.waitForOtherLocksAndProceed();
			}, 100);
		} else {
			// Only timeEnded lock remains - proceed with settlement
			this.proceedWithAutomaticSettlement();
		}
	}

	/**
	 * Proceeds with automatic settlement after all other locks are cleared
	 */
	private proceedWithAutomaticSettlement(): void {
		// 3. Force close all modals
		this.forceCloseAllModals();

		if (!this.home) {
			// If HomeE isn't created yet (player still in agreement), wait for settlement duration before transitioning
			this.settlementTimer = this.setTimeout(() => {
				this.transitionToRanking();
			}, SETTLEMENT_CONFIG.FIXED_SETTLEMENT_DURATION);
			return;
		}

		// 4. Return to home screen if viewing other screens
		this.home.returnToHomeIfNeeded();

		// 5. Trigger automatic settlement app reveal and opening
		this.home.triggerAutomaticSettlement();

		// Start fixed timer for ranking transition (independent of settlement animation completion)
		this.settlementTimer = this.setTimeout(() => {
			this.transitionToRanking();
		}, SETTLEMENT_CONFIG.FIXED_SETTLEMENT_DURATION);
	}

	/**
	 * Force closes all modals across the scene when time reaches zero
	 */
	private forceCloseAllModals(): void {
		if (this.home) {
			this.home.forceCloseAllModals();
		}
	}


	/**
	 * Adds a shared post to the timeline for all players
	 */
	private addSharedPostToTimeline(sharedPost: SharedPostData): void {
		if (this.home) {
			this.home.addSharedPostToTimeline(sharedPost);
		} else {
			// Store posts received before HomeE is created (e.g., during agreement screen)
			this.pendingSharedPosts.push(sharedPost);
		}
	}

	/**
	 * Adds all pending shared posts to HomeE when it's created
	 */
	private addPendingSharedPosts(): void {
		if (this.home && this.pendingSharedPosts.length > 0) {
			// Add all pending posts to the timeline
			this.pendingSharedPosts.forEach(post => {
				this.home!.addSharedPostToTimeline(post);
			});
			// Clear the pending posts array
			this.pendingSharedPosts = [];
		}
	}

	/**
	 * Awards affiliate reward points to the current player
	 */
	private awardAffiliateReward(rewardPoints: number, buyerName?: string): void {
		if (this.home) {
			this.home.awardAffiliateReward(rewardPoints, buyerName);
		}
	}

	/**
	 * Updates the purchase count for an affiliate post
	 */
	private updateAffiliatePurchaseCount(postId: string): void {
		if (this.home) {
			this.home.updateAffiliatePurchaseCount(postId);
		}
	}

	/**
	 * Adds a player to GameContext from broadcast data
	 */
	private addPlayerFromBroadcast(joinData: PlayerData): void {
		// Create PlayerData from broadcast data
		const playerData = createPlayerData(joinData.id, joinData.profile, joinData.joinedAt);
		playerData.points = joinData.points;
		playerData.ownedItems = joinData.ownedItems || [];
		playerData.lastActiveAt = joinData.lastActiveAt;
		this.gameContext.addPlayer(joinData.id, playerData);
	}

	/**
	 * Updates player score in GameContext
	 */
	private updatePlayerScoreInGameContext(playerId: string, score: number): void {
		const player = this.gameContext.allPlayers.get(playerId);
		if (player) {
			const updatedPlayer = {
				...player,
				points: score,
				lastActiveAt: this.gameContext.getCurrentTimestamp()
			};
			// For other players, we need to remove and re-add since there's no updatePlayer method
			this.gameContext.removePlayer(playerId);
			this.gameContext.addPlayer(playerId, updatedPlayer);
		}
	}

	/**
	 * Updates player profile in GameContext
	 */
	private updatePlayerProfileInGameContext(playerId: string, name: string, avatar: string): void {
		const player = this.gameContext.allPlayers.get(playerId);
		if (player) {
			const updatedPlayer = {
				...player,
				profile: { name, avatar },
				lastActiveAt: this.gameContext.getCurrentTimestamp()
			};
			// For other players, we need to remove and re-add since there's no updatePlayer method
			this.gameContext.removePlayer(playerId);
			this.gameContext.addPlayer(playerId, updatedPlayer);
		}
	}

	/**
	 * Updates player task progress in GameContext
	 */
	private updatePlayerTaskProgressInGameContext(playerId: string, taskId: string): void {
		const player = this.gameContext.allPlayers.get(playerId);
		if (player) {
			const updatedTaskProgress = new Map(player.taskProgress);
			updatedTaskProgress.set(taskId, {
				taskId: taskId,
				completed: true,
				completedAt: this.gameContext.getCurrentTimestamp()
			});

			const updatedPlayer = {
				...player,
				taskProgress: updatedTaskProgress,
				lastActiveAt: this.gameContext.getCurrentTimestamp()
			};
			// For other players, we need to remove and re-add since there's no updatePlayer method
			this.gameContext.removePlayer(playerId);
			this.gameContext.addPlayer(playerId, updatedPlayer);
		}
	}

	/**
	 * Broadcasts current player joining to all other players
	 */
	private broadcastPlayerJoining(): void {
		if (this.gameContext.gameMode.mode === "multi") {
			const message = {
				type: "playerJoined",
				playerData: {
					playerId: this.gameContext.currentPlayer.id,
					...this.gameContext.currentPlayer
				}
			};

			this.game.raiseEvent(new g.MessageEvent(message));
		}
	}

	protected override onSwipeOut(): void {
		// nothing to do here
	}

	protected override onSwipeIn(): void {
		const agreement = new AgreementE({
			scene: this,
			multi: this.gameContext.gameMode.mode === "multi",
			onPointsAwarded: (points: number) => {
				// Award agreement points using PointManager
				if (this.pointManager) {
					this.pointManager.awardPoints(points, "join", "Agreement completion reward");
				}
			},
			onComplete: () => {
				// Create header at scene level (always visible)
				this.header = new HeaderE({
					scene: this,
					width: this.game.width,
					height: 69,
					score: this.gameContext.currentPlayer.points,
					remainingSec: this.gameContext.gameState.remainingTime
				});
				this.append(this.header);

				// Create home with reference to scene-level header
				this.home = new HomeE({
					scene: this,
					parent: this,
					width: this.game.width,
					height: this.game.height,
					x: this.game.width / 2,
					y: this.game.height / 2,
					anchorX: 0.5,
					anchorY: 0.5,
					opacity: 0,
					header: this.header,
					gameContext: this.gameContext!,
					marketManager: this.marketManager!,
					pointManager: this.pointManager!,
					updateCurrentPlayerScore: (score: number) => this.updateCurrentPlayerScore(score),
					blockUserInteraction: (blockerId: string, reason?: string) => this.blockUserInteraction(blockerId, reason),
					unblockUserInteraction: (blockerId: string) => this.unblockUserInteraction(blockerId)
				});

				// Add any pending shared posts that were received before HomeE was created
				this.addPendingSharedPosts();

				// Broadcast joining
				this.broadcastPlayerJoining();

				new Timeline(this).create(this.home)
					.fadeIn(config.fadeIn.duration);
			}
		});
		this.append(agreement);
	}
}
