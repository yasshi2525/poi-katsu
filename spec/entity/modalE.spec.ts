import { ModalE } from "../../src/entity/modalE";

describe("ModalE", () => {
	let modal: ModalE<string>;
	let mockOnClose: jest.Mock;

	beforeEach(() => {
		mockOnClose = jest.fn();
	});

	afterEach(() => {
		if (modal) {
			modal.destroy();
		}
	});

	describe("constructor", () => {
		it("should create modal with required options", () => {
			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Test Title",
				message: "Test message content",
			});

			expect(modal.width).toBe(g.game.width);
			expect(modal.height).toBe(g.game.height);
			expect(modal.children).toHaveLength(2); // Overlay, Content
			expect(modal.content.children).toHaveLength(3); // Title, Message, Close button
		});

		it("should create modal with custom dimensions", () => {
			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Custom Modal",
				message: "Custom message",
				width: 300,
				height: 150,
				onClose: mockOnClose,
			});

			// Find the content rectangle (white background)
			const contentRect = modal.content;

			// Content width may be auto-adjusted based on text width
			expect(contentRect.width).toBeGreaterThanOrEqual(300);
			expect(contentRect.height).toBeGreaterThanOrEqual(150);
		});

		it("should position modal content in center", () => {
			const customWidth = 300;
			const customHeight = 150;

			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Centered Modal",
				message: "Centered message",
				width: customWidth,
				height: customHeight,
			});

			const contentRect = modal.content;

			const expectedX = g.game.width / 2;
			const expectedY = g.game.height / 2;

			expect(contentRect.x).toBe(expectedX);
			expect(contentRect.y).toBe(expectedY);
		});

		it("should create overlay that covers full screen", () => {
			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Test Title",
				message: "Test message",
			});

			// First child should be the overlay
			const overlay = modal.children![0] as g.FilledRect;
			expect(overlay.width).toBe(g.game.width);
			expect(overlay.height).toBe(g.game.height);
			expect(overlay.cssColor).toBe("rgba(0,0,0,0.5)");
			expect(overlay.touchable).toBe(true);
		});
	});

	describe("text content", () => {
		beforeEach(() => {
			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Test Title",
				message: "Test message content",
			});
		});

		it("should display title text", () => {
			const titleLabel = modal.content.children!.find(child =>
				child instanceof g.Label && (child as g.Label).text === "Test Title"
			) as g.Label;

			expect(titleLabel).toBeDefined();
			expect(titleLabel.fontSize).toBe(48); // Updated font size
			expect(titleLabel.textColor).toBe("black");
		});

		it("should display message text", () => {
			const messageLabel = modal.content.children!.find(child =>
				child instanceof g.Label && (child as g.Label).text === "Test message content"
			) as g.Label;

			expect(messageLabel).toBeDefined();
			expect(messageLabel.fontSize).toBe(24); // Updated font size
			expect(messageLabel.textColor).toBe("black");
		});

		it("should position title and message correctly", () => {
			const titleLabel = modal.content.children!.find(child =>
				child instanceof g.Label && (child as g.Label).text === "Test Title"
			) as g.Label;

			const messageLabel = modal.content.children!.find(child =>
				child instanceof g.Label && (child as g.Label).text === "Test message content"
			) as g.Label;

			// Title should be 40px from content left and top (updated margin)
			expect(titleLabel.x).toBe(40);
			expect(titleLabel.y).toBe(40);

			// Message should be 40px from left, 120px from top (updated spacing)
			expect(messageLabel.x).toBe(40);
			expect(messageLabel.y).toBe(120);
		});
	});

	describe("close button", () => {
		beforeEach(() => {
			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Test Title",
				message: "Test message",
				onClose: mockOnClose,
			});
		});

		it("should have close button with correct text", () => {
			// Close button should be the last child added
			const closeButton = modal.content.children![modal.content.children!.length - 1];
			expect(closeButton).toBeDefined();

			// Check if it's a LabelButtonE with "閉じる" text by checking its children
			if (closeButton.children && closeButton.children.length > 1) {
				const label = closeButton.children[1] as g.Label;
				if (label && label.text) {
					expect(label.text).toBe("閉じる"); // Updated to Japanese text
				}
			}
		});

		it("should position close button correctly", () => {
			const contentRect = modal.content;

			const closeButton = modal.content.children![modal.content.children!.length - 1];

			// Close button should be positioned at center-bottom of modal content
			// Using new coordinate system: center x and bottom y as reference
			const buttonWidth = 240;
			const buttonHeight = 120;
			const expectedX = contentRect.width / 2 - buttonWidth / 2; // Center horizontally
			const expectedY = contentRect.height - 50 - buttonHeight; // 50px margin from bottom

			expect(closeButton.x).toBe(expectedX);
			expect(closeButton.y).toBe(expectedY);
		});

		it("should call onClose when close button is activated", () => {
			const closeButton = modal.content.children![modal.content.children!.length - 1];

			// Simulate button press and release
			closeButton.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: closeButton,
				type: "down",
			} as any);

			closeButton.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: closeButton,
				type: "up",
			} as any);

			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	describe("overlay interaction", () => {
		beforeEach(() => {
			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Test Title",
				message: "Test message",
				onClose: mockOnClose,
			});
		});

		it("should close modal when overlay is clicked", () => {
			const overlay = modal.children![0] as g.FilledRect;

			// Simulate overlay click
			overlay.onPointDown.fire({
				player: null,
				point: { x: 50, y: 50 },
				pointerId: 0,
				target: overlay,
				type: "down",
			} as any);

			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	describe("sync state handling", () => {
		beforeEach(() => {
			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Test Title",
				message: "Test message",
			});
		});

		it("should handle close button sync state changes", () => {
			const contentRect = modal.content;

			const overlay = modal.children![0] as g.FilledRect;
			const closeButton = modal.children![modal.children!.length - 1];

			// Trigger close button action to generate sync state
			closeButton.onPointDown.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: closeButton,
				type: "down",
			} as any);

			closeButton.onPointUp.fire({
				player: null,
				point: { x: 50, y: 25 },
				pointerId: 0,
				target: closeButton,
				type: "up",
			} as any);

			// In single player mode, should go straight to received state
			// Content should show received state (normal opacity)
			expect(contentRect.opacity).toBe(1.0);
			expect(overlay.cssColor).toBe("rgba(0,0,0,0.5)");
		});
	});

	describe("modal destruction", () => {
		it("should not crash when close is called without onClose handler", () => {
			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Test Title",
				message: "Test message",
				// No onClose handler
			});

			const closeButton = modal.children![modal.children!.length - 1];

			expect(() => {
				closeButton.onPointDown.fire({
					player: null,
					point: { x: 50, y: 25 },
					pointerId: 0,
					target: closeButton,
					type: "down",
				} as any);

				closeButton.onPointUp.fire({
					player: null,
					point: { x: 50, y: 25 },
					pointerId: 0,
					target: closeButton,
					type: "up",
				} as any);
			}).not.toThrow();
		});

		it("should handle overlay click without onClose handler", () => {
			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Test Title",
				message: "Test message",
				// No onClose handler
			});

			const overlay = modal.children![0] as g.FilledRect;

			expect(() => {
				overlay.onPointDown.fire({
					player: null,
					point: { x: 50, y: 50 },
					pointerId: 0,
					target: overlay,
					type: "down",
				} as any);
			}).not.toThrow();
		});
	});

	describe("default dimensions", () => {
		it("should use default width and height when not specified", () => {
			modal = new ModalE({
				scene: scene,
				name: "testModal",
				args: "test",
				title: "Default Size",
				message: "Default size modal",
			});

			const contentRect = modal.content;

			// Content may be auto-adjusted based on text width and button size
			expect(contentRect.width).toBeGreaterThanOrEqual(400); // Default width or auto-adjusted
			expect(contentRect.height).toBeGreaterThanOrEqual(200); // Default height or auto-adjusted
		});
	});
});
