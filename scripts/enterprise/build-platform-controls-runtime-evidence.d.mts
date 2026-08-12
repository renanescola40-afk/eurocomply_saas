export type PlatformControlsCredentialCandidate = {
  label: string;
  token: string;
};

export type PlatformControlsCredentialFallbackOptions = {
  fetchImpl?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
  acceptData?: (data: unknown) => boolean;
};

export type PlatformControlsCredentialFallbackResponse = {
  data: any;
  authMode: string;
};

export function buildCredentialCandidates(
  dedicatedToken?: string | null,
  githubToken?: string | null,
): PlatformControlsCredentialCandidate[];

export function rulesetPatternMatchesMain(pattern: unknown): boolean;

export function rulesetTargetsMain(ruleset: any): boolean;

export function synthesizeClassicProtectionFromRulesets(rulesets: any[]): any;

export function mergeClassicAndRulesetProtection(
  classicProtection: any,
  rulesetProtection: any,
): any;

export function applyRulesetsEvidenceBoundary(
  evidence: any,
  metadata: any,
  classicBoundary: unknown,
  sourceMode?: string,
): any;

export function githubJsonWithCredentialFallback(
  url: string,
  candidates: PlatformControlsCredentialCandidate[],
  options?: PlatformControlsCredentialFallbackOptions,
): Promise<PlatformControlsCredentialFallbackResponse>;
