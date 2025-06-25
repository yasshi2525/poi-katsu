import { TitleScene } from "./scene/titleScene";

export function main(mode: "multi" | "ranking", totalTimeLimit: number): void {
	g.game.pushScene(new TitleScene({ game: g.game, mode, totalTimeLimit }));
}
