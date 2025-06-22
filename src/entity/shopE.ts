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
 * Parameter object for Shop
 */
export interface ShopParameterObject extends g.EParameterObject {
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
	/** Callback when back button is pressed */
	onBack?: () => void;
}

/**
 * Shop screen entity that displays shopping interface
 * Shows product listings, categories, and purchase options
 */
export class ShopE extends g.E {
	private readonly layout: LayoutConfig;
	private readonly onBack?: () => void;

	/**
	 * Creates a new Shop instance
	 * @param options Configuration options for the shop screen
	 */
	constructor(options: ShopParameterObject) {
		super(options);

		this.onBack = options.onBack;
		this.layout = this.createLayoutConfig(options.width, options.height);
		this.createLayout();
	}

	/**
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, screenHeight: number): LayoutConfig {
		return {
			x: 0,
			y: 80,
			width: screenWidth,
			height: screenHeight - 80,
			children: {
				header: {
					x: 0,
					y: 0,
					width: screenWidth,
					height: 80,
					children: {
						backButton: { x: 20, y: 20, width: 60, height: 40 },
						title: { x: screenWidth / 2 - 50, y: 25, width: 100, height: 30 }
					}
				},
				productGrid: {
					x: 20,
					y: 100,
					width: screenWidth - 40,
					height: screenHeight - 180,
					children: {
						product: {
							x: 0,
							y: 0,
							width: (screenWidth - 80) / 2,
							height: 200,
							children: {
								image: { x: 10, y: 10, width: 120, height: 120 },
								name: { x: 10, y: 140, width: 120, height: 20 },
								price: { x: 10, y: 165, width: 80, height: 20 },
								buyButton: { x: 95, y: 160, width: 45, height: 30 }
							}
						}
					}
				}
			}
		};
	}

	/**
	 * Creates the overall layout structure
	 */
	private createLayout(): void {
		// Background
		const background = new g.FilledRect({
			scene: this.scene,
			width: this.layout.width,
			height: this.layout.height,
			x: this.layout.x,
			y: this.layout.y,
			cssColor: "#ecf0f1",
		});
		this.append(background);

		this.createHeader();
		this.createProductGrid();
	}

	/**
	 * Creates the header with title and back button
	 */
	private createHeader(): void {
		const headerLayout = this.layout.children!.header;
		const backButtonLayout = headerLayout.children!.backButton;
		const titleLayout = headerLayout.children!.title;

		// Header background
		const headerBg = new g.FilledRect({
			scene: this.scene,
			width: headerLayout.width,
			height: headerLayout.height,
			x: this.layout.x + headerLayout.x,
			y: this.layout.y + headerLayout.y,
			cssColor: "#2c3e50",
		});
		this.append(headerBg);

		// Back button
		const backButton = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 16,
				fontColor: "white",
			}),
			text: "← 戻る",
			x: this.layout.x + backButtonLayout.x,
			y: this.layout.y + backButtonLayout.y,
			touchable: true,
		});
		backButton.onPointDown.add(() => {
			if (this.onBack) {
				this.onBack();
			}
		});
		this.append(backButton);

		// Title
		const title = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 24,
				fontColor: "white",
			}),
			text: "通販",
			x: this.layout.x + titleLayout.x,
			y: this.layout.y + titleLayout.y,
		});
		this.append(title);
	}

	/**
	 * Creates the product grid
	 */
	private createProductGrid(): void {
		const products = [
			{ name: "マンガ全巻セット", price: "2,980pt", image: "📚" },
			{ name: "小説シリーズ", price: "1,580pt", image: "📖" },
			{ name: "ゲーム攻略本", price: "890pt", image: "🎮" },
			{ name: "フィギュア", price: "3,980pt", image: "🎎" },
			{ name: "DVD/Blu-ray", price: "2,480pt", image: "💿" },
			{ name: "グッズセット", price: "1,280pt", image: "🎁" },
		];

		products.forEach((product, index) => {
			const row = Math.floor(index / 2);
			const col = index % 2;
			const productX = this.layout.children!.productGrid.x + (col * 160);
			const productY = this.layout.children!.productGrid.y + (row * 220);

			this.createProductCard(product, productX, productY);
		});
	}

	/**
	 * Creates a single product card
	 */
	private createProductCard(product: { name: string; price: string; image: string }, x: number, y: number): void {
		const productLayout = this.layout.children!.productGrid.children!.product;
		const imageLayout = productLayout.children!.image;
		const nameLayout = productLayout.children!.name;
		const priceLayout = productLayout.children!.price;
		const buyButtonLayout = productLayout.children!.buyButton;

		// Product card background
		const cardBg = new g.FilledRect({
			scene: this.scene,
			width: productLayout.width,
			height: productLayout.height,
			x: x,
			y: y,
			cssColor: "white",
		});
		this.append(cardBg);

		// Product image (emoji)
		const productImage = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 48,
			}),
			text: product.image,
			x: x + imageLayout.x + 30,
			y: y + imageLayout.y + 30,
		});
		this.append(productImage);

		// Product name
		const productName = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "#2c3e50",
			}),
			text: product.name,
			x: x + nameLayout.x,
			y: y + nameLayout.y,
		});
		this.append(productName);

		// Product price
		const productPrice = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: "#e74c3c",
			}),
			text: product.price,
			x: x + priceLayout.x,
			y: y + priceLayout.y,
		});
		this.append(productPrice);

		// Buy button
		const buyButton = new g.FilledRect({
			scene: this.scene,
			width: buyButtonLayout.width,
			height: buyButtonLayout.height,
			x: x + buyButtonLayout.x,
			y: y + buyButtonLayout.y,
			cssColor: "#27ae60",
			touchable: true,
		});
		this.append(buyButton);

		const buyButtonText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: "white",
			}),
			text: "購入",
			x: x + buyButtonLayout.x + 15,
			y: y + buyButtonLayout.y + 10,
		});
		this.append(buyButtonText);
	}
}
