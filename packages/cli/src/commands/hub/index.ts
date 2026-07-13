import { Command } from "commander";
import { withOutput, type ListResult, type OutputSchema } from "../../output/index.js";
import { addJsonAndDaemonHostOptions } from "../../utils/command-options.js";
import { connectToDaemon, resolveDaemonTarget } from "../../utils/client.js";

interface HubRow {
  state: string;
  relationshipId: string | null;
  hub: string | null;
  scopes: string;
  connectedAt: string | null;
  error: string | null;
  warning?: string;
}

const schema: OutputSchema<HubRow> = {
  idField: "state",
  columns: [
    { header: "STATE", field: "state" },
    { header: "HUB", field: "hub" },
    { header: "RELATIONSHIP", field: "relationshipId" },
    { header: "SCOPES", field: "scopes" },
    { header: "CONNECTED", field: "connectedAt" },
    { header: "ERROR", field: "error" },
    { header: "WARNING", field: "warning" },
  ],
};

function result(
  status: {
    state: string;
    relationshipId: string | null;
    hubOrigin: string | null;
    scopes: string[];
    connectedAt: string | null;
    lastError: string | null;
  },
  warning?: string,
): ListResult<HubRow> {
  return {
    type: "list",
    data: [
      {
        state: status.state,
        relationshipId: status.relationshipId,
        hub: status.hubOrigin,
        scopes: status.scopes.join(", "),
        connectedAt: status.connectedAt,
        error: status.lastError,
        warning,
      },
    ],
    schema,
  };
}

async function withClient<T>(
  host: string | undefined,
  action: (client: Awaited<ReturnType<typeof connectToDaemon>>) => Promise<T>,
): Promise<T> {
  const client = await connectToDaemon({ host });
  try {
    return await action(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

export function assertLocalHubManagementTarget(
  host: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const explicitHost = host ?? env.PASEO_HOST;
  if (!explicitHost) return;
  const target = resolveDaemonTarget(explicitHost);
  if (target.type === "ipc") return;
  const hostname = new URL(target.url).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "0:0:0:0:0:0:0:1" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  ) {
    return;
  }
  throw new Error("Hub relationship management requires a local daemon target");
}

export function createHubCommand(): Command {
  const hub = new Command("hub").description("Manage this daemon's Paseo Hub relationship");
  addJsonAndDaemonHostOptions(
    hub.command("connect").argument("<url>").requiredOption("--token <token>"),
  ).action(
    withOutput(async (...args) => {
      const url = args[0] as string;
      const options = args.at(-2) as { token: string; host?: string };
      assertLocalHubManagementTarget(options.host);
      return withClient(options.host, async (client) =>
        result((await client.connectHub(url, options.token)).status),
      );
    }),
  );
  addJsonAndDaemonHostOptions(hub.command("status")).action(
    withOutput(async (...args) => {
      const options = args.at(-2) as { host?: string };
      return withClient(options.host, async (client) =>
        result((await client.getHubStatus()).status),
      );
    }),
  );
  addJsonAndDaemonHostOptions(
    hub
      .command("disconnect")
      .option("--force", "Remove local authority even if the Hub is offline"),
  ).action(
    withOutput(async (...args) => {
      const options = args.at(-2) as { host?: string; force?: boolean };
      return withClient(options.host, async (client) => {
        const response = await client.disconnectHub(options.force ?? false);
        return result(response.status, response.warning);
      });
    }),
  );
  return hub;
}
