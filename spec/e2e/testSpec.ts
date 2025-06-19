import * as path from "path";
import { GameContext } from "@akashic/headless-akashic";

describe("mainScene", () => {
	it("ゲームが正常に動作できる", async () => {
		const context = new GameContext<3>({
			gameJsonPath: path.join(__dirname, "..", "..", "game.json"),
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

		await context.destroy();
	});
});
