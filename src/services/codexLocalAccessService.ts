import { invoke } from '@tauri-apps/api/core';
import type {
  CodexLocalAccessPortCleanupResult,
  CodexLocalAccessRoutingStrategy,
  CodexLocalAccessScope,
  CodexLocalAccessState,
  CodexLocalAccessTestResult,
} from '../types/codexLocalAccess';

export async function getCodexLocalAccessState(): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_get_state');
}

export async function saveCodexLocalAccessAccounts(
  accountIds: string[],
  restrictFreeAccounts: boolean,
): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_save_accounts', {
    accountIds,
    restrictFreeAccounts,
  });
}

export async function removeCodexLocalAccessAccount(
  accountId: string,
): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_remove_account', { accountId });
}

export async function addCodexLocalAccessApiKey(payload: {
  name?: string;
  dailyCostLimitMicrosUsd?: number | null;
  totalCostLimitMicrosUsd?: number | null;
}): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_add_api_key', payload);
}

export async function updateCodexLocalAccessApiKey(payload: {
  keyId: string;
  name: string;
  enabled: boolean;
  dailyCostLimitMicrosUsd?: number | null;
  totalCostLimitMicrosUsd?: number | null;
}): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_update_api_key', payload);
}

export async function removeCodexLocalAccessApiKey(
  keyId: string,
): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_remove_api_key', { keyId });
}

export async function rotateCodexLocalAccessApiKey(
  keyId?: string,
): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_rotate_api_key', { keyId });
}

export async function clearCodexLocalAccessStats(): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_clear_stats');
}

export async function prepareCodexLocalAccessForRestart(): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_prepare_restart');
}

export async function killCodexLocalAccessPort(): Promise<CodexLocalAccessPortCleanupResult> {
  return await invoke('codex_local_access_kill_port');
}

export async function updateCodexLocalAccessPort(
  port: number,
): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_update_port', { port });
}

export async function updateCodexLocalAccessRoutingStrategy(
  strategy: CodexLocalAccessRoutingStrategy,
): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_update_routing_strategy', { strategy });
}

export async function updateCodexLocalAccessRestrictFreeModels(
  modelIds: string[],
): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_update_restrict_free_models', { modelIds });
}

export async function updateCodexLocalAccessAccessScope(
  accessScope: CodexLocalAccessScope,
): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_update_access_scope', {
    accessScope,
  });
}

export async function setCodexLocalAccessEnabled(
  enabled: boolean,
): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_set_enabled', { enabled });
}

export async function activateCodexLocalAccess(): Promise<CodexLocalAccessState> {
  return await invoke('codex_local_access_activate');
}

export async function testCodexLocalAccess(): Promise<CodexLocalAccessTestResult> {
  return await invoke('codex_local_access_test');
}
