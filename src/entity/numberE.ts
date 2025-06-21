/**
 * NumberE is a label that displays a number with optional leading spaces.
 * It formats the number to a specified number of digits, padding with spaces if necessary.
 */
export class NumberE extends g.Label {
	static assetIds: string[] = ["number", "number-glyph"];
	private static font?: g.BitmapFont;
	private readonly digits?: number;

	constructor(options: Omit<g.LabelParameterObject, "font" | "text"> & { digits?: number; value: number }) {
		super({
			...options,
			text: NumberE.formatValue(options.value, options.digits),
			font: NumberE.generateFont(options.scene),
		});
		this.digits = options.digits;
	}

	get value(): number {
		return parseInt(this.text.trim(), 10);
	}

	set value (value: number) {
		this.text = NumberE.formatValue(value, this.digits);
		this.invalidate();
	}

	private static formatValue(value: number, digits?: number): string {
		if (digits !== undefined && value.toString().length <= digits) {
			return (new Array(digits).fill(" ").join("") + value).slice(-digits);
		} else {
			return value.toString();
		}
	}

	private static generateFont(scene: g.Scene): g.BitmapFont {
		if (this.font) {
			return this.font;
		}
		return this.font = new g.BitmapFont({
			src: scene.asset.getImageById("number"),
			glyphInfo: scene.asset.getJSONContentById("number-glyph"),
		});
	}
}
