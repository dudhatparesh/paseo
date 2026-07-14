import { useCallback } from "react";
import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/toast-context";
import { useHostChooser } from "@/hosts/host-chooser";
import { getHostRuntimeStore } from "@/runtime/host-runtime";
import { estimateTerminalViewportSize } from "@/terminal/runtime/terminal-size-cache";
import { buildHostTerminalRoute } from "@/utils/host-routes";

export type OpenHostTerminalResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_connected" | "unsupported" | "create_failed";
      message: string | null;
    };

// Creates a host terminal on the daemon (cwd resolved daemon-side to the daemon
// user's home) and navigates to its full-screen route. Requires
// server_info.features.hostTerminal; older daemons get the standard
// update-the-host message instead of a fallback path.
export async function openHostTerminal(serverId: string): Promise<OpenHostTerminalResult> {
  const client = getHostRuntimeStore().getSnapshot(serverId)?.client ?? null;
  if (!client) {
    return { ok: false, reason: "not_connected", message: null };
  }
  // COMPAT(hostTerminal): added in v0.1.108, drop the gate when floor >= v0.1.108.
  if (client.getLastServerInfoMessage()?.features?.hostTerminal !== true) {
    return { ok: false, reason: "unsupported", message: null };
  }
  const size = estimateTerminalViewportSize({ serverId, cwd: "" });
  try {
    const payload = await client.createHostTerminal(size ? { size } : undefined);
    if (!payload.terminal) {
      return { ok: false, reason: "create_failed", message: payload.error };
    }
    const route = buildHostTerminalRoute(serverId, payload.terminal.id);
    router.push({
      pathname: route,
      params: { cwd: payload.terminal.cwd },
    } as unknown as Href);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: "create_failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

// Entry-point helper: pick a host, then open a host terminal on it, surfacing
// failures as toasts.
export function useOpenHostTerminal(): () => void {
  const { t } = useTranslation();
  const toast = useToast();
  const chooseHost = useHostChooser();

  return useCallback(() => {
    chooseHost({
      title: t("hostTerminal.chooseHost"),
      onChooseHost: (serverId) => {
        void (async () => {
          const result = await openHostTerminal(serverId);
          if (result.ok) {
            return;
          }
          if (result.reason === "unsupported") {
            toast.error(t("hostTerminal.unsupported"));
            return;
          }
          toast.error(result.message ?? t("hostTerminal.createFailed"));
        })();
      },
    });
  }, [chooseHost, t, toast]);
}
