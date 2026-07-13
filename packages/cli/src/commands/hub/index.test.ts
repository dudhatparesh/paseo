import { describe, expect, test } from "vitest";
import { assertLocalHubManagementTarget } from "./index.js";

describe("Hub CLI target authority", () => {
  test.each(["relay.paseo.test:443", "tcp://10.0.0.5:6767?ssl=true"])(
    "rejects non-local explicit target %s before connect",
    (host) => {
      expect(() => assertLocalHubManagementTarget(host, {})).toThrow(
        "Hub relationship management requires a local daemon target",
      );
    },
  );

  test.each([
    undefined,
    "localhost:6767",
    "127.0.0.1:6767",
    "[::1]:6767",
    "[0:0:0:0:0:0:0:1]:6767",
    "unix:///tmp/paseo.sock",
  ])("accepts local target %s", (host) => {
    expect(() => assertLocalHubManagementTarget(host, {})).not.toThrow();
  });

  test("rejects a non-local PASEO_HOST target", () => {
    expect(() =>
      assertLocalHubManagementTarget(undefined, { PASEO_HOST: "hub.test:6767" }),
    ).toThrow("Hub relationship management requires a local daemon target");
  });
});
