/** Local-only Phase 2 review harness. No build, package installation, or deployment. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";

if (process.env.NODE_ENV === "production")
  throw new Error("The Phase 2 mock preview must not run in production.");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ts": "text/javascript; charset=utf-8",
};
const app = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let file;
    // Explicit serving boundary: never expose source docs, fixture JSON, .git, or credentials.
    if (
      /^\/src\/interface\/[a-z-]+\.(ts|css)$/.test(path) ||
      /^\/src\/mocks\/(client|fixtures)\.ts$/.test(path)
    )
      file = resolve(root, "." + path);
    else if (path === "/mock-assets/item-placeholder.svg")
      file = resolve(root, "public/mock-assets/item-placeholder.svg");
    else if (
      path === "/" ||
      /^\/sign-in\/?$/.test(path) ||
      /^\/my\/claims(?:\/[^/.]+)?\/?$/.test(path) ||
      /^\/o\/[^/.]+\/(?:search|items\/[^/.]+(?:\/claim)?|staff(?:\/items(?:\/[^/.]+)?|\/claims(?:\/[^/.]+)?)?)\/?$/.test(
        path,
      )
    )
      file = resolve(root, "tools/phase2-preview.html");
    else {
      res.writeHead(404);
      res.end("Unavailable");
      return;
    }
    if (!file.startsWith(root + sep)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = "." + file.split(".").pop();
    const raw = await readFile(file, "utf8");
    const body =
      ext === ".ts" ? stripTypeScriptTypes(raw, { mode: "strip" }) : raw;
    res.writeHead(200, {
      "Content-Type": mime[ext] || "text/plain; charset=utf-8",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404);
    res.end("Unavailable");
  }
});
const port = Number(process.env.LOSTLINK_PREVIEW_PORT || 4173);
app.listen(port, "127.0.0.1", () =>
  console.log(
    `LostLink Phase 2 preview: http://127.0.0.1:${port} (fictional, in-memory, local only)`,
  ),
);
