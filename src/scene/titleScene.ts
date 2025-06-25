import { Timeline } from "@akashic-extension/akashic-timeline";
import { BaseScene } from "./baseScene";
import { MainScene } from "./mainScene";

export class TitleScene extends BaseScene {
	private readonly mode: "multi" | "ranking";
	private readonly totalTimeLimit: number;

	constructor(param: g.SceneParameterObject & { mode: "multi" | "ranking"; totalTimeLimit: number }) {
		super({
			...param,
			assetIds: []
		});
		this.mode = param.mode;
		this.totalTimeLimit = param.totalTimeLimit;
		this.onLoad.add(() => {
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
				text: "ぽい活ウォーズ",
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

	protected override onSwipeOut(): void {
		// nothing to do here
	}

	protected override onSwipeIn(): void {
		new Timeline(this).create(this)
			.wait(1000)
			.call(() => {
				this.swipeOut(new MainScene({ game: this.game, mode: this.mode, totalTimeLimit: this.totalTimeLimit }));
			});
	}
}
