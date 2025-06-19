import { AgreementE } from "../entity/agreementE";
import { BaseScene } from "./baseScene";

export class MainScene extends BaseScene {
	constructor(param: g.SceneParameterObject) {
		super({
			...param,
			assetIds: [
				...param.assetIds ?? [],
				...AgreementE.assetIds
			]
		});
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
				// Handle agreement completion
			}
		});
		this.append(agreement);
	}
}
