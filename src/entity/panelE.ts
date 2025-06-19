export class PanelE extends g.Sprite {
	static assetIds: string[] = ["panel"];
	constructor(options: g.EParameterObject & { width: number; height: number }) {
		const asset = options.scene.asset.getImageById("panel");
		const surface = options.scene.game.resourceFactory.createSurface(options.width, options.height);
		g.SurfaceUtil.drawNinePatch(
			surface,
			g.SurfaceUtil.asSurface(asset)!,
			{
				left: asset.width / 4,
				right: asset.width / 4,
				top: asset.height / 4,
				bottom: asset.height / 4
			}
		);
		super({ ...options, src: surface });
	}
}
