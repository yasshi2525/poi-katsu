import { adjustLabelWidthToFit } from "../util/labelUtils";
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
 * Banner context interface for accessing home functionality
 */
export interface BannerContext {
	addScore: (points: number, source: string, description: string) => void;
	executeTask: (taskId: string) => void;
	switchToShop: () => void;
}

/**
 * Banner data interface
 */
export interface BannerData {
	id: string;
	priority: number;
	enabled: boolean;
	title: string;
	subtitle: string;
	saleTag: string;
	backgroundColor: string;
	titleColor: string;
	subtitleColor: string;
	saleTagColor: string;
	clickHandler: (context: BannerContext) => void;
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
	/** Banner context for accessing home functionality */
	bannerContext: BannerContext;
}

/**
 * Banner section component that displays promotional banners
 */
export class AdBannerE extends g.E {
	private readonly multi: boolean;
	private banners: BannerData[];
	private readonly layout: LayoutConfig;
	private currentBannerItem?: BannerItem;
	private readonly bannerContext: BannerContext;

	/**
	 * Creates a new AdBanner instance
	 * @param options Configuration options for the ad banner
	 */
	constructor(options: AdBannerParameterObject) {
		super(options);

		this.multi = options.multi;
		this.banners = options.banners;
		this.bannerContext = options.bannerContext;
		this.layout = this.createLayoutConfig(options.width, options.height);

		// Show the highest priority banner initially
		this.showTopPriorityBanner();
	}

	/**
	 * Switches to the next priority banner among enabled banners
	 * @param currentBannerId Current banner ID to find the next one
	 */
	switchToNextBanner(currentBannerId?: string): void {
		const enabledBanners = this.getEnabledBanners()
			.sort((a, b) => a.priority - b.priority);

		if (enabledBanners.length === 0) {
			// No enabled banners, hide current banner
			this.hideBanner();
			return;
		}

		if (!currentBannerId) {
			// Show first enabled banner if no current banner
			this.showBanner(enabledBanners[0]);
			return;
		}

		const currentIndex = enabledBanners.findIndex(b => b.id === currentBannerId);
		const nextIndex = (currentIndex + 1) % enabledBanners.length;
		const nextBanner = enabledBanners[nextIndex];

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
	 * Sets the enabled state of a specific banner
	 * @param bannerId The ID of the banner to enable/disable
	 * @param enabled Whether the banner should be enabled
	 */
	setBannerEnabled(bannerId: string, enabled: boolean): void {
		const banner = this.banners.find(b => b.id === bannerId);
		if (banner) {
			banner.enabled = enabled;

			// If current banner was disabled, switch to next enabled banner
			if (!enabled && this.currentBannerItem?.bannerData.id === bannerId) {
				this.showNextEnabledBanner();
			} else if (enabled && !this.currentBannerItem) {
				// If a banner was enabled and no banner is currently displayed, show it
				this.showBanner(banner);
			}
			// Note: When enabling a banner while another is displayed, we don't change the current display
		}
	}

	/**
	 * Gets all enabled banners
	 * @returns Array of enabled banners
	 */
	private getEnabledBanners(): BannerData[] {
		return this.banners.filter(banner => banner.enabled);
	}

	/**
	 * Shows the next enabled banner with highest priority
	 */
	private showNextEnabledBanner(): void {
		const enabledBanners = this.getEnabledBanners()
			.sort((a, b) => a.priority - b.priority);

		if (enabledBanners.length > 0) {
			this.hideBanner();
			this.showBanner(enabledBanners[0]);
		} else {
			// No enabled banners, hide current banner
			this.hideBanner();
		}
	}

	/**
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, _screenHeight: number): LayoutConfig {
		return {
			x: 20, // Match TaskListE item margin for left block alignment
			y: 149, // Below header(69) + item list(60) + margin(20) = 149
			width: screenWidth - 760, // Match TaskListE item width (with margins)
			height: 80,
			children: {
				saleTag: {
					x: screenWidth - 880, // Adjusted for new width (screenWidth - 760 - 120 = screenWidth - 880)
					y: -10,
					width: 120,
					height: 30,
					children: {
						label: { x: 5, y: 5, width: 110, height: 20 }
					}
				},
				title: { x: 20, y: 10, width: 300, height: 24 },
				subtitle: { x: 20, y: 45, width: 300, height: 16 }
			}
		};
	}

	/**
	 * Shows the banner with the highest priority (lowest priority number) among enabled banners
	 */
	private showTopPriorityBanner(): void {
		const enabledBanners = this.getEnabledBanners();
		if (enabledBanners.length === 0) return;

		// Sort enabled banners by priority (ascending) and take the first one
		const topBanner = enabledBanners
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
				size: 16,
				fontColor: "white",
			}),
			text: banner.saleTag,
			x: saleTagLayout.x + saleTagLayout.children!.label.x,
			y: saleTagLayout.y + saleTagLayout.children!.label.y,
		});
		adjustLabelWidthToFit(saleLabel, saleTag.width - 10);
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
					// Execute banner click handler
					bannerData.clickHandler(this.bannerContext);

					// Auto-disable current banner and switch to next
					this.setBannerEnabled(bannerId, false);
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
