import { Timeline } from "@akashic-extension/akashic-timeline";
import { AgreementE } from "../entity/agreementE";
import { HomeE } from "../entity/homeE";
import { BaseScene } from "./baseScene";

const config = {
	fadeIn: { duration: 500 },
};

export class MainScene extends BaseScene {
	private remainFrame: number;
	private home?: HomeE;

	constructor(param: g.SceneParameterObject) {
		super({
			...param,
			assetIds: [
				...param.assetIds ?? [],
				...AgreementE.assetIds,
				...HomeE.assetIds
			]
		});
		this.remainFrame = (this.game.vars as GameVars).totalTimeLimit * this.game.fps;
		this.onLoad.add(() => {
			this.onUpdate.add(() => {
				if (this.remainFrame > 0) {
					this.remainFrame--;
					if (this.home) {
						this.home.setTime(this.remainFrame);
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

	protected override onSwipeIn(): void {
		const agreement = new AgreementE({
			scene: this,
			onComplete: () => {
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
				});
				new Timeline(this).create(this.home)
					.fadeIn(config.fadeIn.duration);
			}
		});
		this.append(agreement);
	}
}
