import { Timeline } from "@akashic-extension/akashic-timeline";

/**
 * Animation configuration constants
 */
const ANIMATION_CONFIG = {
	SHOP_FADE_IN_DURATION: 600,
	SHOP_HIGHLIGHT_DURATION: 1000,
	SHOP_HIGHLIGHT_SCALE: 1.1,
	SHOP_HIGHLIGHT_OPACITY: 0.8,
} as const;

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
 * App configuration interface
 */
interface AppConfig {
	icon: string;
	name: string;
	color: string;
	badge?: string;
	visible?: boolean;
}

/**
 * Parameter object for AppList
 */
export interface AppListParameterObject extends g.EParameterObject {
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Callback when shop app is clicked */
	onShopClick?: () => void;
}

/**
 * App navigation section component that displays app icons
 */
export class AppListE extends g.E {
	private readonly layout: LayoutConfig;
	private readonly onShopClick?: () => void;
	private readonly apps: AppConfig[];
	private shopAppElements: g.E[] = [];
	private shopAppVisible: boolean = false;

	/**
	 * Creates a new AppList instance
	 * @param options Configuration options for the app list
	 */
	constructor(options: AppListParameterObject) {
		super(options);

		this.onShopClick = options.onShopClick;
		this.layout = this.createLayoutConfig(options.width, options.height);

		// Initialize apps configuration
		this.apps = [
			{ icon: "👤", name: "プロフィール", color: "#3498db", visible: true },
			{ icon: "🛒", name: "通販", color: "#2980b9", visible: false }, // Initially hidden
			{ icon: "🎮", name: "ソシャゲ", color: "#e74c3c", badge: "1", visible: true },
			{ icon: "🛍️", name: "フリマ", color: "#7f8c8d", visible: true },
		];

		this.createLayout();
	}

	/**
	 * Reveals the shop app with animation
	 */
	revealShopApp(): void {
		if (this.shopAppVisible) return;

		// Update app visibility state
		const shopApp = this.apps.find(app => app.name === "通販");
		if (shopApp) {
			shopApp.visible = true;
			this.shopAppVisible = true;
		}

		// Create the shop app icon (index 1 for shop)
		const iconLayout = this.layout.children!.icon;
		const appX = this.layout.x + iconLayout.x + (1 * 180); // Shop is at index 1
		const appY = this.layout.y + iconLayout.y;

		this.createAppIcon(shopApp!, appX, appY, 1);

		// Start with opacity 0 for fade-in effect
		this.shopAppElements.forEach(element => {
			element.opacity = 0;
		});

		// Add fade-in animation
		const timeline = new Timeline(this.scene);
		this.shopAppElements.forEach(element => {
			timeline.create(element)
				.to({ opacity: 1 }, ANIMATION_CONFIG.SHOP_FADE_IN_DURATION);
		});

		// Add highlighting effect after fade-in
		timeline.create(this)
			.wait(ANIMATION_CONFIG.SHOP_FADE_IN_DURATION)
			.call(() => {
				this.highlightShopApp();
			});
	}

	/**
	 * Highlights the shop app with a special effect and automatically opens shop
	 */
	highlightShopApp(): void {
		if (!this.shopAppVisible) return;

		// Create highlighting animation with scale and opacity pulsing
		const timeline = new Timeline(this.scene);
		const shopIconBg = this.shopAppElements[0]; // First element is the icon background

		if (shopIconBg) {
			// Pulse animation: scale up and fade out, then back to normal
			timeline.create(shopIconBg)
				.to({
					scaleX: ANIMATION_CONFIG.SHOP_HIGHLIGHT_SCALE,
					scaleY: ANIMATION_CONFIG.SHOP_HIGHLIGHT_SCALE,
					opacity: ANIMATION_CONFIG.SHOP_HIGHLIGHT_OPACITY
				}, ANIMATION_CONFIG.SHOP_HIGHLIGHT_DURATION / 2)
				.to({
					scaleX: 1,
					scaleY: 1,
					opacity: 1
				}, ANIMATION_CONFIG.SHOP_HIGHLIGHT_DURATION / 2)
				.call(() => {
					// Automatically trigger shop click after highlighting animation ends
					if (this.onShopClick) {
						this.onShopClick();
					}
				});
		}
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

		// Create visible app icons
		this.apps.forEach((app, index) => {
			if (app.visible) {
				const appX = this.layout.x + iconLayout.x + (index * 180);
				const appY = this.layout.y + iconLayout.y;
				this.createAppIcon(app, appX, appY, index);
			}
		});
	}

	/**
	 * Creates a single app icon
	 */
	private createAppIcon(app: AppConfig, x: number, y: number, appIndex: number): void {
		const iconChildrenLayout = this.layout.children!.icon.children!;
		const backgroundLayout = iconChildrenLayout.background;
		const iconLabelLayout = iconChildrenLayout.iconLabel;
		const badgeLayout = iconChildrenLayout.badge;
		const badgeLabelLayout = iconChildrenLayout.badgeLabel;
		const nameLabelLayout = iconChildrenLayout.nameLabel;

		// Container for this app's elements
		const appContainer = new g.E({
			scene: this.scene,
			x: 0,
			y: 0,
		});

		// App icon background
		const iconBg = new g.FilledRect({
			scene: this.scene,
			width: backgroundLayout.width,
			height: backgroundLayout.height,
			x: x + backgroundLayout.x,
			y: y + backgroundLayout.y,
			cssColor: app.color,
			touchable: true,
		});

		// Add click handler for shop app
		if (app.name === "通販") {
			iconBg.onPointDown.add(() => {
				if (this.onShopClick) {
					this.onShopClick();
				}
			});
		}

		appContainer.append(iconBg);

		// Icon
		const iconLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
			}),
			text: app.icon,
			x: x + iconLabelLayout.x,
			y: y + iconLabelLayout.y,
		});
		appContainer.append(iconLabel);

		// Badge (if present)
		if (app.badge) {
			const badgeBg = new g.FilledRect({
				scene: this.scene,
				width: badgeLayout.width,
				height: badgeLayout.height,
				x: x + badgeLayout.x,
				y: y + badgeLayout.y,
				cssColor: "#e74c3c",
			});
			appContainer.append(badgeBg);

			const badgeLabel = new g.Label({
				scene: this.scene,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 12,
					fontColor: "white",
				}),
				text: app.badge,
				x: x + badgeLabelLayout.x,
				y: y + badgeLabelLayout.y,
			});
			appContainer.append(badgeLabel);
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
			text: app.name,
			x: x + nameLabelLayout.x,
			y: y + nameLabelLayout.y,
		});
		appContainer.append(nameLabel);

		// Store shop app elements for later manipulation
		if (app.name === "通販") {
			this.shopAppElements = [iconBg, iconLabel, nameLabel];
			if (app.badge) {
				// Add badge elements if they exist
				this.shopAppElements.push(appContainer.children![appContainer.children!.length - 2]); // badgeBg
				this.shopAppElements.push(appContainer.children![appContainer.children!.length - 1]); // badgeLabel before nameLabel
			}
		}

		this.append(appContainer);
	}
}
