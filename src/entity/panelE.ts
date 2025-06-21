export class PanelE extends g.Sprite {
	static assetIds: string[] = ["panel"];
	constructor(options: g.EParameterObject & { width: number; height: number }) {
		const asset = options.scene.asset.getImageById("panel");
		const surface = options.scene.game.resourceFactory.createSurface(Math.floor(options.width), Math.floor(options.height));
		g.SurfaceUtil.drawNinePatch(
			surface,
			g.SurfaceUtil.asSurface(asset)!,
			{
				left: Math.floor(asset.width / 4),
				right: Math.floor(asset.width / 4),
				top: Math.floor(asset.height / 4),
				bottom: Math.floor(asset.height / 4)
			}
		);
		super({ ...options, width: Math.floor(options.width), height: Math.floor(options.height), src: surface });
	}
}
