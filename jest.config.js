import { createDefaultPreset } from "ts-jest";

/** @type {import("jest").Config} */
export default {
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["./src/**/*.ts"],
  coverageReporters: ["lcov"],
  projects: [{
    displayName:  "unit",
    ...createDefaultPreset({ tsconfig: "spec/tsconfig.json" }),
    testMatch: ["<rootDir>/spec/**/*.spec.ts"],
    testPathIgnorePatterns: ["<rootDir>/spec/e2e"],
    testEnvironment: "@yasshi2525/jest-environment-akashic"
  },{
    displayName: "e2e",
    ...createDefaultPreset({ tsconfig: "spec/e2e/tsconfig.json" }),
    testMatch: ["<rootDir>/spec/e2e/**/*.ts"]
  }]
};
