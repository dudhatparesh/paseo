import { afterEach, expect, test } from "vitest";
import { HubRelationshipHarness } from "./test-utils/relationship-harness.js";

let relationship: HubRelationshipHarness | null = null;

afterEach(async () => {
  await relationship?.close();
  relationship = null;
});

async function launchRelationship(): Promise<HubRelationshipHarness> {
  const launched = await HubRelationshipHarness.start();
  await launched.beginConnect().result;
  launched.connectLatestSocket();
  relationship = launched;
  return launched;
}

test("sequential replay after reconstruction keeps one durable owned agent", async () => {
  const hub = await launchRelationship();
  const created = await hub.createOwnedConcurrently();

  const reconstructed = await hub.reconstructAndReplay();

  expect(reconstructed.replay.agent.id).toBe(created.first.agentId);
  expect(reconstructed.reconciliation?.agent.id).toBe(created.first.agentId);
  expect(reconstructed.durableAgentCount).toBe(1);
});

test("removing an owned agent removes its reconstructed execution association", async () => {
  const hub = await launchRelationship();
  const created = await hub.createOwnedConcurrently();

  const removed = await hub.removeAndReconcile(created.first.agentId);

  expect(removed.reconciliation).toBeNull();
  expect(removed.durableAgentCount).toBe(0);
});

test("a failed Hub create removes its auto-created worktree", async () => {
  const hub = await launchRelationship();
  hub.beginOwnedCreate("failed-worktree-create", "failed-worktree-execution", {
    modeId: "missing-mode",
    worktree: { mode: "branch-off", newBranch: "failed-hub-create" },
  });

  const response = await hub.ownedCreateResult("failed-worktree-create");

  expect(response).toMatchObject({
    type: "hub.agent.create.response",
    payload: { success: false, executionId: "failed-worktree-execution" },
  });
  expect(await hub.listedWorktrees()).toHaveLength(1);
  expect(await hub.durableOwnedAgentIds()).toEqual([]);
});
