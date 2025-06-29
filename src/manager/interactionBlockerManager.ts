/**
 * ユーザー操作制御を管理する専用クラス
 * 複数のコンポーネントからの禁止要求を管理し、すべてが解除されるまでオーバーレイを維持する
 */
export class InteractionBlockerManager {
	private scene: g.Scene;
	private activeBlockers: Set<string> = new Set();
	private overlay?: g.E;
	private readonly screenWidth: number;
	private readonly screenHeight: number;

	/**
	 * InteractionBlockerManager を作成
	 * @param scene 対象シーン
	 * @param screenWidth 画面幅
	 * @param screenHeight 画面高さ
	 */
	constructor(scene: g.Scene, screenWidth: number, screenHeight: number) {
		this.scene = scene;
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;
	}

	/**
	 * ユーザー操作を禁止する
	 * @param blockerId 禁止要求を識別するユニークID
	 * @param reason 禁止理由（互換性のため残存、現在未使用）
	 */
	blockInteraction(blockerId: string, reason?: string): void {
		this.activeBlockers.add(blockerId);

		// オーバーレイがまだ存在しない場合のみ作成
		if (!this.overlay) {
			this.createOverlay();
		}
	}

	/**
	 * ユーザー操作の禁止を解除する
	 * @param blockerId 禁止要求を識別するユニークID
	 */
	unblockInteraction(blockerId: string): void {
		this.activeBlockers.delete(blockerId);

		// すべての禁止要求が解除された場合のみオーバーレイを削除
		if (this.activeBlockers.size === 0 && this.overlay) {
			this.removeOverlay();
		}
	}

	/**
	 * 特定の禁止要求が有効かどうかを確認
	 * @param blockerId 確認したい禁止要求ID
	 * @returns 有効な場合true
	 */
	isBlocked(blockerId: string): boolean {
		return this.activeBlockers.has(blockerId);
	}

	/**
	 * 何らかの禁止要求が有効かどうかを確認
	 * @returns 何らかの禁止要求が有効な場合true
	 */
	isAnyBlocked(): boolean {
		return this.activeBlockers.size > 0;
	}

	/**
	 * 現在の禁止要求一覧を取得（デバッグ用）
	 * @returns 有効な禁止要求IDの配列
	 */
	getActiveBlockers(): string[] {
		return Array.from(this.activeBlockers);
	}

	/**
	 * すべての禁止要求を強制解除（緊急時用）
	 */
	forceUnblockAll(): void {
		console.warn(`[InteractionBlocker] Force unblocking all ${this.activeBlockers.size} active blockers`);
		this.activeBlockers.clear();
		if (this.overlay) {
			this.removeOverlay();
		}
	}

	/**
	 * オーバーレイを作成してユーザー操作を禁止
	 */
	private createOverlay(): void {
		if (this.overlay) {
			return; // 既に存在する場合は何もしない
		}

		this.overlay = new g.E({
			scene: this.scene,
			width: this.screenWidth,
			height: this.screenHeight,
			x: 0,
			y: 0,
			touchable: true,
			local: true
		});

		// 透明な背景を追加してすべてのタッチイベントを吸収
		const background = new g.FilledRect({
			scene: this.scene,
			width: this.screenWidth,
			height: this.screenHeight,
			x: 0,
			y: 0,
			cssColor: "rgba(0, 0, 0, 0.01)", // ほぼ透明だが判定可能
		});

		this.overlay.append(background);
		this.scene.append(this.overlay);
	}

	/**
	 * オーバーレイを削除してユーザー操作を許可
	 */
	private removeOverlay(): void {
		if (this.overlay) {
			this.overlay.destroy();
			this.overlay = undefined;
		}
	}
}
