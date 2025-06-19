import { AgreementE, AgreementEParameterObject } from "../../src/entity/agreementE";
import { CheckBoxE } from "../../src/entity/checkBoxE";
import { ModalE } from "../../src/entity/modalE";
import { PanelE } from "../../src/entity/panelE";

describe("AgreementE", () => {
	let agreement: AgreementE;
	let mockOnComplete: jest.Mock;

	beforeEach(() => {
		mockOnComplete = jest.fn();
	});

	afterEach(() => {
		if (agreement) {
			agreement.destroy();
		}
	});

	describe("constructor", () => {
		it("should create agreement with required options", () => {
			const options: AgreementEParameterObject = {
				scene: scene,
				onComplete: mockOnComplete,
			};

			agreement = new AgreementE(options);

			expect(agreement.width).toBe(g.game.width);
			expect(agreement.height).toBe(g.game.height);
			expect(agreement.children).toHaveLength(1); // Modal
		});

		it("should create agreement without onComplete handler", () => {
			const options: AgreementEParameterObject = {
				scene: scene,
			};

			agreement = new AgreementE(options);

			expect(agreement.children).toHaveLength(1); // Modal
		});
	});

	describe("modal content", () => {
		beforeEach(() => {
			const options: AgreementEParameterObject = {
				scene: scene,
				onComplete: mockOnComplete,
			};

			agreement = new AgreementE(options);
		});

		it("should display agreement modal with correct title", () => {
			const modal = agreement.children![0] as ModalE<undefined>;
			const titleLabel = modal.content.children!.find(child =>
				child instanceof g.Label && (child as g.Label).text === "サービス利用開始"
			) as g.Label;

			expect(titleLabel).toBeDefined();
			expect(titleLabel.text).toBe("サービス利用開始");
		});

		it("should display agreement text content", () => {
			const modal = agreement.children![0] as ModalE<undefined>;
			const messageLabel = modal.content.children!.find(child =>
				child instanceof g.Label
				&& (child as g.Label).text.includes("本サービスは、ポイント活動を通じて")
			) as g.Label;
			expect(messageLabel).toBeDefined();
		});
	});

	describe("button interactions", () => {
		beforeEach(() => {
			const options: AgreementEParameterObject = {
				scene: scene,
				onComplete: mockOnComplete,
			};

			agreement = new AgreementE(options);
		});

		it("should handle agree button click", () => {
			const modal = agreement.children![0] as ModalE<undefined>;
			const checkBox = modal.content.children!.find(child => child instanceof CheckBoxE) as CheckBoxE;

			const agreeButton = modal.content.children!.find(child =>
				child.children && child.children.length > 1
				&& child.children[1] instanceof g.Label
				&& (child.children[1] as g.Label).text === "同意する"
			);

			expect(agreeButton).toBeDefined();

			// Simulate button press and release
			checkBox!.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: checkBox!,
				type: "down",
			} as any);

			checkBox!.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: checkBox!,
				type: "up",
			} as any);

			agreeButton!.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: agreeButton!,
				type: "down",
			} as any);

			agreeButton!.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: agreeButton!,
				type: "up",
			} as any);

			expect(agreement.isAgreed()).toBe(true);
		});
	});

	describe("agreement status", () => {
		beforeEach(() => {
			const options: AgreementEParameterObject = {
				scene: scene,
				onComplete: mockOnComplete,
			};

			agreement = new AgreementE(options);
		});

		it("should provide agreement status method", () => {
			expect(typeof agreement.isAgreed).toBe("function");
			expect(agreement.isAgreed()).toBe(false);
		});
	});

	describe("completion flow", () => {
		it("should not crash when no onComplete handler is provided", () => {
			const options: AgreementEParameterObject = {
				scene: scene,
				// No onComplete handler
			};

			expect(() => {
				agreement = new AgreementE(options);
			}).not.toThrow();
		});
	});

	describe("inheritance behavior", () => {
		beforeEach(() => {
			const options: AgreementEParameterObject = {
				scene: scene,
				onComplete: mockOnComplete,
			};

			agreement = new AgreementE(options);
		});

		it("should extend g.E correctly", () => {
			expect(agreement).toBeInstanceOf(g.E);
		});

		it("should have proper scene association", () => {
			expect(agreement.scene).toBe(scene);
		});
	});
});
