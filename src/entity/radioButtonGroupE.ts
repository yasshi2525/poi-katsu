import { LabelButtonE } from "./labelButtonE";

/**
 * Radio button option data
 */
export interface RadioButtonOption {
	id: string;
	label: string;
	value: string;
}

/**
 * Parameter object for RadioButtonGroup
 */
export interface RadioButtonGroupParameterObject extends g.EParameterObject {
	/** Options for radio buttons */
	options: RadioButtonOption[];
	/** Initially selected option ID */
	selectedId?: string;
	/** Button width */
	buttonWidth: number;
	/** Button height */
	buttonHeight: number;
	/** Spacing between buttons */
	spacing: number;
	/** Callback when selection changes */
	onSelectionChange: (selectedId: string, selectedValue: string) => void;
}

/**
 * Radio button group component for single selection from multiple options
 */
export class RadioButtonGroupE extends g.E {
	static assetIds: string[] = [];

	private readonly options: RadioButtonOption[];
	private readonly buttonWidth: number;
	private readonly buttonHeight: number;
	private readonly spacing: number;
	private readonly onSelectionChange: (selectedId: string, selectedValue: string) => void;
	private selectedId?: string;
	private buttons: Map<string, LabelButtonE<string>> = new Map();

	/**
	 * Creates a new RadioButtonGroup instance
	 * @param options Configuration options for the radio button group
	 */
	constructor(options: RadioButtonGroupParameterObject) {
		super(options);

		this.options = options.options;
		this.selectedId = options.selectedId;
		this.buttonWidth = options.buttonWidth;
		this.buttonHeight = options.buttonHeight;
		this.spacing = options.spacing;
		this.onSelectionChange = options.onSelectionChange;

		this.createRadioButtons();
	}

	/**
	 * Gets the currently selected option ID
	 * @returns Selected option ID or undefined if none selected
	 */
	getSelectedId(): string | undefined {
		return this.selectedId;
	}

	/**
	 * Gets the currently selected option value
	 * @returns Selected option value or undefined if none selected
	 */
	getSelectedValue(): string | undefined {
		const selectedOption = this.options.find(opt => opt.id === this.selectedId);
		return selectedOption?.value;
	}

	/**
	 * Sets the selected option by ID
	 * @param optionId The option ID to select
	 */
	setSelectedId(optionId: string): void {
		if (this.selectedId === optionId) return;

		const option = this.options.find(opt => opt.id === optionId);
		if (!option) return;

		const previousSelectedId = this.selectedId;
		this.selectedId = optionId;
		this.updateButtonStates();

		// Only reactivate the previously selected button to allow it to be clicked again
		// This prevents race conditions in multi mode while maintaining proper UX
		if (previousSelectedId) {
			this.reactivateButton(previousSelectedId);
		}

		this.onSelectionChange(optionId, option.value);
	}

	/**
	 * Creates radio button UI elements
	 */
	private createRadioButtons(): void {
		this.options.forEach((option, index) => {
			const isSelected = this.selectedId === option.id;
			const buttonY = index * (this.buttonHeight + this.spacing);

			const button = new LabelButtonE<string>({
				scene: this.scene,
				name: `radioButton_${option.id}`,
				args: option.id,
				width: this.buttonWidth,
				height: this.buttonHeight,
				x: 0,
				y: buttonY,
				text: option.label,
				backgroundColor: isSelected ? "#3498db" : "#95a5a6",
				textColor: "white",
				fontSize: 14,
				onComplete: (optionId: string) => this.setSelectedId(optionId),
			});

			this.buttons.set(option.id, button);
			this.append(button);
		});
	}

	/**
	 * Updates the visual state of all buttons based on current selection
	 */
	private updateButtonStates(): void {
		this.buttons.forEach((button, optionId) => {
			const isSelected = this.selectedId === optionId;
			// Update button background color to reflect selection state
			const background = button.children![0] as g.FilledRect;
			background.cssColor = isSelected ? "#3498db" : "#95a5a6";
			background.modified();
		});
	}

	/**
	 * Reactivates a specific radio button to ensure it remains clickable
	 * Only reactivates the previously selected button to prevent race conditions in multi mode
	 * @param buttonId The ID of the button to reactivate
	 */
	private reactivateButton(buttonId: string): void {
		const button = this.buttons.get(buttonId);
		if (button) {
			button.reactivate();
		}
	}
}
