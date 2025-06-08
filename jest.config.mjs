import { createDefaultPreset } from "ts-jest";

/** @type {import("jest").Config} */
export default {
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["./src/**/*.ts"],
  coverageReporters: ["lcov"],
  ...createDefaultPreset({ tsconfig: "spec/tsconfig.json" }),
  testMatch: ["<rootDir>/spec/**/*.ts"],
};
