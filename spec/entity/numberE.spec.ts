import { NumberE } from "../../src/entity/numberE";

describe("NumberE", () => {
	let numberLabel: NumberE;

	afterEach(() => {
		if (numberLabel) {
			numberLabel.destroy();
		}
	});

	describe("constructor", () => {
		it("should create NumberE with digits parameter", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 5,
				value: 123,
			});

			expect(numberLabel.text).toBe("  123");
			expect(numberLabel.value).toBe(123);
		});

		it("should create NumberE without digits parameter", () => {
			numberLabel = new NumberE({
				scene: scene,
				value: 456,
			});

			expect(numberLabel.text).toBe("456");
			expect(numberLabel.value).toBe(456);
		});

		it("should create NumberE with zero value", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 3,
				value: 0,
			});

			expect(numberLabel.text).toBe("  0");
			expect(numberLabel.value).toBe(0);
		});

		it("should create NumberE with single digit and matching digits parameter", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 1,
				value: 7,
			});

			expect(numberLabel.text).toBe("7");
			expect(numberLabel.value).toBe(7);
		});
	});

	describe("number formatting when length exceeds digits parameter", () => {
		it("should display full number when number length is greater than digits", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 3,
				value: 12345,
			});

			expect(numberLabel.text).toBe("12345");
			expect(numberLabel.value).toBe(12345);
		});

		it("should display full number when number length equals digits + 1", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 2,
				value: 999,
			});

			expect(numberLabel.text).toBe("999");
			expect(numberLabel.value).toBe(999);
		});

		it("should display full number for very large numbers", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 3,
				value: 1234567890,
			});

			expect(numberLabel.text).toBe("1234567890");
			expect(numberLabel.value).toBe(1234567890);
		});
	});

	describe("value getter returns exact number even with padded label", () => {
		it("should return exact value from padded text with leading spaces", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 6,
				value: 42,
			});

			expect(numberLabel.text).toBe("    42");
			expect(numberLabel.value).toBe(42);
		});

		it("should return exact value from heavily padded text", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 10,
				value: 1,
			});

			expect(numberLabel.text).toBe("         1");
			expect(numberLabel.value).toBe(1);
		});

		it("should return exact value when no padding is needed", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 4,
				value: 1234,
			});

			expect(numberLabel.text).toBe("1234");
			expect(numberLabel.value).toBe(1234);
		});

		it("should return exact value when digits is undefined", () => {
			numberLabel = new NumberE({
				scene: scene,
				value: 789,
			});

			expect(numberLabel.text).toBe("789");
			expect(numberLabel.value).toBe(789);
		});
	});

	describe("value setter", () => {
		it("should update text with proper formatting when digits is set", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 4,
				value: 1,
			});

			expect(numberLabel.text).toBe("   1");
			expect(numberLabel.value).toBe(1);

			numberLabel.value = 99;
			expect(numberLabel.text).toBe("  99");
			expect(numberLabel.value).toBe(99);
		});

		it("should update text without padding when digits is undefined", () => {
			numberLabel = new NumberE({
				scene: scene,
				value: 100,
			});

			expect(numberLabel.text).toBe("100");
			expect(numberLabel.value).toBe(100);

			numberLabel.value = 200;
			expect(numberLabel.text).toBe("200");
			expect(numberLabel.value).toBe(200);
		});

		it("should handle value exceeding digits in setter", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 2,
				value: 5,
			});

			expect(numberLabel.text).toBe(" 5");
			expect(numberLabel.value).toBe(5);

			numberLabel.value = 1000;
			expect(numberLabel.text).toBe("1000");
			expect(numberLabel.value).toBe(1000);
		});

		it("should handle zero in setter", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 3,
				value: 123,
			});

			numberLabel.value = 0;
			expect(numberLabel.text).toBe("  0");
			expect(numberLabel.value).toBe(0);
		});
	});

	describe("edge cases", () => {
		it("should handle zero with various digit configurations", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 1,
				value: 0,
			});

			expect(numberLabel.text).toBe("0");
			expect(numberLabel.value).toBe(0);
		});

		it("should handle negative numbers", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 4,
				value: -123,
			});

			// Negative numbers should not be padded since they exceed the digit count
			expect(numberLabel.text).toBe("-123");
			expect(numberLabel.value).toBe(-123);
		});

		it("should handle negative numbers without digits parameter", () => {
			numberLabel = new NumberE({
				scene: scene,
				value: -456,
			});

			expect(numberLabel.text).toBe("-456");
			expect(numberLabel.value).toBe(-456);
		});

		it("should handle single negative digit with matching digits parameter", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 2,
				value: -1,
			});

			// -1 has 2 characters, so no padding
			expect(numberLabel.text).toBe("-1");
			expect(numberLabel.value).toBe(-1);
		});

		it("should handle very large numbers", () => {
			const largeNumber = 999999999;
			numberLabel = new NumberE({
				scene: scene,
				digits: 3,
				value: largeNumber,
			});

			expect(numberLabel.text).toBe(largeNumber.toString());
			expect(numberLabel.value).toBe(largeNumber);
		});

		it("should handle updating from padded to unpadded", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 3,
				value: 5,
			});

			expect(numberLabel.text).toBe("  5");
			expect(numberLabel.value).toBe(5);

			numberLabel.value = 12345;
			expect(numberLabel.text).toBe("12345");
			expect(numberLabel.value).toBe(12345);
		});

		it("should handle updating from unpadded to padded", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 5,
				value: 12345,
			});

			expect(numberLabel.text).toBe("12345");
			expect(numberLabel.value).toBe(12345);

			numberLabel.value = 99;
			expect(numberLabel.text).toBe("   99");
			expect(numberLabel.value).toBe(99);
		});
	});

	describe("font generation", () => {
		it("should use bitmap font for rendering", () => {
			numberLabel = new NumberE({
				scene: scene,
				digits: 3,
				value: 123,
			});

			expect(numberLabel.font).toBeDefined();
			expect(numberLabel.font).toBeInstanceOf(g.BitmapFont);
		});

		it("should reuse the same font instance", () => {
			const numberLabel1 = new NumberE({
				scene: scene,
				digits: 3,
				value: 123,
			});

			const numberLabel2 = new NumberE({
				scene: scene,
				digits: 5,
				value: 456,
			});

			expect(numberLabel1.font).toBe(numberLabel2.font);

			numberLabel1.destroy();
			numberLabel2.destroy();
		});
	});
});
