export type CodexLocalAccessAddressKind = 'local' | 'lan';
export type CodexLocalAccessScope = 'localhost' | 'lan';

export type CodexLocalAccessRoutingStrategy =
  | 'auto'
  | 'quota_high_first'
  | 'quota_low_first'
  | 'plan_high_first'
  | 'plan_low_first'
  | 'expiry_soon_first';

export interface CodexLocalAccessCollection {
  enabled: boolean;
  port: number;
  apiKey: string;
  accessScope: CodexLocalAccessScope;
  apiKeys: CodexLocalAccessApiKey[];
  routingStrategy: CodexLocalAccessRoutingStrategy;
  restrictFreeAccounts: boolean;
  restrictFreeModels: string[];
  accountIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CodexLocalAccessApiKey {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  dailyCostLimitMicrosUsd: number | null;
  totalCostLimitMicrosUsd: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CodexLocalAccessUsageStats {
  requestCount: number;
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  costMicrosUsd: number;
}

export interface CodexLocalAccessAccountStats {
  accountId: string;
  email: string;
  usage: CodexLocalAccessUsageStats;
  updatedAt: number;
}

export interface CodexLocalAccessKeyStats {
  keyId: string;
  name: string;
  usage: CodexLocalAccessUsageStats;
  updatedAt: number;
}

export interface CodexLocalAccessStatsWindow {
  since: number;
  updatedAt: number;
  totals: CodexLocalAccessUsageStats;
  accounts: CodexLocalAccessAccountStats[];
  keys: CodexLocalAccessKeyStats[];
}

export interface CodexLocalAccessStats {
  since: number;
  updatedAt: number;
  totals: CodexLocalAccessUsageStats;
  accounts: CodexLocalAccessAccountStats[];
  keys: CodexLocalAccessKeyStats[];
  daily: CodexLocalAccessStatsWindow;
  weekly: CodexLocalAccessStatsWindow;
  monthly: CodexLocalAccessStatsWindow;
  yearly: CodexLocalAccessStatsWindow;
}

export interface CodexLocalAccessState {
  collection: CodexLocalAccessCollection | null;
  running: boolean;
  apiPortUrl: string | null;
  baseUrl: string | null;
  lanBaseUrl: string | null;
  externalApiPortUrl: string | null;
  externalBaseUrl: string | null;
  modelIds: string[];
  lastError: string | null;
  memberCount: number;
  stats: CodexLocalAccessStats;
}

export interface CodexLocalAccessTestResult {
  modelId: string | null;
  latencyMs: number | null;
  output: string | null;
  failure: CodexLocalAccessTestFailure | null;
}

export interface CodexLocalAccessTestFailure {
  title: string;
  stage: string;
  cause: string;
  suggestion: string;
  status: number | null;
  modelId: string | null;
  detail: string | null;
  cliOutput: string | null;
  gatewayOutput: string | null;
}

export interface CodexLocalAccessPortCleanupResult {
  killedCount: number;
  state: CodexLocalAccessState;
}
