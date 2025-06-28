/**
 * Utility functions for label width adjustment and text display
 */

/**
 * Adjusts label scaleX to fit within the specified maximum width
 * If the label's width exceeds maxWidth, scales it down to fit
 * @param label The g.Label to adjust
 * @param maxWidth Maximum allowed width for the label
 */
export function adjustLabelWidthToFit(label: g.Label, maxWidth: number): void {
	if (label.width > maxWidth) {
		const scaleRatio = maxWidth / label.width;
		label.scaleX = scaleRatio;
		label.modified();
	}
}

/**
 * Creates a label with automatic width fitting
 * @param options Label creation options
 * @param options.scene Scene reference
 * @param options.text Text to display
 * @param options.font Font to use
 * @param options.fontSize Font size (optional)
 * @param options.fontColor Font color (optional)
 * @param options.x X position
 * @param options.y Y position
 * @param options.maxWidth Maximum width before scaling
 * @returns Configured g.Label with width adjustment applied
 */
export function createFittedLabel(options: {
	scene: g.Scene;
	text: string;
	font: g.Font;
	fontSize?: number;
	fontColor?: string;
	x: number;
	y: number;
	maxWidth: number;
}): g.Label {
	const label = new g.Label({
		scene: options.scene,
		text: options.text,
		font: options.font,
		fontSize: options.fontSize,
		textColor: options.fontColor,
		x: options.x,
		y: options.y
	});

	// Apply width adjustment
	adjustLabelWidthToFit(label, options.maxWidth);

	return label;
}
