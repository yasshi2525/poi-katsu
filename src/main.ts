import { GameMainParameterObject } from "./parameterObject";

export function main(param: GameMainParameterObject): void {
	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: ["checkbox-agreement"]
	});
	let time = 60; // 制限時間
	if (param.sessionParameter.totalTimeLimit) {
		time = param.sessionParameter.totalTimeLimit; // セッションパラメータで制限時間が指定されたらその値を使用します
	}
	// 市場コンテンツのランキングモードでは、g.game.vars.gameState.score の値をスコアとして扱います
	g.game.vars.gameState = { score: 0 };
	scene.onLoad.add(() => {
		// ここからゲーム内容を記述します

		// フォントの生成
		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 48
		});

		// スコア表示用のラベル
		const scoreLabel = new g.Label({
			scene: scene,
			text: "SCORE: 0",
			font: font,
			fontSize: font.size / 2,
			textColor: "black"
		});
		scene.append(scoreLabel);

		// 残り時間表示用ラベル
		const timeLabel = new g.Label({
			scene: scene,
			text: "TIME: 0",
			font: font,
			fontSize: font.size / 2,
			textColor: "black",
			x: 0.65 * g.game.width
		});
		scene.append(timeLabel);

		const updateHandler = (): void => {
			if (time <= 0) {
				scene.onUpdate.remove(updateHandler); // カウントダウンを止めるためにこのイベントハンドラを削除します
			}
			// カウントダウン処理
			time -= 1 / g.game.fps;
			timeLabel.text = "TIME: " + Math.ceil(time);
			timeLabel.invalidate();
		};
		scene.onUpdate.add(updateHandler);
		const checkBoxAsset = scene.asset.getImageById("checkbox-agreement");
		const checkBox = new g.FrameSprite({
			scene,
			src: checkBoxAsset,
			frames: [0, 1],
			x: g.game.width / 2,
			y: g.game.height / 2,
			width: checkBoxAsset.width / 2,
			height: checkBoxAsset.height,
			anchorX: 0.5,
			anchorY: 0.5,
			local: true,
			touchable: true
		});
		checkBox.onPointDown.add(() => {
			checkBox.frameNumber++;
			if (checkBox.frameNumber >= checkBox.frames.length) {
				checkBox.frameNumber = 0;
			}
			checkBox.modified();
		});
		scene.append(checkBox);
		// ここまでゲーム内容を記述します
	});
	g.game.pushScene(scene);
}
