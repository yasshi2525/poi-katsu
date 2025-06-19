import { LabelButtonE, LabelButtonEParameterObject } from "../../src/entity/labelButtonE";

describe("LabelButtonE", () => {
	let button: LabelButtonE<number>;
	let mockOnComplete: jest.Mock;

	beforeEach(() => {
		mockOnComplete = jest.fn();
	});

	afterEach(() => {
		if (button) {
			button.destroy();
		}
	});

	describe("constructor", () => {
		it("should create label button with required options", () => {
			const options: LabelButtonEParameterObject<number> = {
				scene: scene,
				name: "testLabelButton",
				args: 42,
				width: 150,
				height: 40,
				text: "Click Me",
			};

			button = new LabelButtonE(options);

			expect(button.width).toBe(150);
			expect(button.height).toBe(40);
			expect(button.name).toBe("testLabelButton");
			expect(button.msgArgs).toBe(42);
			expect(button.children).toHaveLength(2); // Background + Label
		});

		it("should create label button with custom styling", () => {
			const options: LabelButtonEParameterObject<number> = {
				scene: scene,
				name: "testLabelButton",
				args: 42,
				width: 200,
				height: 50,
				text: "Custom Button",
				backgroundColor: "#FF5733",
				textColor: "black",
				fontSize: 20,
				fontFamily: "Arial",
			};

			button = new LabelButtonE(options);

			const background = button.children![0] as g.FilledRect;
			const label = button.children![1] as g.Label;

			expect(background.cssColor).toBe("#FF5733");
			expect(label.textColor).toBe("black");
			expect(label.fontSize).toBe(20);
			expect(label.text).toBe("Custom Button");
		});

		it("should use default styling when not specified", () => {
			const options: LabelButtonEParameterObject<number> = {
				scene: scene,
				name: "testLabelButton",
				args: 42,
				width: 150,
				height: 40,
				text: "Default",
			};

			button = new LabelButtonE(options);

			const background = button.children![0] as g.FilledRect;
			const label = button.children![1] as g.Label;

			expect(background.cssColor).toBe("#4A90E2"); // Default blue
			expect(label.textColor).toBe("white"); // Default white text
			expect(label.fontSize).toBe(16); // Default font size
		});
	});

	describe("visual state changes", () => {
		beforeEach(() => {
			const options: LabelButtonEParameterObject<number> = {
				scene: scene,
				name: "testLabelButton",
				args: 42,
				width: 150,
				height: 40,
				text: "Test Button",
				backgroundColor: "#4A90E2",
				onComplete: mockOnComplete,
			};

			button = new LabelButtonE(options);
		});

		it("should change background color when pressed", () => {
			const background = button.children![0] as g.FilledRect;
			expect(background.cssColor).toBe("#4A90E2"); // Normal state

			// Simulate press
			button.onPointDown.fire({
				player: null,
				point: { x: 75, y: 20 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			expect(background.cssColor).toBe("#357ABD"); // Pressed state (darker)
		});

		it("should revert background color when released", () => {
			const background = button.children![0] as g.FilledRect;

			// Just test press and release without triggering send
			button.onPointDown.fire({
				player: null,
				point: { x: 75, y: 20 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			expect(background.cssColor).toBe("#357ABD"); // Pressed state

			// Manually trigger pressed state change to false (simulating release without send)
			(button as any).pressed = false;
			(button as any).onPressedStateChange(false);

			expect(background.cssColor).toBe("#4A90E2"); // Back to normal
		});

		it("should change colors during sync states", () => {
			const background = button.children![0] as g.FilledRect;
			const label = button.children![1] as g.Label;

			// Trigger sending state (though in single player it goes straight to received)
			button.send();

			// Should show received state (green)
			expect(background.cssColor).toBe("#28A745");
			expect(label.textColor).toBe("white");
		});
	});

	describe("text positioning", () => {
		it("should center text horizontally", () => {
			const options: LabelButtonEParameterObject<number> = {
				scene: scene,
				name: "testLabelButton",
				args: 42,
				width: 200,
				height: 40,
				text: "Test",
				fontSize: 16,
			};

			button = new LabelButtonE(options);
			const label = button.children![1] as g.Label;

			// Text positioning calculation: (width - text.length * fontSize * 0.6) / 2
			const expectedX = (200 - 4 * 16 * 0.6) / 2; // 80.8
			expect(label.x).toBe(expectedX);
		});

		it("should center text vertically", () => {
			const options: LabelButtonEParameterObject<number> = {
				scene: scene,
				name: "testLabelButton",
				args: 42,
				width: 150,
				height: 60,
				text: "Test",
				fontSize: 20,
			};

			button = new LabelButtonE(options);
			const label = button.children![1] as g.Label;

			// Vertical centering: (height - fontSize) / 2
			const expectedY = (60 - 20) / 2; // 20
			expect(label.y).toBe(expectedY);
		});
	});

	describe("public methods", () => {
		beforeEach(() => {
			const options: LabelButtonEParameterObject<number> = {
				scene: scene,
				name: "testLabelButton",
				args: 42,
				width: 150,
				height: 40,
				text: "Original",
				backgroundColor: "#4A90E2",
				textColor: "white",
			};

			button = new LabelButtonE(options);
		});

		it("should update text and reposition", () => {
			const label = button.children![1] as g.Label;
			const originalX = label.x;

			button.setText("Much Longer Text That Will Change Position");

			expect(label.text).toBe("Much Longer Text That Will Change Position");
			expect(label.x).not.toBe(originalX); // Should be repositioned due to different length
		});

		it("should update background color", () => {
			const background = button.children![0] as g.FilledRect;

			button.setBackgroundColor("#FF0000");

			expect(background.cssColor).toBe("#FF0000");
		});

		it("should update text color", () => {
			const label = button.children![1] as g.Label;

			button.setTextColor("#00FF00");

			expect(label.textColor).toBe("#00FF00");
		});
	});

	describe("event handling", () => {
		beforeEach(() => {
			const options: LabelButtonEParameterObject<number> = {
				scene: scene,
				name: "testLabelButton",
				args: 100,
				width: 150,
				height: 40,
				text: "Click Me",
				onComplete: mockOnComplete,
			};

			button = new LabelButtonE(options);
		});

		it("should call onComplete with correct arguments", () => {
			// Complete press and release cycle
			button.onPointDown.fire({
				player: null,
				point: { x: 75, y: 20 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			button.onPointUp.fire({
				player: null,
				point: { x: 75, y: 20 },
				pointerId: 0,
				target: button,
				type: "up",
			} as any);

			expect(mockOnComplete).toHaveBeenCalledWith(100);
		});

		it("should handle multiple interactions", () => {
			// First interaction
			button.onPointDown.fire({
				player: null,
				point: { x: 75, y: 20 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			button.onPointUp.fire({
				player: null,
				point: { x: 75, y: 20 },
				pointerId: 0,
				target: button,
				type: "up",
			} as any);

			// Reset sync state for second interaction
			(button as any).sync = "idle";

			// Second interaction
			button.onPointDown.fire({
				player: null,
				point: { x: 75, y: 20 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			button.onPointUp.fire({
				player: null,
				point: { x: 75, y: 20 },
				pointerId: 0,
				target: button,
				type: "up",
			} as any);

			expect(mockOnComplete).toHaveBeenCalledTimes(2);
		});
	});

	describe("inheritance from ButtonE", () => {
		it("should have all ButtonE properties and methods", () => {
			const options: LabelButtonEParameterObject<number> = {
				scene: scene,
				name: "testLabelButton",
				args: 42,
				width: 150,
				height: 40,
				text: "Test",
			};

			button = new LabelButtonE(options);

			expect(button.name).toBe("testLabelButton");
			expect(button.msgArgs).toBe(42);
			expect(button._pressed).toBe(false);
			expect(button._sync).toBe("idle");
			expect(button.onPress).toBeDefined();
			expect(button.onSync).toBeDefined();
			expect(button.send).toBeDefined();
		});

		it("should properly handle sync state changes", () => {
			const options: LabelButtonEParameterObject<number> = {
				scene: scene,
				name: "testLabelButton",
				args: 42,
				width: 150,
				height: 40,
				text: "Test",
			};

			button = new LabelButtonE(options);

			expect(button._sync).toBe("idle");

			button.send();

			expect(button._sync).toBe("received"); // Single player mode
		});
	});
});
