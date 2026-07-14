import { useLocalSearchParams } from "expo-router";
import { HostRouteBootstrapBoundary } from "@/components/host-route-bootstrap-boundary";
import { HostTerminalScreen } from "@/screens/host-terminal-screen";

function getParamValue(value: string | string[] | undefined): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim();
  }
  return "";
}

export default function HostTerminalRoute() {
  return (
    <HostRouteBootstrapBoundary>
      <HostTerminalRouteContent />
    </HostRouteBootstrapBoundary>
  );
}

function HostTerminalRouteContent() {
  const params = useLocalSearchParams<{
    serverId?: string | string[];
    terminalId?: string | string[];
    cwd?: string | string[];
  }>();
  const serverId = getParamValue(params.serverId);
  const terminalId = getParamValue(params.terminalId);
  const cwd = getParamValue(params.cwd);

  if (!serverId || !terminalId) {
    return null;
  }

  return (
    <HostTerminalScreen serverId={serverId} terminalId={terminalId} initialCwd={cwd || null} />
  );
}
