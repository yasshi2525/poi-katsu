import { Easing, Timeline } from "@akashic-extension/akashic-timeline";
import { POINT_CONSTANTS } from "../manager/pointManager";
import { CheckBoxE } from "./checkBoxE";
import { ModalE } from "./modalE";

const config = {
	popup: { duration: 500 }
};

/**
 * Parameter object for AgreementE
 */
export interface AgreementEParameterObject extends g.EParameterObject {
	/** Whether multiplayer mode or not */
	multi: boolean;
	/** Callback function when agreement is completed */
	onComplete?: () => void;
	/** Callback function to award points */
	onPointsAwarded?: (points: number) => void;
}

/**
 * Agreement entity for the initial task
 * Displays service agreement modal and handles user acceptance
 */
export class AgreementE extends g.E {
	static assetIds: string[] = [...ModalE.assetIds, "checkbox-agreement"];
	private readonly multi: boolean;
	private checkBox!: CheckBoxE;
	private modal!: ModalE<undefined>;
	private agreementText: string;
	private onCompleteHandler?: () => void;
	private onPointsAwardedHandler?: (points: number) => void;

	/**
	 * Creates a new AgreementE instance
	 * @param options Configuration options for the agreement
	 */
	constructor(options: AgreementEParameterObject) {
		super({
			scene: options.scene,
			width: options.scene.game.width,
			height: options.scene.game.height,
		});

		this.multi = options.multi;
		this.onCompleteHandler = options.onComplete;
		this.onPointsAwardedHandler = options.onPointsAwarded;
		this.agreementText = this.createAgreementText();
		this.createAgreementModal();
	}

	/**
	 * Gets the current agreement status
	 * @returns Whether the user has agreed to the service
	 */
	public isAgreed(): boolean {
		return this.checkBox.isChecked();
	}

	/**
	 * Creates the agreement text content
	 * @returns The agreement text to display
	 */
	private createAgreementText(): string {
		return `本サービスは、ポイント活動を通じてポイントを獲得するサービスです。
以下の活動でポイントが獲得できます：
• SNS連携・広告タップ • 通販での商品購入 • アフィリエイト
サービスを利用することで、他のプレイヤーと競ってポイントを稼ぐことができます。`;
	}

	/**
	 * Creates the agreement modal dialog
	 */
	private createAgreementModal(): void {
		const checkBoxAsset = this.scene.asset.getImageById("checkbox-agreement");

		this.modal = new ModalE({
			scene: this.scene,
			multi: this.multi,
			name: "agreement-modal",
			args: undefined,
			title: "サービス利用開始",
			message: this.agreementText,
			width: checkBoxAsset.width / 2 + 200, // Adjust width to fit checkbox and text
			height: 520,
			onClose: () => {
				this.handleAgreement();
			}
		});

		this.modal.overlay.touchable = false; // Force user to interact with modal content
		this.modal.closeButton.touchable = false; // Without agreement, close button is disabled
		this.modal.closeButton.setBackgroundColor("#616161"); // Change close button color to indicate it's disabled

		this.checkBox = new CheckBoxE({
			scene: this.scene,
			multi: this.multi,
			name: "agreement-checkbox",
			imageAsset: checkBoxAsset,
			x: this.modal.content.width / 2,
			y: this.modal.content.height - 150,
			anchorX: 0.5,
			anchorY: 1,
			onChange: (checked) => {
				// Enable close button when checkbox is checked
				if (checked) {
					this.modal.closeButton.touchable = true;
					this.modal.closeButton.setBackgroundColor("#0288d1");  // Change button color back to normal
					this.modal.closeButton.setTextColor("white");
				} else {
					this.modal.closeButton.touchable = false;
					this.modal.closeButton.setBackgroundColor("#616161"); // Disable button color
				}
			}
		});
		this.modal.content.append(this.checkBox);

		// Close button is now used for agreement
		this.modal.closeButton.setText("同意する");

		// pop up animation for the modal content
		this.modal.content.scale(0);
		this.modal.content.modified();
		new Timeline(this.scene).create(this.modal.content)
			.scaleTo(1, 1, config.popup.duration, Easing.easeInOutCirc);
		this.append(this.modal);
	}

	/**
	 * Handles when user agrees to the service
	 */
	private handleAgreement(): void {
		// Show success message
		this.showSuccessMessage();
	}

	/**
	 * Shows success message after agreement
	 */
	private showSuccessMessage(): void {
		// Remove the agreement modal
		this.modal.destroy();

		// Show success modal with initial points
		const successModal = new ModalE({
			scene: this.scene,
			multi: this.multi,
			name: "success",
			args: undefined,
			title: "ようこそ！",
			message: `ポイ活サービスへようこそ！
初回登録ボーナスとして${POINT_CONSTANTS.TASK_AGREEMENT_REWARD}ポイントを獲得しました！
ホーム画面から様々な機能を利用してポイントを稼ぎましょう！`,
			width: 450,
			height: 400,
			onClose: () => {
				// Complete the initial task
				this.completeTask();
			}
		});

		this.append(successModal);
	}

	/**
	 * Completes the initial task
	 */
	private completeTask(): void {
		// Award initial points using the configured constant
		this.awardInitialPoints(POINT_CONSTANTS.TASK_AGREEMENT_REWARD);

		// Call completion handler
		if (this.onCompleteHandler) {
			this.onCompleteHandler();
		}

		// Clean up
		this.destroy();
	}

	/**
	 * Awards initial points to the player
	 * @param points Number of points to award
	 */
	private awardInitialPoints(points: number): void {
		// Award points through the callback if provided
		if (this.onPointsAwardedHandler) {
			this.onPointsAwardedHandler(points);
		}
	}
}
