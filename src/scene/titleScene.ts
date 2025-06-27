import { Timeline } from "@akashic-extension/akashic-timeline";
import { GameContext } from "../data/gameContext";
import { createInitialPlayerProfile, createPlayerData } from "../data/playerData";
import { LabelButtonE } from "../entity/labelButtonE";
import { BaseScene } from "./baseScene";
import { MainScene } from "./mainScene";

export class TitleScene extends BaseScene {
	private readonly mode: "multi" | "ranking";
	private readonly totalTimeLimit: number;
	private fallingCoins: g.Sprite[] = [];
	private gameContext?: GameContext;
	private isGameMaster: boolean = false;
	private playerCountLabel?: g.Label;
	private joinButton?: g.E;
	private joinButtonLabel?: g.Label;
	private isJoined: boolean = false;
	private joinedPlayers: Set<string> = new Set<string>();
	private buttonCounter: number = 0;
	private isAutoCoinRunning: boolean = false;

	constructor(param: g.SceneParameterObject & { mode: "multi" | "ranking"; totalTimeLimit: number }) {
		super({
			...param,
			assetIds: ["coin-front", "coin-diagonal"]
		});
		this.mode = param.mode;
		this.totalTimeLimit = param.totalTimeLimit;

		this.onLoad.add(() => {
			this.waitForPlayersAndInitialize();
		});
	}

	private waitForPlayersAndInitialize(): void {
		// joinedPlayerIdsに要素が追加されるまで待機
		const checkPlayers = (): void => {
			if (this.game.joinedPlayerIds.length > 0) {
				this.initializeGame();
			} else {
				this.setTimeout(() => checkPlayers(), 100);
			}
		};
		checkPlayers();
	}

	private initializeGame(): void {
		// ゲームマスターかどうかを判定
		this.isGameMaster = this.game.selfId === this.game.joinedPlayerIds[0];

		// GameContextを作成
		this.createGameContext();

		// UI要素を作成
		this.createBackground();
		this.createTitle();
		this.createGameConceptText();
		this.createFeatureIcons();
		this.createPlayerCount();
		this.createJoinButton();
		this.createDummyButtons();
		this.startFallingCoins();

		// メッセージハンドラーを設定
		this.setupMessageHandlers();
	}

	private createGameContext(): void {
		// 各プレイヤーが自分のIDでプレイヤーデータを作成
		const initialPlayerData = createPlayerData(this.game.selfId, createInitialPlayerProfile(), 0);

		const gameMode = {
			mode: this.mode,
			maxPlayers: 8,
			currentPlayers: 1
		};

		this.gameContext = new GameContext(
			initialPlayerData,
			gameMode,
			{ score: 0 },
			this.game.localRandom,
			this.totalTimeLimit
		);

		// 自分を初期参加者として記録
		this.joinedPlayers.add(initialPlayerData.id);

		if (!this.isGameMaster) {
			// ゲームマスターは自身のIDをMessageEventでブロードキャストしないので
			// 非ゲームマスター時はここでゲームマスターのIDを追加する
			const gameMasterId = this.game.joinedPlayerIds[0];
			const gameMaster = createPlayerData(gameMasterId, createInitialPlayerProfile(), 0);
			this.gameContext.addPlayer(gameMaster.id, gameMaster);
		}
	}

	private createBackground(): void {
		// 背景は透明のため何も描画しない
	}

	private createTitle(): void {
		const titleContainer = new g.E({ scene: this });
		const mainTitle = new g.Label({
			scene: this,
			text: "ポイ活ウォーズ",
			font: new g.DynamicFont({
				game: this.game,
				fontFamily: "sans-serif",
				size: 60,
				fontColor: "#f39c12",
				strokeColor: "#2c3e50",
				strokeWidth: 4
			}),
			x: this.game.width / 2,
			y: 120,
			anchorX: 0.5,
			anchorY: 0.5
		});

		const subtitle = new g.Label({
			scene: this,
			text: "～謎のポイ活サービスで荒稼ぎしよう！～",
			font: new g.DynamicFont({
				game: this.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: "#ecf0f1",
				strokeColor: "#2c3e50",
				strokeWidth: 2
			}),
			x: this.game.width / 2,
			y: 180,
			anchorX: 0.5,
			anchorY: 0.5
		});

		titleContainer.append(mainTitle);
		titleContainer.append(subtitle);
		this.append(titleContainer);
	}

