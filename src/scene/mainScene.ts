import { Timeline } from "@akashic-extension/akashic-timeline";
import { AffiliateBroadcastMessage, AffiliatePurchaseMessage } from "../data/affiliateMessages";
import { GameContext } from "../data/gameContext";
import { createPlayerData } from "../data/playerData";
import { SharedPostData } from "../data/sharedPostData";
import { AgreementE } from "../entity/agreementE";
import { HeaderE } from "../entity/headerE";
import { HomeE } from "../entity/homeE";
import { MarketManager } from "../manager/marketManager";
import { BaseScene } from "./baseScene";
import { RankingScene} from "./rankingScene";

const config = {
	fadeIn: { duration: 500 },
};

export class MainScene extends BaseScene {
	private remainFrame: number;
	private lastRemainSec: number;
	private header?: HeaderE;
	private home?: HomeE;
	private marketManager?: MarketManager;
	private gameContext?: GameContext;
	private interactionBlocker?: g.E;
	private pendingSharedPosts: SharedPostData[] = []; // Store posts received before HomeE is created

	constructor(param: g.SceneParameterObject) {
		super({
			...param,
			assetIds: [
				...param.assetIds ?? [],
				...AgreementE.assetIds,
				...HeaderE.assetIds,
				...HomeE.assetIds
			]
		});
		this.remainFrame = (this.game.vars as GameVars).totalTimeLimit * this.game.fps;
		this.lastRemainSec = Math.floor(this.remainFrame / this.game.fps);
		this.onLoad.add(() => {
			// Initialize MarketManager for price management
			const gameVars = this.game.vars as GameVars;
			const mode = gameVars.mode || "ranking";
			this.marketManager = new MarketManager(this, mode);
			this.marketManager.initialize();

			// Initialize GameContext for settlement and ranking features
			const initialPlayerData = createPlayerData({
				name: gameVars.playerProfile.name,
				avatar: gameVars.playerProfile.avatar
			}, this.game.age);

			// Override initial points with current score
			initialPlayerData.points = gameVars.gameState.score;

			const gameMode = {
				mode: (gameVars.mode === "multi" ? "multi_admission" : "ranking") as "ranking" | "multi_admission",
				maxPlayers: 4,
				currentPlayers: 1
			};

			this.gameContext = new GameContext(initialPlayerData, gameMode, gameVars.totalTimeLimit, this.game.age);


			// Initialize multi-player broadcast handlers immediately to prevent race conditions
			this.initializeMessageHandlers();

			this.onUpdate.add(() => {
				if (this.remainFrame > 0) {
					this.remainFrame--;
					const currentRemainSec = Math.floor(this.remainFrame / this.game.fps);
					// Only update header when seconds change
					if (currentRemainSec !== this.lastRemainSec) {
						this.lastRemainSec = currentRemainSec;
						if (this.header) {
							this.header.setTime(currentRemainSec);
						}
					}
				} else if (this.remainFrame === 0) {
					// Time reached zero - block all player interactions
					this.blockAllInteractions();
					// Trigger automatic settlement app reveal and execution
					this.triggerAutomaticSettlement();
					this.remainFrame = -1; // Prevent multiple executions
				}
			});
			this.append(new g.FilledRect({
				scene: this,
				cssColor: "#4A90E2",
				width: this.game.width * 0.8,
				height: this.game.height * 0.8,
				x: this.game.width / 2,
				y: this.game.height / 2,
				anchorX: 0.5,
				anchorY: 0.5
			}));
			this.append(new g.Label({
				scene: this,
				text: "Main Scene",
				font: new g.DynamicFont({
					game: this.game,
					fontFamily: "sans-serif",
					size: 50,
					fontColor: "white",
					strokeColor: "black",
					strokeWidth: 5
				}),
				x: this.game.width / 2,
				y: this.game.height / 2,
				anchorX: 0.5,
				anchorY: 0.5
			}));
		});
	}

