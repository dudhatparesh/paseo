import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, expect, test } from "vitest";
import { DirectHubRelationshipRemote } from "./relationship-remote.js";

const openServers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => closeServer(server)));
});

test.each([401, 403, 404])(
  "revocation status %s clears already-invalid local authority",
  async (status) => {
    const hubOrigin = await startHubReturning(status);
    const remote = new DirectHubRelationshipRemote();

    await expect(
      remote.revoke({ relationshipId: "relationship-1", hubOrigin, credential: "invalid" }),
    ).resolves.toBeUndefined();
  },
);

test("transient revocation failures remain retryable", async () => {
  const hubOrigin = await startHubReturning(503);
  const remote = new DirectHubRelationshipRemote();

  await expect(
    remote.revoke({ relationshipId: "relationship-1", hubOrigin, credential: "credential" }),
  ).rejects.toThrow("Hub revocation failed (503)");
});

async function startHubReturning(status: number): Promise<string> {
  const server = createServer((_request, response) => {
    response.writeHead(status).end();
  });
  openServers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