	private createGameConceptText(): void {
		const conceptLines = [
			"SNS連携、いいね、広告タップ、通販でポイントゲット！",
			"セールを狙って商品購入、フリマで換金",
			"シリーズ商品をコンプリートして超ボーナス！",
			"次々と解禁される機能を使いこなして",
			"ポイント長者を目指せ！"
		];

		const conceptContainer = new g.E({ scene: this });
		conceptLines.forEach((line, index) => {
			const label = new g.Label({
				scene: this,
				text: line,
				font: new g.DynamicFont({
					game: this.game,
					fontFamily: "sans-serif",
					size: 18,
					fontColor: "#bdc3c7",
					strokeColor: "black",
					strokeWidth: 2
				}),
				x: this.game.width / 2,
				y: 240 + (index * 30),
				anchorX: 0.5,
				anchorY: 0.5
			});
			conceptContainer.append(label);
		});

		this.append(conceptContainer);
	}

	private createFeatureIcons(): void {
		const iconContainer = new g.E({ scene: this });
		const centerX = this.game.width / 2;
		const yPosition = 400; // 説明文の下、ポイント長者を目指せ！の下
		const features = [
			{ name: "SNS", color: "#3498db", x: centerX - 120 },
			{ name: "通販", color: "#e74c3c", x: centerX },
			{ name: "広告", color: "#2ecc71", x: centerX + 120 }
		];

		features.forEach(feature => {
			const iconBg = new g.FilledRect({
				scene: this,
				cssColor: feature.color,
				width: 80,
				height: 80,
				x: feature.x,
				y: yPosition,
				anchorX: 0.5,
				anchorY: 0.5
			});

			const iconLabel = new g.Label({
				scene: this,
				text: feature.name,
				font: new g.DynamicFont({
					game: this.game,
					fontFamily: "sans-serif",
					size: 16,
					fontColor: "white",
					strokeColor: "#2c3e50",
					strokeWidth: 2
				}),
				x: feature.x,
				y: yPosition,
				anchorX: 0.5,
				anchorY: 0.5
			});

			iconContainer.append(iconBg);
			iconContainer.append(iconLabel);
		});

		this.append(iconContainer);
	}

	private createPlayerCount(): void {
		this.playerCountLabel = new g.Label({
			scene: this,
			text: `参加者数: ${this.joinedPlayers.size}`,
			font: new g.DynamicFont({
				game: this.game,
				fontFamily: "sans-serif",
				size: 20,
				fontColor: "#ecf0f1",
				strokeColor: "black",
				strokeWidth: 3
			}),
			x: this.game.width / 2,
			y: this.game.height - 200, // 200ptに変更（128pt + ボタン高さ + マージン）
			anchorX: 0.5,
			anchorY: 0.5
		});
		this.append(this.playerCountLabel);
	}

	private updatePlayerCount(): void {
		if (this.playerCountLabel) {
			this.playerCountLabel.text = `参加者数: ${this.joinedPlayers.size}`;
			this.playerCountLabel.invalidate();
		}
	}

	private createJoinButton(): void {
		const buttonText = this.isGameMaster
			? "参加受付を終了してゲームを始める（途中参加可）"
			: "ゲームに参加する";

		const backgroundColor = this.isGameMaster ? "#27ae60" : "#3498db";
		const buttonActionType = this.isGameMaster ? "startGame" : "joinGame";

		const joinButton = new LabelButtonE({
			scene: this,
			multi: this.mode === "multi",
			name: `titleJoinButton_${this.game.selfId}_${++this.buttonCounter}`,
			args: buttonActionType,
			width: 320,
			height: 60,
			x: this.game.width / 2,
			y: this.game.height - 148, // 128pt + 20pt margin
			anchorX: 0.5,
			anchorY: 0.5,
			text: buttonText,
			backgroundColor: backgroundColor,
			textColor: "white",
			fontSize: 18,
			onComplete: (action: string) => {
				this.handleJoinButtonClick();
			},
		});

		this.append(joinButton);
		this.joinButton = joinButton;
		this.joinButtonLabel = joinButton as any; // ラベル更新用の参照を保持
	}

	private handleJoinButtonClick(): void {
		if (this.isGameMaster) {
			// ゲームマスターの場合、ゲーム開始
			this.startGame();
		} else {
			// 一般プレイヤーの場合、参加/キャンセル切り替え
			this.toggleJoinStatus();
		}
	}

	private startGame(): void {
		// ゲーム開始をブロードキャスト
		this.broadcastGameStart();
	}

