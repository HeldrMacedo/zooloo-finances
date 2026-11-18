import type { ViteUserConfig } from 'vitest/config';

export interface CoverageThresholds {
  readonly lines: number;
  readonly branches: number;
  readonly functions: number;
  readonly statements: number;
}

export declare const CORE_THRESHOLDS: CoverageThresholds;
export declare const DEFAULT_THRESHOLDS: CoverageThresholds;
export declare const UI_THRESHOLDS: CoverageThresholds;
export declare function packageTestConfig(thresholds: CoverageThresholds): ViteUserConfig;
