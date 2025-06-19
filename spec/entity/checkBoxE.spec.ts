import { GameClient } from "@akashic/headless-akashic";
import { CheckBoxE, CheckBoxEParameterObject } from "../../src/entity/checkBoxE";

describe("CheckBoxE", () => {
	describe("class structure validation", () => {
		it("should support optional onChange callback", () => {
			const withCallback: CheckBoxEParameterObject = {
				scene: scene,
				name: "checkbox",
				width: 50,
				height: 50,
				imageAsset: {} as g.ImageAsset,
				onChange: jest.fn(),
			};

			const withoutCallback: CheckBoxEParameterObject = {
				scene: scene,
				name: "checkbox",
				width: 50,
				height: 50,
				imageAsset: {} as g.ImageAsset,
			};

			expect(withCallback.onChange).toBeDefined();
			expect(withoutCallback.onChange).toBeUndefined();
		});
	});

	describe("method interface validation", () => {
		it("should define checkbox-specific public methods", () => {
			// Test that the class has the expected public methods
			expect(typeof CheckBoxE.prototype.isChecked).toBe("function");
			// setChecked() and toggle() are now private and only accessible through ButtonE's onComplete mechanism
			// Protected methods are not testable from outside the class
		});

		it("should inherit ButtonE methods", () => {
			// Verify ButtonE methods are available through inheritance
			expect(typeof CheckBoxE.prototype.send).toBe("function");
		});
	});

	describe("functional integration", () => {
		let checkbox: CheckBoxE;
		let noRenderClient: GameClient<3>;
		let noRenderScene: g.Scene;
		let mockOnChange: jest.Mock;

		beforeEach(async () => {
			mockOnChange = jest.fn();
			noRenderClient = await gameContext.createPassiveGameClient();
			await gameContext.step();
			noRenderScene = new noRenderClient.g.Scene({ game: noRenderClient.game, name: "test" });
			noRenderClient.game.pushScene(noRenderScene);
			await noRenderClient.advanceUntil(() => noRenderClient.game.scene()!.name === "test");

			const mockImageAsset = noRenderClient.createDummyImageAsset({
				width: 200, // Total width for both frames
				height: 100,
			});

			const options: CheckBoxEParameterObject = {
				scene: noRenderScene,
				name: "testCheckbox",
				imageAsset: mockImageAsset,
				checked: false,
				onChange: mockOnChange,
			};

			checkbox = new CheckBoxE(options);
		});

		afterEach(() => {
			if (checkbox && !checkbox.destroyed) {
				checkbox.destroy();
			}
			jest.restoreAllMocks();
		});

		it("should create checkbox successfully with proper GameClient setup", () => {
			expect(checkbox.name).toBe("testCheckbox");
			expect(checkbox.msgArgs).toBe(true); // Next state is "checked"
			expect(checkbox.width).toBe(100); // Half of image width from constructor
			expect(checkbox.height).toBe(100);
			expect(checkbox.isChecked()).toBe(false);
		});

		it("should inherit ButtonE functionality", () => {
			expect(checkbox._pressed).toBe(false);
			expect(checkbox._sync).toBe("idle");
			expect(checkbox.onPress).toBeDefined();
			expect(checkbox.onSync).toBeDefined();
			expect(typeof checkbox.send).toBe("function");
		});

		it("should handle checkbox state changes via onComplete handler", () => {
			// Test initial state
			expect(checkbox.isChecked()).toBe(false);

			// Test state change via onComplete handler (only way to change state)
			const onCompleteHandler = checkbox._onCompleteHandler;
			if (onCompleteHandler) {
				onCompleteHandler(checkbox.msgArgs);
			}
			expect(checkbox.isChecked()).toBe(true);
			expect(mockOnChange).toHaveBeenCalledWith(true);
			expect(checkbox.msgArgs).toBe(false); // Next state should be "unchecked"

			// Test toggle via onComplete handler again
			mockOnChange.mockClear();
			if (onCompleteHandler) {
				onCompleteHandler(checkbox.msgArgs);
			}
			expect(checkbox.isChecked()).toBe(false);
			expect(mockOnChange).toHaveBeenCalledWith(false);
		});

		it("should have onComplete handler that calls toggle", () => {
			expect(checkbox.isChecked()).toBe(false);

			// Get the onComplete handler from ButtonE
			const onCompleteHandler = checkbox._onCompleteHandler;
			expect(onCompleteHandler).toBeDefined();

			// Call the onComplete handler directly (simulates button action completion)
			if (onCompleteHandler) {
				onCompleteHandler(checkbox.msgArgs);
			}

			// Should have toggled the checkbox
			expect(checkbox.isChecked()).toBe(true);
			expect(mockOnChange).toHaveBeenCalledWith(true);
		});

		it("should fire onChange trigger when state changes", () => {
			let triggerFired = false;
			let triggerValue = false;

			checkbox.onChange.add((checked: boolean) => {
				triggerFired = true;
				triggerValue = checked;
			});

			// Trigger state change via onComplete handler (only way to change state)
			const onCompleteHandler = checkbox._onCompleteHandler;
			if (onCompleteHandler) {
				onCompleteHandler(checkbox.msgArgs);
			}

			expect(triggerFired).toBe(true);
			expect(triggerValue).toBe(true);
		});

		it("should darken checkbox during sending sync state", () => {
			// Get the frame sprite to test visual changes
			const frameSprite = checkbox.children![0] as g.FrameSprite;
			expect(frameSprite.opacity).toBe(1.0); // Initial opacity

			// Test the onSyncStateChange method directly to verify visual changes
			(checkbox as any).onSyncStateChange("sending");
			expect(frameSprite.opacity).toBe(0.6); // Darkened during sending

			(checkbox as any).onSyncStateChange("received");
			expect(frameSprite.opacity).toBe(1.0); // Back to normal opacity

			// Also test that the method is called during normal button flow
			const onSyncStateChangeSpy = jest.spyOn(checkbox as any, "onSyncStateChange");
			checkbox.send();
			expect(onSyncStateChangeSpy).toHaveBeenCalledWith("sending");
			expect(onSyncStateChangeSpy).toHaveBeenCalledWith("received");
		});
	});
});
