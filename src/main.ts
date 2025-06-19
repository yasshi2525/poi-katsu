import { TitleScene } from "./scene/titleScene";

export function main(): void {
	g.game.pushScene(new TitleScene({ game: g.game }));
}
