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

  test("owner session cookie is accepted without exposing the bearer token to the HUD", async () => {
    const previousEnabled = process.env.SCOTTY_WORKSPACE_ENABLED;
    const previousOwner = process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
    process.env.SCOTTY_WORKSPACE_ENABLED = "true";
    process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN = "test-owner-session";
    try {
      const response = await handleWorkspace(
        new Request("https://scotty-core.onrender.com/api/workspace/projects", {
          headers: { cookie: "scotty_owner_session=test-owner-session" }
        }),
        new URL("https://scotty-core.onrender.com/api/workspace/projects")
      );
      // Authenticated GET proceeds to DB initialization; no DATABASE_URL means the
      // handler returns a DB configuration error rather than an authentication error.
      expect(response.status).not.toBe(401);
    } finally {
      if (previousEnabled === undefined) delete process.env.SCOTTY_WORKSPACE_ENABLED;
      else process.env.SCOTTY_WORKSPACE_ENABLED = previousEnabled;
      if (previousOwner === undefined) delete process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
      else process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN = previousOwner;
    }
  });

  test("cookie-authenticated writes require the CSRF header before database access", async () => {
    const previousEnabled = process.env.SCOTTY_WORKSPACE_ENABLED;
    const previousOwner = process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
    process.env.SCOTTY_WORKSPACE_ENABLED = "true";
    process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN = "test-owner-session";
    try {
      const response = await handleWorkspace(
        new Request("https://scotty-core.onrender.com/api/workspace/projects", {
          method: "POST",
          headers: {
            cookie: "scotty_owner_session=test-owner-session",
            origin: "https://scotty-cloud-hud.vercel.app",
            "content-type": "application/json"
          },
          body: JSON.stringify({ id: "test", name: "Test" })
        }),
        new URL("https://scotty-core.onrender.com/api/workspace/projects")
      );
      expect(response.status).toBe(403);
      expect((await response.json()).error).toBe("CSRF header required");
    } finally {
      if (previousEnabled === undefined) delete process.env.SCOTTY_WORKSPACE_ENABLED;
      else process.env.SCOTTY_WORKSPACE_ENABLED = previousEnabled;
      if (previousOwner === undefined) delete process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
      else process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN = previousOwner;
    }
  });

});