	private broadcastGameStart(): void {
		const messageData = {
			type: "gameStart",
			masterId: this.game.selfId
		};

		this.game.raiseEvent(new g.MessageEvent(messageData));
	}

	private transitionToMainScene(): void {
		// GameContextを新しいMainSceneに引き継ぐためのパラメータを準備
		const mainSceneParam = {
			game: this.game,
			mode: this.mode,
			totalTimeLimit: this.totalTimeLimit,
			gameContext: this.gameContext // GameContextを引き継ぎ
		};

		this.swipeOut(new MainScene(mainSceneParam as any));
	}

	private toggleJoinStatus(): void {
		if (this.isJoined) {
			// 参加キャンセル
			this.isJoined = false;
			this.broadcastMessage("leave");
			this.updateJoinButtonText("ゲームに参加する");
		} else {
			// 参加
			this.isJoined = true;
			this.broadcastMessage("join");
			this.updateJoinButtonText("参加取り消し");
		}
	}

	private updateJoinButtonText(text: string): void {
		// LabelButtonEは一度作成すると内部のテキストを変更できないため、
		// 新しいボタンを作成し直す
		if (this.joinButton) {
			this.joinButton.destroy();
		}
		this.createJoinButtonWithText(text);
	}

	private createJoinButtonWithText(buttonText: string): void {
		const backgroundColor = this.isGameMaster ? "#27ae60" : "#3498db";
		const buttonActionType = this.isGameMaster ? "startGame" : "joinGame";

		const joinButton = new LabelButtonE({
			scene: this,
			multi: this.mode === "multi",
			name: `titleJoinButton_${this.game.selfId}_${++this.buttonCounter}`, // ユニークな名前
			args: buttonActionType,
			width: 320,
			height: 60,
			x: this.game.width / 2,
			y: this.game.height - 148, // 128pt + 20pt margin
			anchorX: 0.5,
			anchorY: 0.5,
			text: buttonText,
			backgroundColor: backgroundColor,
			textColor: "white",
			fontSize: 18,
			onComplete: (action: string) => {
				this.handleJoinButtonClick();
			},
		});

		this.append(joinButton);
		this.joinButton = joinButton;
		this.joinButtonLabel = joinButton as any;
	}

	private createDummyButtons(): void {
		// 左側のダミーボタン
		const leftButton = new g.FilledRect({
			scene: this,
			cssColor: "#e67e22",
			width: 120,
			height: 50,
			x: 100 - 60, // anchorX 0.5相当
			y: this.game.height - 200 - 25, // anchorY 0.5相当
			touchable: true
		});

		const leftLabel = new g.Label({
			scene: this,
			text: "ポイント獲得",
			font: new g.DynamicFont({
				game: this.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "white",
				strokeColor: "black",
				strokeWidth: 2
			}),
			x: 100 - 35, // 中央揃え
			y: this.game.height - 200 - 7, // 中央揃え
		});

		leftButton.onPointUp.add(() => {
			this.startAutoCoinCollection();
		});

		// 右側のダミーボタン
		const rightButton = new g.FilledRect({
			scene: this,
			cssColor: "#e67e22",
			width: 120,
			height: 50,
			x: this.game.width - 100 - 60, // anchorX 0.5相当
			y: this.game.height - 200 - 25, // anchorY 0.5相当
			touchable: true
		});

		const rightLabel = new g.Label({
			scene: this,
			text: "ポイント獲得",
			font: new g.DynamicFont({
				game: this.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "white",
				strokeColor: "black",
				strokeWidth: 2
			}),
			x: this.game.width - 100 - 35, // 中央揃え
			y: this.game.height - 200 - 7, // 中央揃え
		});

		rightButton.onPointUp.add(() => {
			this.startAutoCoinCollection();
		});

		this.append(leftButton);
		this.append(leftLabel);
		this.append(rightButton);
		this.append(rightLabel);
	}

	private broadcastMessage(action: "join" | "leave"): void {
		const messageData = {
			type: "playerAction",
			action: action,
			playerId: this.game.selfId
		};

		this.game.raiseEvent(new g.MessageEvent(messageData));
	}

	private setupMessageHandlers(): void {
		this.onMessage.add((msg: g.MessageEvent) => {
			if (msg.data && msg.data.type === "playerAction") {
				this.handlePlayerMessage(msg.data);
			} else if (msg.data && msg.data.type === "gameStart") {
				this.handleGameStartMessage(msg.data);
			}
		});
	}

