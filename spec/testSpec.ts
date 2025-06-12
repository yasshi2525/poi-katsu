import * as path from "path";
import { GameContext, RunnerV3_g as g } from "@akashic/headless-akashic";

describe("mainScene", () => {
	it("ゲームが正常に動作できる", async () => {
		const context = new GameContext<3>({
			gameJsonPath: path.join(__dirname, "..", "game.json")
		});
		const client = await context.getGameClient();
		expect(client.type).toBe("active");

		const game = client.game!;
		expect(game.width).toBe(1280);
		expect(game.height).toBe(720);
		expect(game.fps).toBe(60);

		await client.advanceUntil(
			() => game.scene()!.local !== "full-local" && game.scene()!.name !== "_bootstrap"
		); // ローカル(ローディング)シーンを抜けるまで進める

		const scene = client.game.scene()!;
		expect(scene).toBeDefined();

		// checkbox-agreement のアセットが読み込まれていることを確認
		expect(Object.keys(scene.assets).length).toBe(1);
		expect(scene.children.length).toBe(3);

		// 初期スコア、時間の値を確認
		await context.step();

		const timeLabel = scene.children[1] as g.Label;
		expect(timeLabel.text).toBe("TIME: 60");

		// 制限時間がなくなった時の時間表示を確認
		await context.advance(60000);
		expect(timeLabel.text).toBe("TIME: 0");

		await context.destroy();
	});
});
