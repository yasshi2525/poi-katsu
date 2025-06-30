import { AFFILIATE_CONFIG } from "../config/affiliateConfig";
import type { AffiliatePurchaseMessage } from "../data/affiliateMessages";
import type { GameContext } from "../data/gameContext";
import type { SharedPostData } from "../data/sharedPostData";

export class AffiliatePurchaseBot {
	private scene: g.Scene;
	private gameContext: GameContext;
	private availablePosts: Map<string, SharedPostData>;
	private purchaseTimer: g.TimerIdentifier | null;
	private purchaseInterval: number;
	private isActive: boolean;

	constructor(scene: g.Scene, gameContext: GameContext) {
		this.scene = scene;
		this.gameContext = gameContext;
		this.availablePosts = new Map();
		this.purchaseTimer = null;
		this.purchaseInterval = 20000; // 20秒から開始
		this.isActive = false;
	}

	initialize(): void {
		if (!this.scene.game.isActiveInstance()) {
			return;
		}

		this.isActive = true;
		this.startPurchaseTimer();
	}

	onAffiliatePostShared(sharedPost: SharedPostData): void {
		if (!this.isActive || !this.scene.game.isActiveInstance()) {
			return;
		}

		// 自分の投稿は除外
		if (sharedPost.sharerId === this.gameContext.currentPlayer.id) {
			return;
		}

		this.availablePosts.set(sharedPost.id, sharedPost);
	}

	onGameTimeEnded(): void {
		this.isActive = false;
		if (this.purchaseTimer) {
			this.scene.clearTimeout(this.purchaseTimer);
			this.purchaseTimer = null;
		}
	}

	// テスト用メソッド
	getAvailablePostsCount(): number {
		return this.availablePosts.size;
	}

	getCurrentPurchaseInterval(): number {
		return this.purchaseInterval;
	}

	getIsActive(): boolean {
		return this.isActive;
	}

	private startPurchaseTimer(): void {
		if (!this.isActive || this.gameContext.gameState.remainingFrame <= 0) {
			return;
		}

		this.purchaseTimer = this.scene.setTimeout(() => {
			this.processPurchase();
			this.updatePurchaseInterval();
			this.startPurchaseTimer(); // 次の購入タイマーを開始
		}, this.purchaseInterval);
	}

	private processPurchase(): void {
		if (!this.isActive || this.availablePosts.size === 0 || this.gameContext.gameState.remainingFrame <= 0) {
			return;
		}
		for (let i = 0; i < this.gameContext.allPlayers.size; i++) {
			const selectedPost = this.selectPurchaseTarget();
			if (!selectedPost) {
				return;
			}

			this.executePurchase(selectedPost);
		}
	}

	private selectPurchaseTarget(): SharedPostData | null {
		if (this.availablePosts.size === 0) {
			return null;
		}

		// 利用可能な商品から1つ選択
		const availableItemNames = new Set(Array.from(this.availablePosts.values()).map(post => post.item.name));
		if (availableItemNames.size === 0) {
			return null;
		}
		const targetItemNameIndex = Math.floor(this.gameContext.localRandom.generate() * availableItemNames.size);
		const targetItemName = Array.from(availableItemNames)[targetItemNameIndex];

		// 価格の安い順でソート
		const sortedPosts = Array.from(this.availablePosts.values())
			.filter(post => post.item.name === targetItemName)
			.sort((a, b) => a.sharedPrice - b.sharedPrice);

		// 75%の確率で選択するロジック
		let selectedIndex = 0;
		for (let i = 0; i < sortedPosts.length; i++) {
			const probability = this.gameContext.localRandom.generate();
			if (probability < 0.75) {
				selectedIndex = i;
				break;
			}
			// 75%に当たらなかった場合は次の商品へ
			if (i === sortedPosts.length - 1) {
				// 最後の商品なら強制選択
				selectedIndex = i;
			}
		}

		return sortedPosts[selectedIndex];
	}

	private executePurchase(post: SharedPostData): void {
		const currentPlayerId = this.gameContext.currentPlayer.id;
		const botName = "Bot";

		// アフィリエイト報酬を計算
		const affiliateReward = Math.floor(post.sharedPrice * AFFILIATE_CONFIG.REWARD_RATE);

		// アフィリエイト購入メッセージをブロードキャスト
		const purchaseMessage: AffiliatePurchaseMessage = {
			postId: post.id,
			buyerId: currentPlayerId,
			buyerName: botName,
			sharerId: post.sharerId,
			rewardPoints: affiliateReward
		};

		const message = {
			type: "affiliatePurchase",
			purchaseData: purchaseMessage
		};

		this.scene.game.raiseEvent(new g.MessageEvent(message));
	}

	private updatePurchaseInterval(): void {
		// 購入間隔を徐々に短くする（20秒 → 10秒 → 5秒 → 2.5秒 → 1.25秒）
		const proceedRate = // start from 0 to 1
			(this.gameContext.gameState.totalTimeLimit - this.gameContext.gameState.remainingTime)
			/ this.gameContext.gameState.totalTimeLimit;
		if (proceedRate < 0.2) {
			this.purchaseInterval = 20000;
		} else if (proceedRate < 0.4) {
			this.purchaseInterval = 10000;
		} else if (proceedRate < 0.75) {
			this.purchaseInterval = 5000;
		} else if (proceedRate < 0.9) {
			this.purchaseInterval = 2500;
		} else {
			this.purchaseInterval = 1250;
		}
	}
}
