import { router, type Href } from "expo-router";
import { navigateToWorkspace } from "@/stores/navigation-active-workspace-store";
import { useSessionStore } from "@/stores/session-store";
import { buildHostAgentDetailRoute } from "@/utils/host-routes";
import { normalizeWorkspaceOpaqueId } from "@/utils/workspace-identity";

export interface NavigateToAgentInput {
  serverId: string;
  agentId: string;
  // Used as the workspace target when the agent is not yet in the session store
  // (cold deep-links). Otherwise the workspace is read from the store.
  workspaceId?: string | null;
}

export function navigateToAgent(input: NavigateToAgentInput): string {
  const session = useSessionStore.getState().sessions[input.serverId];
  const agent = session?.agents.get(input.agentId) ?? session?.agentDetails.get(input.agentId);
  const workspaceId = normalizeWorkspaceOpaqueId(input.workspaceId ?? agent?.workspaceId);
  const route = buildHostAgentDetailRoute(input.serverId, input.agentId, workspaceId ?? undefined);
  if (workspaceId && route !== "/") {
    navigateToWorkspace(input.serverId, workspaceId, {
      openIntent: `agent:${input.agentId.trim()}`,
    });
    return route;
  }

  router.navigate(route as Href);
  return route;
}
