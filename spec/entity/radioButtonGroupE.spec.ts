import { RadioButtonGroupE, RadioButtonOption } from "../../src/entity/radioButtonGroupE";
import { LabelButtonE } from "../../src/entity/labelButtonE";

describe("RadioButtonGroupE", () => {
	let radioGroup: RadioButtonGroupE;
	let lastSelection: { id?: string; value?: string } = {};

	const avatarOptions: RadioButtonOption[] = [
		{ id: "avatar1", label: "😀 笑顔", value: "😀" },
		{ id: "avatar2", label: "😎 クール", value: "😎" },
		{ id: "avatar3", label: "🥰 可愛い", value: "🥰" },
	];

	beforeEach(() => {
		// Reset selection tracking
		lastSelection = {};

		// Create RadioButtonGroupE instance
		radioGroup = new RadioButtonGroupE({
			scene: scene,
			x: 0,
			y: 0,
			options: avatarOptions,
			selectedId: "avatar1", // Default selection
			buttonWidth: 150,
			buttonHeight: 35,
			spacing: 10,
			onSelectionChange: (selectedId: string, selectedValue: string) => {
				lastSelection.id = selectedId;
				lastSelection.value = selectedValue;
			},
		});
		scene.append(radioGroup);
	});

	afterEach(() => {
		if (radioGroup) {
			radioGroup.destroy();
		}
	});

	describe("initialization", () => {
		it("should create with default selection", () => {
			expect(radioGroup.getSelectedId()).toBe("avatar1");
			expect(radioGroup.getSelectedValue()).toBe("😀");
		});

		it("should have all buttons created", () => {
			const avatar1Button = findRadioButton("avatar1");
			const avatar2Button = findRadioButton("avatar2");
			const avatar3Button = findRadioButton("avatar3");

			expect(avatar1Button).not.toBeNull();
			expect(avatar2Button).not.toBeNull();
			expect(avatar3Button).not.toBeNull();
		});
	});

	describe("single selection behavior", () => {
		it("should change selection when different button is clicked", () => {
			// Click avatar2
			const avatar2Button = findRadioButton("avatar2");
			expect(avatar2Button).not.toBeNull();
			avatar2Button!.send();

			// Verify selection changed
			expect(radioGroup.getSelectedId()).toBe("avatar2");
			expect(radioGroup.getSelectedValue()).toBe("😎");
			expect(lastSelection.id).toBe("avatar2");
			expect(lastSelection.value).toBe("😎");
		});

		it("should ignore clicks on already selected button", () => {
			// Initially avatar1 is selected
			expect(radioGroup.getSelectedId()).toBe("avatar1");

			// Click avatar1 again (already selected)
			const avatar1Button = findRadioButton("avatar1");
			avatar1Button!.send();

			// Selection should remain the same, callback should not be called
			expect(radioGroup.getSelectedId()).toBe("avatar1");
			expect(lastSelection.id).toBeUndefined(); // Callback not called
		});
	});

	describe("multiple clicks behavior (radio button reactivity)", () => {
		it("should remain reactive after first click - can switch between options multiple times", () => {
			// First click: avatar1 → avatar2
			const avatar2Button = findRadioButton("avatar2");
			expect(avatar2Button).not.toBeNull();
			avatar2Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar2");

			// Second click: avatar2 → avatar3 (this tests if buttons are reactivated)
			const avatar3Button = findRadioButton("avatar3");
			expect(avatar3Button).not.toBeNull();
			avatar3Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar3");

			// Third click: avatar3 → avatar1 (further testing reactivity)
			const avatar1Button = findRadioButton("avatar1");
			expect(avatar1Button).not.toBeNull();
			avatar1Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar1");

			// Fourth click: back to avatar2 (extensive reactivity test)
			avatar2Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar2");
		});

		it("should handle rapid selection changes", () => {
			const avatar1Button = findRadioButton("avatar1");
			const avatar2Button = findRadioButton("avatar2");
			const avatar3Button = findRadioButton("avatar3");

			// Rapid clicking sequence
			avatar2Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar2");

			avatar3Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar3");

			avatar1Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar1");

			avatar3Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar3");
		});
	});

	describe("programmatic selection", () => {
		it("should update selection via setSelectedId", () => {
			radioGroup.setSelectedId("avatar3");
			expect(radioGroup.getSelectedId()).toBe("avatar3");
			expect(radioGroup.getSelectedValue()).toBe("🥰");
		});

		it("should maintain button reactivity after programmatic selection", () => {
			// Programmatically select avatar3
			radioGroup.setSelectedId("avatar3");
			expect(radioGroup.getSelectedId()).toBe("avatar3");

			// Then click avatar2 - should still work
			const avatar2Button = findRadioButton("avatar2");
			avatar2Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar2");
		});
	});

	describe("selective reactivation behavior", () => {
		it("should only reactivate previously selected button, not all buttons", () => {
			// Start with avatar1 selected (default)
			expect(radioGroup.getSelectedId()).toBe("avatar1");

			// Click avatar2 (this should reactivate avatar1 but leave avatar3 inactive)
			const avatar2Button = findRadioButton("avatar2");
			avatar2Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar2");

			// Now avatar1 should be clickable again (was reactivated)
			const avatar1Button = findRadioButton("avatar1");
			avatar1Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar1");

			// Click avatar3 (this should reactivate avatar1 but avatar2 remains in "received" state)
			const avatar3Button = findRadioButton("avatar3");
			avatar3Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar3");

			// Avatar1 should still be clickable (was just the previous selection)
			avatar1Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar1");

			// But avatar2 should have been reactivated when avatar3 was selected
			avatar2Button!.send();
			expect(radioGroup.getSelectedId()).toBe("avatar2");
		});
	});

	// Helper function to find radio button by avatar ID
	function findRadioButton(avatarId: string): LabelButtonE<any> | null {
		const findButtonRecursive = (entity: g.E): LabelButtonE<any> | null => {
			if (entity instanceof LabelButtonE && entity.name === `radioButton_${avatarId}`) {
				return entity;
			}
			if (entity.children) {
				for (const child of entity.children) {
					const found = findButtonRecursive(child);
					if (found) return found;
				}
			}
			return null;
		};
		return findButtonRecursive(radioGroup);
	}
});
