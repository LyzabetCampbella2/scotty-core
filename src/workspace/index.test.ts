import { describe, expect, test } from "bun:test";
import { handleWorkspace } from "./index.ts";

describe("workspace safety gates", () => {
  test("workspace is disabled unless explicitly enabled", async () => {
    const previous = process.env.SCOTTY_WORKSPACE_ENABLED;
    delete process.env.SCOTTY_WORKSPACE_ENABLED;
    try {
      const response = await handleWorkspace(new Request("https://scotty.test/api/workspace/projects"), new URL("https://scotty.test/api/workspace/projects"));
      expect(response.status).toBe(503);
      expect((await response.json()).error).toBe("Project workspace is disabled");
    } finally {
      if (previous === undefined) delete process.env.SCOTTY_WORKSPACE_ENABLED;
      else process.env.SCOTTY_WORKSPACE_ENABLED = previous;
    }
  });

  test("workspace rejects unauthenticated requests before database access", async () => {
    const previousEnabled = process.env.SCOTTY_WORKSPACE_ENABLED;
    const previousToken = process.env.SCOTTY_WORKSPACE_ADMIN_TOKEN;
    const previousBrainToken = process.env.SCOTTY_BRAIN_ADMIN_TOKEN;
    process.env.SCOTTY_WORKSPACE_ENABLED = "true";
    delete process.env.SCOTTY_WORKSPACE_ADMIN_TOKEN;
    delete process.env.SCOTTY_BRAIN_ADMIN_TOKEN;
    try {
      const response = await handleWorkspace(new Request("https://scotty.test/api/workspace/projects"), new URL("https://scotty.test/api/workspace/projects"));
      expect(response.status).toBe(401);
    } finally {
      if (previousEnabled === undefined) delete process.env.SCOTTY_WORKSPACE_ENABLED;
      else process.env.SCOTTY_WORKSPACE_ENABLED = previousEnabled;
      if (previousToken === undefined) delete process.env.SCOTTY_WORKSPACE_ADMIN_TOKEN;
      else process.env.SCOTTY_WORKSPACE_ADMIN_TOKEN = previousToken;
      if (previousBrainToken === undefined) delete process.env.SCOTTY_BRAIN_ADMIN_TOKEN;
      else process.env.SCOTTY_BRAIN_ADMIN_TOKEN = previousBrainToken;
    }
  });
});
