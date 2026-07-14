import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { useTranslation } from "react-i18next";
import { BackHeader } from "@/components/headers/back-header";
import { TerminalPane } from "@/components/terminal-pane";
import { useHostRuntimeClient, useHostRuntimeIsConnected } from "@/runtime/host-runtime";
import type { WorkspaceFileOpenRequest } from "@/workspace/file-open";

interface HostTerminalScreenProps {
  serverId: string;
  terminalId: string;
  // Known when navigation follows creation; resolved from the daemon on cold
  // mounts (deep link, reload).
  initialCwd: string | null;
}

type CwdResolution =
  | { status: "resolved"; cwd: string }
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string };

// A host terminal has no workspace, so terminal-local file links have no
// workspace surface to open into.
function noopOpenFileExplorer(): void {}
function noopOpenWorkspaceFile(_request: WorkspaceFileOpenRequest): void {}

export function HostTerminalScreen({ serverId, terminalId, initialCwd }: HostTerminalScreenProps) {
  const { t } = useTranslation();
  const client = useHostRuntimeClient(serverId);
  const isConnected = useHostRuntimeIsConnected(serverId);
  const [resolution, setResolution] = useState<CwdResolution>(
    initialCwd ? { status: "resolved", cwd: initialCwd } : { status: "loading" },
  );

  useEffect(() => {
    if (resolution.status !== "loading" || !client || !isConnected) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const payload = await client.listHostTerminals();
        if (cancelled) {
          return;
        }
        const terminal = payload.terminals.find((item) => item.id === terminalId);
        setResolution(terminal ? { status: "resolved", cwd: terminal.cwd } : { status: "missing" });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setResolution({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, isConnected, resolution.status, terminalId]);

  return (
    <View style={styles.container}>
      <BackHeader title={t("hostTerminal.title")} />
      {resolution.status === "resolved" ? (
        <TerminalPane
          serverId={serverId}
          cwd={resolution.cwd}
          terminalId={terminalId}
          isWorkspaceFocused
          isPaneFocused
          onOpenFileExplorer={noopOpenFileExplorer}
          onOpenWorkspaceFile={noopOpenWorkspaceFile}
        />
      ) : (
        <View style={styles.stateContainer}>
          {resolution.status === "missing" && (
            <Text style={styles.stateText}>{t("hostTerminal.notFound")}</Text>
          )}
          {resolution.status === "error" && (
            <Text style={styles.stateText}>{resolution.message}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[4],
  },
  stateText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    textAlign: "center",
  },
}));