	private handlePlayerMessage(data: { action: "join" | "leave"; playerId: string }): void {
		if (data.action === "join") {
			this.joinedPlayers.add(data.playerId);
			if (this.gameContext) {
				const playerData = createPlayerData(data.playerId, createInitialPlayerProfile(), 0);
				this.gameContext.addPlayer(data.playerId, playerData);
			}
		} else if (data.action === "leave") {
			this.joinedPlayers.delete(data.playerId);
			if (this.gameContext) {
				this.gameContext.removePlayer(data.playerId);
			}
		}

		this.updatePlayerCount();
	}

	private handleGameStartMessage(data: { type: string; masterId: string }): void {
		// 全プレイヤー（ゲームマスター含む）が同じタイミングでゲーム開始
		// GameContextを引き継いでMainSceneに遷移
		this.transitionToMainScene();
	}


	private startAutoCoinCollection(): void {
		// 既に実行中の場合は停止し、実行中でない場合は開始
		if (this.isAutoCoinRunning) {
			this.isAutoCoinRunning = false;
			return;
		}

		this.isAutoCoinRunning = true;

		const ANIMATION_CONFIG = {
			AUTO_COLLECT_INTERVAL: 200, // 0.2秒間隔で連打演出
			AUTO_COLLECT_COUNT: 15, // 15回連打（3秒間相当）
		} as const;

		let collectCount = 0;

		const autoCollect = (): void => {
			if (!this.isAutoCoinRunning || collectCount >= ANIMATION_CONFIG.AUTO_COLLECT_COUNT) {
				this.isAutoCoinRunning = false;
				return;
			}

			this.collectCoin();
			collectCount++;
			this.setTimeout(() => autoCollect(), ANIMATION_CONFIG.AUTO_COLLECT_INTERVAL);
		};

		// すぐに開始
		autoCollect();
	}

	private startFallingCoins(): void {
		const ANIMATION_CONFIG = {
			SPAWN_INTERVAL: 200, // 10倍の頻度（2000ms → 200ms）
			FALL_DURATION: 4000,
			COIN_SCALE: 0.3,
		} as const;

		const createFallingCoin = (): void => {
			const coinAsset = this.asset.getImageById("coin-diagonal");
			const coin = new g.Sprite({
				scene: this,
				src: coinAsset,
				x: this.gameContext!.localRandom.generate() * this.game.width,
				y: -50,
				scaleX: ANIMATION_CONFIG.COIN_SCALE,
				scaleY: ANIMATION_CONFIG.COIN_SCALE,
				anchorX: 0.5,
				anchorY: 0.5
			});

			this.append(coin);
			this.fallingCoins.push(coin);

			const timeline = new Timeline(this);
			timeline.create(coin)
				.to({
					y: this.game.height + 50,
					angle: this.gameContext!.localRandom.generate() * 360
				}, ANIMATION_CONFIG.FALL_DURATION)
				.call(() => {
					const index = this.fallingCoins.indexOf(coin);
					if (index !== -1) {
						this.fallingCoins.splice(index, 1);
					}
					coin.destroy();
				});
		};

		const spawnCoins = (): void => {
			createFallingCoin();
			this.setTimeout(() => spawnCoins(), ANIMATION_CONFIG.SPAWN_INTERVAL);
		};

		spawnCoins();
	}

	private collectCoin(): void {
		const ANIMATION_CONFIG = {
			FLOAT_DURATION: 1500,
			FADE_DURATION: 500,
			COIN_SCALE: 0.4,
		} as const;

		const coinAsset = this.asset.getImageById("coin-front");
		const coin = new g.Sprite({
			scene: this,
			src: coinAsset,
			x: this.game.width / 2 + (this.gameContext!.localRandom.generate() - 0.5) * 100,
			y: 480,
			scaleX: ANIMATION_CONFIG.COIN_SCALE,
			scaleY: ANIMATION_CONFIG.COIN_SCALE,
			anchorX: 0.5,
			anchorY: 0.5
		});

		this.append(coin);

		const timeline = new Timeline(this);
		timeline.create(coin)
			.to({
				y: 100,
				x: coin.x + (this.gameContext!.localRandom.generate() - 0.5) * 150
			}, ANIMATION_CONFIG.FLOAT_DURATION)
			.to({ opacity: 0 }, ANIMATION_CONFIG.FADE_DURATION)
			.call(() => {
				coin.destroy();
			});
	}

	protected override onSwipeOut(): void {
		// nothing to do here
	}

	protected override onSwipeIn(): void {
		// マルチプレイヤー機能により自動遷移は無効化
	}
}
