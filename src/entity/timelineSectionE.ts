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
 * Parameter object for TimelineSection
 */
export interface TimelineSectionParameterObject extends g.EParameterObject {
	/** Screen width */
	width: number;
	/** Screen height */
	height: number;
}

/**
 * Timeline section component that displays timeline items
 */
export class TimelineSectionE extends g.E {
	private readonly layout: LayoutConfig;

	/**
	 * Creates a new TimelineSection instance
	 * @param options Configuration options for the timeline section
	 */
	constructor(options: TimelineSectionParameterObject) {
		super(options);

		this.layout = this.createLayoutConfig(options.width, options.height);
		this.createLayout();
	}

	/**
	 * Creates the layout configuration object
	 */
	private createLayoutConfig(screenWidth: number, screenHeight: number): LayoutConfig {
		return {
			x: screenWidth - 720, // Fixed internal positioning
			y: 85, // Fixed internal positioning
			width: 700,
			height: screenHeight - 265,
			children: {
				header: {
					x: 0,
					y: 0,
					width: 700,
					height: 35,
					children: {
						title: { x: 0, y: 0, width: 150, height: 20 },
						updateBtn: { x: 650, y: 3, width: 50, height: 14 }
					}
				},
				item: {
					x: 0,
					y: 35,
					width: 700,
					height: 70,
					children: {
						avatar: { x: 0, y: 0, width: 40, height: 40 },
						userName: { x: 50, y: 5, width: 150, height: 14 },
						actionText: { x: 50, y: 25, width: 600, height: 12 },
						likeBtn: { x: 50, y: 45, width: 50, height: 12 },
						commentBtn: { x: 120, y: 45, width: 70, height: 12 }
					}
				}
			}
		};
	}

	/**
	 * Creates the overall layout structure
	 */
	private createLayout(): void {
		this.createHeader();
		this.createTimelineItems();
	}

	/**
	 * Creates the timeline header
	 */
	private createHeader(): void {
		const headerLayout = this.layout.children!.header;
		const titleLayout = headerLayout.children!.title;
		const updateBtnLayout = headerLayout.children!.updateBtn;

		// Timeline header
		const timelineTitle = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 20,
				fontColor: "white",
			}),
			text: "タイムライン",
			x: this.layout.x + titleLayout.x,
			y: this.layout.y + titleLayout.y,
		});
		this.append(timelineTitle);

		const updateBtn = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "#3498db",
			}),
			text: "更新",
			x: this.layout.x + updateBtnLayout.x,
			y: this.layout.y + updateBtnLayout.y,
			touchable: true,
		});
		this.append(updateBtn);
	}

	/**
	 * Creates timeline items
	 */
	private createTimelineItems(): void {
		const timelineItems = [
			{ user: "ユーザー1", action: "マンガ全巻セット買いました！", reactions: { like: true, comment: true } },
			{ user: "ユーザー2", action: "小説の予約を探しています。元ってくれる方いませんか？", reactions: { like: true, comment: true } },
			{ user: "[公式] ポイ活ウォーズ", action: "本日限定！通販で使える20%ポイント還元キャンペーン実施中！", reactions: { like: true, comment: true } },
			{ user: "ユーザー3", action: "ガチャで大当たり！レアアイテムゲットしました！", reactions: { like: true, comment: true } },
			{ user: "ユーザー4", action: "フリマで小説セットを出品しました！お得な価格です。", reactions: { like: true, comment: true } },
			{ user: "ユーザー5", action: "アフィリエイトで今月1000pt稼ぎました！", reactions: { like: true, comment: true } },
			{ user: "ユーザー6", action: "今日のログインボーナス受け取りました！", reactions: { like: true, comment: true } },
		];

		timelineItems.forEach((item, index) => {
			const itemY = this.layout.y + this.layout.children!.item.y + (index * 70);
			this.createTimelineItem(item.user, item.action, item.reactions, this.layout.x, itemY);
		});
	}

	/**
	 * Creates a single timeline item
	 */
	private createTimelineItem(user: string, action: string, reactions: any, x: number, y: number): void {
		const itemLayout = this.layout.children!.item;
		const avatarLayout = itemLayout.children!.avatar;
		const userNameLayout = itemLayout.children!.userName;
		const actionTextLayout = itemLayout.children!.actionText;
		const likeBtnLayout = itemLayout.children!.likeBtn;
		const commentBtnLayout = itemLayout.children!.commentBtn;

		// User avatar (circle)
		const avatar = new g.FilledRect({
			scene: this.scene,
			width: avatarLayout.width,
			height: avatarLayout.height,
			x: x + avatarLayout.x,
			y: y + avatarLayout.y,
			cssColor: "#ecf0f1",
		});
		this.append(avatar);

		// User name
		const userName = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 14,
				fontColor: "#2c3e50",
				fontWeight: "bold",
			}),
			text: user,
			x: x + userNameLayout.x,
			y: y + userNameLayout.y,
		});
		this.append(userName);

		// Action text
		const actionText = new g.Label({
			scene: this.scene,
			font: new g.DynamicFont({
				game: this.scene.game,
				fontFamily: "sans-serif",
				size: 12,
				fontColor: "#34495e",
			}),
			text: action,
			x: x + actionTextLayout.x,
			y: y + actionTextLayout.y,
			width: actionTextLayout.width,
		});
		this.append(actionText);

		// Reaction buttons
		if (reactions.like) {
			const likeBtn = new g.Label({
				scene: this.scene,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 12,
					fontColor: "#3498db",
				}),
				text: "いいね",
				x: x + likeBtnLayout.x,
				y: y + likeBtnLayout.y,
				touchable: true,
			});
			this.append(likeBtn);
		}

		if (reactions.comment) {
			const commentBtn = new g.Label({
				scene: this.scene,
				font: new g.DynamicFont({
					game: this.scene.game,
					fontFamily: "sans-serif",
					size: 12,
					fontColor: "#95a5a6",
				}),
				text: "コメント",
				x: x + commentBtnLayout.x,
				y: y + commentBtnLayout.y,
				touchable: true,
			});
			this.append(commentBtn);
		}
	}
}
