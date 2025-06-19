import { Easing, Timeline } from "@akashic-extension/akashic-timeline";

const config = {
	swipe: {
		duration: 500
	}
};

export abstract class BaseScene extends g.Scene {
	_overlay!: g.E;

	protected constructor(param: g.SceneParameterObject) {
		super(param);
		this.onLoad.add(() => {
			this._overlay = new g.E({
				scene: this,
				parent: this,
				width: this.game.width,
				height: this.game.height,
			});
			this.swipeIn();
		});
	}

	override append(e: g.E): void {
		this.insertBefore(e, this._overlay);
	}

	swipeOut(next: BaseScene): void {
		this.swipe("out", () => {
			this.game.pushScene(next);
		});
	}

	swipeIn(): void {
		this.swipe("in", () => this.onSwipeIn());
	}

	protected abstract onSwipeIn(): void;

	private swipe(typ: "in" | "out", onComplete?: g.HandlerFunction<void>): void {
		if (this.game.focusingCamera) {
			throw new Error("Camera is already set. Cannot swipe.");
		}
		const camera = new g.Camera2D({
			x: typ === "in" ? -this.game.width : 0,
			local: true
		});
		this.game.focusingCamera = camera;
		this.game.modified();
		this._overlay.x = camera.x;
		this._overlay.modified();

		new Timeline(this).create(camera)
			.moveX(typ === "in" ? 0 : this.game.width, config.swipe.duration, Easing.easeInOutExpo)
			.con()
			.every((_, d) => {
				for (const c of this.children.filter(c => c !== this._overlay)) {
					c.opacity = typ === "in" ? d : 1 - d;
					c.modified();
				}
			}, config.swipe.duration)
			.call(() => {
				this.game.focusingCamera = undefined;
				this.game.modified();
				if (onComplete){
					onComplete();
				}
			});
		new Timeline(this).create(this._overlay)
			.moveX(typ === "in" ? 0 : this.game.width, config.swipe.duration, Easing.easeInOutExpo);
	}
}
