import { GameClient } from "@akashic/headless-akashic";
import { ButtonE, ButtonEParameterObject } from "../../src/entity/buttonE";

// Create a concrete implementation of ButtonE for testing since it's abstract
class TestButtonE extends ButtonE<number, ButtonEParameterObject<number>> {
	public createVisualElementsCalled!: boolean;
	public onPressedStateChangeCalled!: boolean;
	public onSyncStateChangeCalled!: boolean;
	public lastPressedState: boolean | null = null;
	public lastSyncState: "sending" | "received" | null = null;

	constructor(options: ButtonEParameterObject<number>) {
		super(options);
	}

	protected createVisualElements(): void {
		this.createVisualElementsCalled = true;
		// Mock visual element creation for testing
	}

	protected onPressedStateChange(pressed: boolean): void {
		this.onPressedStateChangeCalled = true;
		this.lastPressedState = pressed;
	}

	protected onSyncStateChange(state: "sending" | "received"): void {
		this.onSyncStateChangeCalled = true;
		this.lastSyncState = state;
	}
}

describe("ButtonE", () => {
	let button: TestButtonE;
	let mockOnClick: jest.Mock;

	beforeEach(() => {
		mockOnClick = jest.fn();
	});

	afterEach(() => {
		if (button) {
			button.destroy();
		}
	});

	describe("constructor", () => {
		it("should create button with default options", () => {
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 100,
				height: 50,
			};

			button = new TestButtonE(options);

			expect(button.width).toBe(100);
			expect(button.height).toBe(50);
			expect(button.x).toBe(0);
			expect(button.y).toBe(0);
			expect(button.touchable).toBe(true);
			expect(button._pressed).toBe(false);
			expect(button._onCompleteHandler).toBeUndefined();
		});

		it("should create button with custom position", () => {
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 100,
				height: 50,
				x: 10,
				y: 20,
			};

			button = new TestButtonE(options);

			expect(button.x).toBe(10);
			expect(button.y).toBe(20);
		});

		it("should store onClick handler when provided", () => {
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 100,
				height: 50,
				onComplete: mockOnClick,
			};

			button = new TestButtonE(options);

			expect(button._onCompleteHandler).toBe(mockOnClick);
		});

		it("should call createVisualElements during construction", () => {
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 100,
				height: 50,
			};

			button = new TestButtonE(options);
			expect(button.createVisualElementsCalled).toBe(true);
		});
	});

	describe("event handling", () => {
		beforeEach(() => {
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 100,
				height: 50,
				onComplete: mockOnClick,
			};

			button = new TestButtonE(options);
		});

		it("should handle onPointDown event", () => {
			// Simulate point down event
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			expect(button._pressed).toBe(true);
			expect(button._isPressedBy).toBe(0);
			expect(button.onPressedStateChangeCalled).toBe(true);
			expect(button.lastPressedState).toBe(true);
		});

		it("should handle onPointUp event and trigger send", () => {
			// First trigger point down
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			// Reset state change tracking
			button.onPressedStateChangeCalled = false;
			button.lastPressedState = null;

			// Then trigger point up
			button.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "up",
			} as any);

			expect(button._pressed).toBe(false);
			expect(button._isPressedBy).toBeUndefined();
			expect(button.onPressedStateChangeCalled).toBe(true);
			expect(button.lastPressedState).toBe(false);
			expect(button._sync).toBe("received"); // Should be received in single player mode
			expect(mockOnClick).toHaveBeenCalledWith(0); // Called with args
		});

		it("should handle sync state changes", () => {
			// Test sending state
			button.send();
			expect(button._sync).toBe("received"); // In single player mode, immediately goes to received
			expect(button.onSyncStateChangeCalled).toBe(true);
			expect(button.lastSyncState).toBe("received");
		});

		it("should not allow double press", () => {
			// First press
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			expect(button._pressed).toBe(true);

			// Second press should be ignored
			button.onPressedStateChangeCalled = false;
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 1,
				target: button,
				type: "down",
			} as any);

			expect(button.onPressedStateChangeCalled).toBe(false);
			expect(button._isPressedBy).toBe(0); // Still pressed by original pointer
		});

		it("should not respond to wrong pointer up", () => {
			// Press with pointer 0
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			// Try to release with different pointer
			button.onPressedStateChangeCalled = false;
			button.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 1,
				target: button,
				type: "up",
			} as any);

			expect(button._pressed).toBe(true); // Still pressed
			expect(button.onPressedStateChangeCalled).toBe(false);
		});
	});

	describe("abstract method requirements", () => {
		it("should require implementation of createVisualElements", () => {
			// This test ensures that our concrete implementation
			// properly implements the abstract method
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 100,
				height: 50,
			};

			button = new TestButtonE(options);

			expect(button.createVisualElementsCalled).toBe(true);
		});

		it("should require implementation of onPressedStateChange", () => {
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 100,
				height: 50,
			};

			button = new TestButtonE(options);

			// Trigger a state change
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			expect(button.onPressedStateChangeCalled).toBe(true);
			expect(button.lastPressedState).toBe(true);
		});
	});

	describe("ButtonOptions interface", () => {
		it("should accept all required ButtonOptions properties", () => {
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 200,
				height: 100,
				x: 50,
				y: 75,
				onComplete: mockOnClick,
			};

			button = new TestButtonE(options);

			expect(button.width).toBe(200);
			expect(button.height).toBe(100);
			expect(button.x).toBe(50);
			expect(button.y).toBe(75);
			expect(button._onCompleteHandler).toBe(mockOnClick);
		});

		it("should work with minimal required options", () => {
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 100,
				height: 50,
			};

			button = new TestButtonE(options);

			expect(button.width).toBe(100);
			expect(button.height).toBe(50);
			expect(button.x).toBe(0); // default value
			expect(button.y).toBe(0); // default value
			expect(button._onCompleteHandler).toBeUndefined();
		});
	});

	describe("inheritance behavior", () => {
		it("should extend g.E correctly", () => {
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 100,
				height: 50,
			};

			button = new TestButtonE(options);

			expect(button).toBeInstanceOf(g.E);
			expect(button.touchable).toBe(true);
		});

		it("should maintain proper event chain", () => {
			const options: ButtonEParameterObject<number> = {
				scene: scene,
				multi: false,
				name: "testButton",
				args: 0,
				width: 100,
				height: 50,
				onComplete: mockOnClick,
			};

			button = new TestButtonE(options);

			// Verify that the event handlers are properly set up
			expect(button.onPointDown).toBeDefined();
			expect(button.onPointUp).toBeDefined();

			// Verify that events can be triggered multiple times
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			button.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "up",
			} as any);

			// Need to reset sync state before second press
			(button as any).sync = "idle";

			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			button.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "up",
			} as any);

			expect(mockOnClick).toHaveBeenCalledTimes(2);
		});
	});

	describe("multi-player mode", () => {
		let passiveClient: GameClient<3>;
		let passiveScene: g.Scene;

		beforeEach(async () => {
			passiveClient = await gameContext.createPassiveGameClient();
			await gameContext.step();
			passiveScene = new passiveClient.g.Scene({ game: passiveClient.game, name: "test" });
			passiveClient.game.pushScene(passiveScene);
			await passiveClient.advanceUntil(() => passiveClient.game.scene()!.name === "test");

			// Set to multi-player mode
			(passiveScene.game.vars as GameVars).mode = "multi";

			const options: ButtonEParameterObject<number> = {
				scene: passiveScene,
				multi: true,
				name: "testButton",
				args: 42,
				width: 100,
				height: 50,
				onComplete: mockOnClick,
			};

			button = new TestButtonE(options);
		});

		afterEach(() => {
			if (button) {
				button.destroy();
			}
			jest.restoreAllMocks();
		});

		it("should send message event when button is clicked in multi-player mode", async () => {
			// Spy on passiveScene.game.raiseEvent to verify message is sent
			const raiseEventSpy = jest.spyOn(passiveScene.game, "raiseEvent");

			// Simulate complete button press and release
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			await gameContext.step();

			button.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "up",
			} as any);

			// Check sync state immediately after point up (should be "sending")
			expect(button._sync).toBe("sending");
			expect(button.lastSyncState).toBe("sending");

			// Verify that raiseEvent was called with a message
			expect(raiseEventSpy).toHaveBeenCalled();
			const eventCall = raiseEventSpy.mock.calls[0];
			const messageEvent = eventCall[0] as g.MessageEvent;

			expect(messageEvent.data.name).toBe("submit");
			expect(messageEvent.data.args.name).toBe("testButton");
			expect(messageEvent.data.args.args).toBe(42);

			// onComplete should not be called yet (waiting for response)
			expect(mockOnClick).not.toHaveBeenCalled();

			await gameContext.step();
			await gameContext.step();

			// After two steps, in multi-player mode, should still be "sending" (waiting for message response)
			expect(button._sync).toBe("sending");

			raiseEventSpy.mockRestore();
		});

		it("should handle message response and call onComplete in multi-player mode", async () => {
			// First, trigger the button click
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			await gameContext.step();

			button.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "up",
			} as any);

			// Verify button is in sending state immediately after point up
			expect(button._sync).toBe("sending");

			await gameContext.step();
			await gameContext.step();

			// After two steps, should still be in sending state (waiting for message response)
			expect(button._sync).toBe("sending");

			// Simulate receiving a message response
			const messageData = {
				name: "submit",
				args: {
					name: "testButton",
					args: 42,
				},
			};

			button.onMessage.fire({
				player: { id: passiveScene.game.selfId },
				data: messageData,
				type: "message",
			} as any);

			// Check state immediately after message (should be "received")
			expect(button._sync).toBe("received");
			expect(button.lastSyncState).toBe("received");
			expect(mockOnClick).toHaveBeenCalledWith(42);

			await gameContext.step();
			await gameContext.step();

			// After two steps, should still be "received"
			expect(button._sync).toBe("received");
		});

		it("should ignore message responses from other buttons in multi-player mode", async () => {
			// First, trigger the button click
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			await gameContext.step();

			button.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "up",
			} as any);

			// Verify button is in sending state immediately after point up
			expect(button._sync).toBe("sending");

			await gameContext.step();
			await gameContext.step();

			// After two steps, should still be in sending state
			expect(button._sync).toBe("sending");

			// Simulate receiving a message response for a different button
			const messageData = {
				name: "submit",
				args: {
					name: "differentButton", // Different button name
					args: 42,
				},
			};

			button.onMessage.fire({
				player: { id: passiveScene.game.selfId },
				data: messageData,
				type: "message",
			} as any);

			// Button should still be in "sending" state and onComplete should not be called
			expect(button._sync).toBe("sending");
			expect(mockOnClick).not.toHaveBeenCalled();

			await gameContext.step();
			await gameContext.step();

			// After two steps, should still be in "sending" state
			expect(button._sync).toBe("sending");
		});

		it("should not process clicks when already in sending state", async () => {
			// First click
			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "down",
			} as any);

			await gameContext.step();

			button.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: button,
				type: "up",
			} as any);

			// Verify button is in sending state immediately after point up
			expect(button._sync).toBe("sending");

			await gameContext.step();
			await gameContext.step();

			// After two steps, should still be in sending state
			expect(button._sync).toBe("sending");

			// Try to click again while in sending state
			const initialSyncState = button._sync;

			button.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 1,
				target: button,
				type: "down",
			} as any);

			// Should not change state or process the press
			expect(button._pressed).toBe(false);
			expect(button._sync).toBe(initialSyncState);

			await gameContext.step();
			await gameContext.step();

			// After two steps, should still be unchanged
			expect(button._pressed).toBe(false);
			expect(button._sync).toBe(initialSyncState);
		});
	});
});
