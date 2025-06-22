/**
 * Layout configuration interface
 */
interface LayoutConfig {
	x: number;
	y: number;
	width: number;
	height: number;
	children?: { [key: string]: LayoutConfig };
}

/**
 * Parameter object for AppList
 */
export interface AppListParameterObject extends g.EParameterObject {
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
}

/**
 * App navigation section component that displays app icons
 */
export class AppListE extends g.E {
	private readonly layout: LayoutConfig;

	/**
	 * Creates a new AppList instance
	 * @param options Configuration options for the app list
	 */
	constructor(options: AppListParameterObject) {
		super(options);

		this.layout = this.createLayoutConfig(options.width, options.height);
		this.createLayout();
	}

	/**
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, screenHeight: number): LayoutConfig {
		return {
			x: 0,
			y: screenHeight - 100,
			width: screenWidth,
			height: 100,
			children: {
				title: { x: 20, y: -25, width: 100, height: 16 },
				icon: {
					x: 60,
					y: 10,
					width: 60,
					height: 60,
					children: {
						background: { x: 0, y: 0, width: 60, height: 60 },
						iconLabel: { x: 18, y: 18, width: 24, height: 24 },
						badge: { x: 50, y: -5, width: 20, height: 20 },
						badgeLabel: { x: 56, y: 0, width: 8, height: 12 },
						nameLabel: { x: 10, y: 70, width: 40, height: 12 }
					}
				}
			}
		};
	}

	/**
	 * Creates the overall layout structure
	 */
	private createLayout(): void {
		// Navigation background
		const navBg = new g.FilledRect({
			scene: this.scene,
			width: this.layout.width,
			height: this.layout.height,
			x: this.layout.x,
			y: this.layout.y,
			cssColor: "#2c3e50",
		});
		this.append(navBg);

		this.createAppSection();
	}

	/**
	 * Creates the app section with title and icons
	 */
	private createAppSection(): void {
		const titleLayout = this.layout.children!.title;
		const iconLayout = this.layout.children!.icon;

		// App section title
		const appTitle = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: "white",
			}),
			text: "アプリ",
			x: this.layout.x + titleLayout.x,
			y: this.layout.y + titleLayout.y,
		});
		this.append(appTitle);

		// App icons
		const apps = [
			{ icon: "👤", name: "プロフィール", color: "#3498db" },
			{ icon: "🛒", name: "通販", color: "#2980b9" },
			{ icon: "🎮", name: "ソシャゲ", color: "#e74c3c", badge: "1" },
			{ icon: "🛍️", name: "フリマ", color: "#7f8c8d" },
		];

		apps.forEach((app, index) => {
			const appX = this.layout.x + iconLayout.x + (index * 180);
			const appY = this.layout.y + iconLayout.y;
			this.createAppIcon(app.icon, app.name, app.color, app.badge, appX, appY);
		});
	}

	/**
	 * Creates a single app icon
	 */
	private createAppIcon(icon: string, name: string, color: string, badge: string | undefined, x: number, y: number): void {
		const iconChildrenLayout = this.layout.children!.icon.children!;
		const backgroundLayout = iconChildrenLayout.background;
		const iconLabelLayout = iconChildrenLayout.iconLabel;
		const badgeLayout = iconChildrenLayout.badge;
		const badgeLabelLayout = iconChildrenLayout.badgeLabel;
		const nameLabelLayout = iconChildrenLayout.nameLabel;

		// App icon background
		const iconBg = new g.FilledRect({
			scene: this.scene,
			width: backgroundLayout.width,
			height: backgroundLayout.height,
			x: x + backgroundLayout.x,
			y: y + backgroundLayout.y,
			cssColor: color,
			touchable: true,
		});
		this.append(iconBg);

		// Icon
		const iconLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
			}),
			text: icon,
			x: x + iconLabelLayout.x,
			y: y + iconLabelLayout.y,
		});
		this.append(iconLabel);

		// Badge (if present)
		if (badge) {
			const badgeBg = new g.FilledRect({
				scene: this.scene,
				width: badgeLayout.width,
				height: badgeLayout.height,
				x: x + badgeLayout.x,
				y: y + badgeLayout.y,
				cssColor: "#e74c3c",
			});
			this.append(badgeBg);

			const badgeLabel = new g.Label({
				scene: this.scene,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 12,
					fontColor: "white",
				}),
				text: badge,
				x: x + badgeLabelLayout.x,
				y: y + badgeLabelLayout.y,
			});
			this.append(badgeLabel);
		}

		// App name
		const nameLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: "white",
			}),
			text: name,
			x: x + nameLabelLayout.x,
			y: y + nameLabelLayout.y,
		});
		this.append(nameLabel);
	}
}
