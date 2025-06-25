// 通常このファイルを編集する必要はありません。ゲームの処理は main.js に記述してください
import { main } from "./main";

export = () => {
	const vars: GameVars = {
		gameState: {
			score: 0
		},
	};
	g.game.vars = vars;

	const limitTickToWait = 3; // セッションパラメーターが来るまでに待つtick数

	const scene = new g.Scene({
		game: g.game,
		name: "_bootstrap"
	});
	// セッションパラメーターを受け取ってゲームを開始します
	scene.onMessage.add((msg) => {
		if (msg.data && msg.data.type === "start" && msg.data.parameters?.totalTimeLimit) {
			if (msg.data.parameters.randomSeed != null) {
				g.game.random = new g.XorshiftRandomGenerator(msg.data.parameters.randomSeed);
			}
			g.game.popScene();
			main("ranking", msg.data.parameters.totalTimeLimit - 20);
		}
	});
	scene.onLoad.add(() => {
		let currentTickCount = 0;
		scene.onUpdate.add(function() {
			currentTickCount++;
			// 待ち時間を超えた場合はゲームを開始します
			if (currentTickCount > limitTickToWait) {
				g.game.popScene();
				main("multi", 100);
			}
		});
	});
	g.game.pushScene(scene);
};
