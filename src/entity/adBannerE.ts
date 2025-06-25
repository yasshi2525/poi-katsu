import { LabelButtonE } from "./labelButtonE";

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
 * Banner data interface
 */
export interface BannerData {
	id: string;
	priority: number;
	title: string;
	subtitle: string;
	saleTag: string;
	backgroundColor: string;
	titleColor: string;
	subtitleColor: string;
	saleTagColor: string;
	clickHandler: () => void;
}

/**
 * Banner item visual components
 */
interface BannerItem {
	bannerData: BannerData;
	container: g.E;
	background: g.FilledRect;
	clickButton: LabelButtonE<string>;
	elements: g.E[];
}

/**
 * Parameter object for AdBanner
 */
export interface AdBannerParameterObject extends g.EParameterObject {
	/** Whether multiplayer mode or not */
	multi: boolean;
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Banner data array */
	banners: BannerData[];
}

/**
 * Banner section component that displays promotional banners
 */
export class AdBannerE extends g.E {
	private readonly multi: boolean;
	private readonly banners: BannerData[];
	private readonly layout: LayoutConfig;
	private currentBannerItem?: BannerItem;

	/**
	 * Creates a new AdBanner instance
	 * @param options Configuration options for the ad banner
	 */
	constructor(options: AdBannerParameterObject) {
		super(options);

		this.multi = options.multi;
		this.banners = options.banners;
		this.layout = this.createLayoutConfig(options.width, options.height);

		// Show the highest priority banner initially
		this.showTopPriorityBanner();
	}

	/**
	 * Switches to a specific banner by ID
	 * @param bannerId The ID of the banner to show
	 */
	switchToBanner(bannerId: string): void {
		const banner = this.banners.find(b => b.id === bannerId);
		if (banner) {
			this.hideBanner();
			this.showBanner(banner);
		}
	}

	/**
	 * Switches to the next priority banner
	 * @param currentBannerId Current banner ID to find the next one
	 */
	switchToNextBanner(currentBannerId?: string): void {
		const sortedBanners = this.banners
			.slice()
			.sort((a, b) => a.priority - b.priority);

		if (!currentBannerId) {
			// Show first banner if no current banner
			if (sortedBanners.length > 0) {
				this.showBanner(sortedBanners[0]);
			}
			return;
		}

		const currentIndex = sortedBanners.findIndex(b => b.id === currentBannerId);
		const nextIndex = (currentIndex + 1) % sortedBanners.length;
		const nextBanner = sortedBanners[nextIndex];

		this.hideBanner();
		this.showBanner(nextBanner);
	}

	/**
	 * Gets the current banner data
	 * @returns Current banner data or undefined if no banner is shown
	 */
	getCurrentBanner(): BannerData | undefined {
		return this.currentBannerItem?.bannerData;
	}

	/**
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, _screenHeight: number): LayoutConfig {
		return {
			x: 20,
			y: 80, // Fixed internal positioning
			width: screenWidth - 760,
			height: 120,
			children: {
				saleTag: {
					x: screenWidth - 760 - 100,
					y: -10,
					width: 120,
					height: 30,
					children: {
						label: { x: 5, y: 5, width: 110, height: 20 }
					}
				},
				title: { x: 20, y: 30, width: 300, height: 24 },
				subtitle: { x: 20, y: 65, width: 300, height: 16 }
			}
		};
	}

	/**
	 * Shows the banner with the highest priority (lowest priority number)
	 */
	private showTopPriorityBanner(): void {
		if (this.banners.length === 0) return;

		// Sort banners by priority (ascending) and take the first one
		const topBanner = this.banners
			.slice()
			.sort((a, b) => a.priority - b.priority)[0];

		this.showBanner(topBanner);
	}

	/**
	 * Shows a specific banner
	 * @param banner The banner data to display
	 */
	private showBanner(banner: BannerData): void {
		// Hide current banner if exists
		this.hideBanner();

		const saleTagLayout = this.layout.children!.saleTag;
		const titleLayout = this.layout.children!.title;
		const subtitleLayout = this.layout.children!.subtitle;

		// Create container for the banner
		const container = new g.E({
			scene: this.scene,
			x: this.layout.x,
			y: this.layout.y,
		});

		// Banner background
		const bannerBg = new g.FilledRect({
			scene: this.scene,
			width: this.layout.width,
			height: this.layout.height,
			x: 0,
			y: 0,
			cssColor: banner.backgroundColor,
		});
		container.append(bannerBg);

		// Sale tag
		const saleTag = new g.FilledRect({
			scene: this.scene,
			width: saleTagLayout.width,
			height: saleTagLayout.height,
			x: saleTagLayout.x,
			y: saleTagLayout.y,
			cssColor: banner.saleTagColor,
		});
		container.append(saleTag);

		const saleLabel = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: "white",
			}),
			text: banner.saleTag,
			x: saleTagLayout.x + saleTagLayout.children!.label.x,
			y: saleTagLayout.y + saleTagLayout.children!.label.y,
		});
		container.append(saleLabel);

		// Banner title
		const bannerTitle = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: banner.titleColor,
			}),
			text: banner.title,
			x: titleLayout.x,
			y: titleLayout.y,
		});
		container.append(bannerTitle);

		// Banner subtitle
		const bannerSubtitle = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: banner.subtitleColor,
			}),
			text: banner.subtitle,
			x: subtitleLayout.x,
			y: subtitleLayout.y,
		});
		container.append(bannerSubtitle);

		// Invisible button for click handling (covers entire banner)
		const clickButton = new LabelButtonE({
			scene: this.scene,
			multi: this.multi,
			name: `bannerClick_${banner.id}`,
			args: banner.id,
			width: this.layout.width,
			height: this.layout.height,
			x: 0,
			y: 0,
			text: "",
			backgroundColor: "transparent",
			textColor: "transparent",
			fontSize: 1,
			onComplete: (bannerId: string) => {
				const bannerData = this.banners.find(b => b.id === bannerId);
				if (bannerData) {
					bannerData.clickHandler();
				}
			},
		});
		container.append(clickButton);

		// Store banner item for management
		this.currentBannerItem = {
			bannerData: banner,
			container: container,
			background: bannerBg,
			clickButton: clickButton,
			elements: [saleTag, saleLabel, bannerTitle, bannerSubtitle]
		};

		this.append(container);
	}

	/**
	 * Hides the current banner
	 */
	private hideBanner(): void {
		if (this.currentBannerItem) {
			this.currentBannerItem.container.destroy();
			this.currentBannerItem = undefined;
		}
	}
}
