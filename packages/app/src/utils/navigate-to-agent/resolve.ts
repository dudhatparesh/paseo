import { buildHostAgentDetailRoute } from "@/utils/host-routes";
import { normalizeWorkspaceOpaqueId } from "@/utils/workspace-identity";

export interface NavigateToAgentInput {
  serverId: string;
  agentId: string;
  // Used as the workspace target when the agent is not yet in the session store
  // (cold deep-links). Otherwise the workspace is read from the store.
  workspaceId?: string | null;
}

export function resolveNavigateToAgent(
  input: NavigateToAgentInput,
  agentWorkspaceId?: string | null,
): string {
  const workspaceId = normalizeWorkspaceOpaqueId(input.workspaceId ?? agentWorkspaceId);
  return buildHostAgentDetailRoute(input.serverId, input.agentId, workspaceId ?? undefined);
}
