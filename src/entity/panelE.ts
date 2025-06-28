export class PanelE extends g.Sprite {
	static assetIds: string[] = ["panel"];
	private baseAsset: g.ImageAsset;
	private ninePatchConfig: { left: number; right: number; top: number; bottom: number };

	constructor(options: g.EParameterObject & { width: number; height: number }) {
		const baseAsset = options.scene.asset.getImageById("panel");
		const ninePatchConfig = {
			left: Math.floor(baseAsset.width / 4),
			right: Math.floor(baseAsset.width / 4),
			top: Math.floor(baseAsset.height / 4),
			bottom: Math.floor(baseAsset.height / 4)
		};
		const surface = options.scene.game.resourceFactory.createSurface(Math.floor(options.width), Math.floor(options.height));
		g.SurfaceUtil.drawNinePatch(
			surface,
			g.SurfaceUtil.asSurface(baseAsset)!,
			ninePatchConfig
		);
		super({ ...options, width: Math.floor(options.width), height: Math.floor(options.height), src: surface });
		this.baseAsset = baseAsset;
		this.ninePatchConfig = ninePatchConfig;
	}

	resize(width: number, height: number): void {
		const newWidth = Math.floor(width);
		const newHeight = Math.floor(height);

		const surface = this.scene.game.resourceFactory.createSurface(newWidth, newHeight);
		g.SurfaceUtil.drawNinePatch(
			surface,
			g.SurfaceUtil.asSurface(this.baseAsset)!,
			this.ninePatchConfig
		);

		this.src = surface;
		this.srcWidth = newWidth;
		this.srcHeight = newHeight;
		this.width = newWidth;
		this.height = newHeight;
		this.invalidate();
	}
}
