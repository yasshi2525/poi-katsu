import { Timeline } from "@akashic-extension/akashic-timeline";
import { AffiliateBroadcastMessage, AffiliatePurchaseMessage } from "../data/affiliateMessages";
import { SharedPostData } from "../data/sharedPostData";
import { AgreementE } from "../entity/agreementE";
import { HeaderE } from "../entity/headerE";
import { HomeE } from "../entity/homeE";
import { MarketManager } from "../manager/marketManager";
import { BaseScene } from "./baseScene";

const config = {
	fadeIn: { duration: 500 },
};

export class MainScene extends BaseScene {
	private remainFrame: number;
	private lastRemainSec: number;
	private header?: HeaderE;
	private home?: HomeE;
	private marketManager?: MarketManager;

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
					}
				}

				// Handle score broadcasts
				if (ev.data?.type === "scoreUpdate" && ev.data?.scoreData) {
					const scoreData = ev.data.scoreData;
					if (scoreData.playerId && scoreData.playerId !== this.game.selfId) {
						gameVars.allPlayersScores[scoreData.playerId] = scoreData.score;
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
	 * Adds a shared post to the timeline for all players
	 */
	private addSharedPostToTimeline(sharedPost: SharedPostData): void {
		if (this.home) {
			this.home.addSharedPostToTimeline(sharedPost);
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
					header: this.header
				});
				new Timeline(this).create(this.home)
					.fadeIn(config.fadeIn.duration);
			}
		});
		this.append(agreement);
	}
}