	/**
	 * Initializes multi-player message handlers immediately on scene load
	 * This prevents race conditions where fast players broadcast before slow players are ready
	 */
	public initializeMessageHandlers(): void {
		const gameVars = this.game.vars as GameVars;
		if (gameVars.mode === "multi") {
			this.onMessage.add((ev: g.MessageEvent) => {
				// Handle profile broadcasts
				if (ev.data?.type === "profileUpdate" && ev.data?.profileData) {
					const profileData = ev.data.profileData;
					if (profileData.playerId && profileData.playerId !== this.game.selfId) {
						gameVars.allPlayersProfiles[profileData.playerId] = {
							name: profileData.name,
							avatar: profileData.avatar
						};
						// Also update profile in GameContext for ranking consistency
						this.updatePlayerProfileInGameContext(profileData.playerId, profileData.name, profileData.avatar);
					}
				}

				// Handle score broadcasts
				if (ev.data?.type === "scoreUpdate" && ev.data?.scoreData) {
					const scoreData = ev.data.scoreData;
					if (scoreData.playerId && scoreData.playerId !== this.game.selfId) {
						gameVars.allPlayersScores[scoreData.playerId] = scoreData.score;
						// Also update score in GameContext for settlement consistency
						this.updatePlayerScoreInGameContext(scoreData.playerId, scoreData.score);
					}
				}

				// Handle affiliate post sharing broadcasts
				if (ev.data?.type === "affiliatePostShared" && ev.data?.affiliateData) {
					const affiliateData = ev.data.affiliateData as AffiliateBroadcastMessage;
					if (affiliateData.playerId && affiliateData.playerId !== this.game.selfId) {
						// Add shared post to other players' timelines
						this.addSharedPostToTimeline(affiliateData.sharedPost);
					}
				}

				// Handle affiliate purchase notifications
				if (ev.data?.type === "affiliatePurchase" && ev.data?.purchaseData) {
					const purchaseData = ev.data.purchaseData as AffiliatePurchaseMessage;
					if (purchaseData.sharerId === this.game.selfId) {
						// Reward the sharer with affiliate points
						this.awardAffiliateReward(purchaseData.rewardPoints, purchaseData.buyerName);
					}
					// Update purchase count for all players
					this.updateAffiliatePurchaseCount(purchaseData.postId);
				}

				// Handle player joining broadcasts
				if (ev.data?.type === "playerJoined" && ev.data?.playerData) {
					const joinData = ev.data.playerData;
					if (joinData.playerId && joinData.playerId !== this.game.selfId) {
						// Create PlayerData from broadcast and add to GameContext
						this.addPlayerFromBroadcast(joinData);
					}
				}

				// Handle task completion broadcasts
				if (ev.data?.type === "taskCompletion" && ev.data?.taskData) {
					const taskData = ev.data.taskData;
					if (taskData.playerId && taskData.playerId !== this.game.selfId) {
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
	 * Gets the GameContext instance
	 */
	getGameContext(): GameContext | undefined {
		return this.gameContext;
	}

	/**
	 * Transitions to ranking scene when settlement is completed
	 */
	transitionToRanking(): void {
		if (this.gameContext) {
			const rankingScene = new RankingScene({
				game: this.game,
				gameContext: this.gameContext!
			});
			this.swipeOut(rankingScene);
		}
	}

	/**
	 * Updates current player score in GameContext (called when local score changes)
	 */
	updateCurrentPlayerScore(score: number): void {
		if (!this.gameContext) return;

		const currentPlayer = this.gameContext.currentPlayer;
		const updatedPlayer = {
			...currentPlayer,
			points: score,
			lastActiveAt: this.game.age
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
	 * Force closes all modals across the scene when time reaches zero
	 */
	private forceCloseAllModals(): void {
		if (this.home) {
			this.home.forceCloseAllModals();
		}
	}

	/**
	 * Triggers automatic settlement when time reaches zero
	 */
	private triggerAutomaticSettlement(): void {
		// Force close all modals when time reaches zero
		this.forceCloseAllModals();

		if (!this.home) {
			// If HomeE isn't created yet (player still in agreement), directly transition to ranking
			console.log("HomeE not initialized, directly transitioning to ranking");
			this.transitionToRanking();
			return;
		}

		// First ensure we're on the home screen before revealing settlement app
		this.home.returnToHomeIfNeeded();

		// Then trigger automatic settlement app reveal and opening
		this.home.triggerAutomaticSettlement();
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
	private addPlayerFromBroadcast(joinData: any): void {
		if (!this.gameContext) return;

		// Create PlayerData from broadcast data
		const playerData = createPlayerData(joinData.profile, joinData.joinedAt);
		playerData.points = joinData.points;
		playerData.ownedItems = joinData.ownedItems || [];
		playerData.lastActiveAt = joinData.lastActiveAt;

		this.gameContext.addPlayer(joinData.playerId, playerData);
	}

	/**
	 * Adds current player to GameContext with proper ID
	 */
	private addCurrentPlayerToGameContext(): void {
		if (!this.gameContext) return;

		const gameVars = this.game.vars as GameVars;
		const currentPlayerId = this.game.selfId || "player_self";

		// Remove the default "current" entry since we'll add with proper ID
		this.gameContext.removePlayer("current");

		// Create PlayerData for current player with updated info
		const playerData = createPlayerData({
			name: gameVars.playerProfile.name,
			avatar: gameVars.playerProfile.avatar
		}, this.game.age);

		// Override initial points with current score
		playerData.points = gameVars.gameState.score;

		this.gameContext.addPlayer(currentPlayerId, playerData);
	}

	/**
	 * Updates player score in GameContext
	 */
	private updatePlayerScoreInGameContext(playerId: string, score: number): void {
		if (!this.gameContext) return;

		const player = this.gameContext.allPlayers.get(playerId);
		if (player) {
			const updatedPlayer = {
				...player,
				points: score,
				lastActiveAt: this.game.age
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
		if (!this.gameContext) return;

		const player = this.gameContext.allPlayers.get(playerId);
		if (player) {
			const updatedPlayer = {
				...player,
				profile: { name, avatar },
				lastActiveAt: this.game.age
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
		if (!this.gameContext) return;

		const player = this.gameContext.allPlayers.get(playerId);
		if (player) {
			const updatedTaskProgress = new Map(player.taskProgress);
			updatedTaskProgress.set(taskId, {
				taskId: taskId,
				completed: true,
				completedAt: this.game.age
			});

			const updatedPlayer = {
				...player,
				taskProgress: updatedTaskProgress,
				lastActiveAt: this.game.age
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
		const gameVars = this.game.vars as GameVars;
		if (gameVars.mode === "multi" && this.game.selfId) {
			const message = {
				type: "playerJoined",
				playerData: {
					playerId: this.game.selfId,
					profile: {
						name: gameVars.playerProfile.name,
						avatar: gameVars.playerProfile.avatar
					},
					points: gameVars.gameState.score,
					ownedItems: [],
					joinedAt: this.game.age,
					lastActiveAt: this.game.age
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
			onComplete: () => {
				const gameVars = this.game.vars as GameVars;

				// Create header at scene level (always visible)
				this.header = new HeaderE({
					scene: this,
					width: this.game.width,
					height: 80,
					score: gameVars.gameState.score,
					remainingSec: gameVars.totalTimeLimit
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
					updateCurrentPlayerScore: (score: number) => this.updateCurrentPlayerScore(score),
					transitionToRanking: () => this.transitionToRanking()
				});

				// Add any pending shared posts that were received before HomeE was created
				this.addPendingSharedPosts();

				// Add current player to GameContext and broadcast joining
				this.addCurrentPlayerToGameContext();
				this.broadcastPlayerJoining();

				new Timeline(this).create(this.home)
					.fadeIn(config.fadeIn.duration);
			}
		});
		this.append(agreement);
	}
}
