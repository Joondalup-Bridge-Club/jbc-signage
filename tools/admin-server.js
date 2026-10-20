#!/usr/bin/env node
// Local-only admin helper for the JBC signage project. Node built-ins only.
// Serves the project folder plus a tiny API that reads/writes an allowlist of JSON files.
// Usage: node tools/admin-server.js [port]     then open http://localhost:8787/admin/

"use strict";

const { createServer } = require("node:http");
const fs = require("node:fs").promises;
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8787);
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

// Only these project-relative paths can be written (and listed) through the API.
const JSON_ALLOWLIST = [
  /^config\/signage\.json$/,
  /^config\/emergency\.json$/,
  /^config\/playlists\/[A-Za-z0-9_-]{1,60}\.json$/,
  /^data\/[A-Za-z0-9_-]{1,60}\.json$/,
  /^tools\/source\/club-data\.json$/,
];
const UPLOAD_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".pdf", ".md", ".mp4", ".webm"]);
// Letters/digits start the name; no path separators or characters that break URLs (# ? % : etc.).
const UPLOAD_NAME = /^[\p{L}\p{N}][\p{L}\p{N} ,._()&'!@+=~-]{0,150}$/u;

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf", ".md": "text/plain; charset=utf-8",
  ".mp4": "video/mp4", ".webm": "video/webm", ".ico": "image/x-icon",
};

const isAllowedJson = (rel) => JSON_ALLOWLIST.some((rule) => rule.test(rel));

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": typeof body === "object" && !Buffer.isBuffer(body) ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(payload);
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("Request too large."), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function walk(dir, results = []) {
  for (const entry of await fs.readdir(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(rel, results);
    else results.push(rel);
  }
  return results;
}

async function atomicWrite(rel, contents) {
  const target = path.join(ROOT, rel);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.tmp-${process.pid}`;
  await fs.writeFile(temp, contents);
  await fs.rename(temp, target);
}

async function handleApi(req, res, url) {
  // Block cross-site requests: browsers always send Origin on writes and fetches from other sites.
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: "Cross-origin request refused." });
  if (req.method !== "GET" && req.headers["x-jbc-admin"] !== "1") return send(res, 403, { error: "Missing admin header." });

  const rel = url.searchParams.get("path") ?? "";

  if (url.pathname === "/api/files" && req.method === "GET") {
    const files = [];
    for (const dir of ["config", "data", "tools/source"]) {
      for (const file of await walk(dir)) if (isAllowedJson(file)) files.push(file);
    }
    return send(res, 200, { files });
  }

  if (url.pathname === "/api/assets" && req.method === "GET") {
    const files = (await walk("slides")).filter((file) => UPLOAD_EXTENSIONS.has(path.extname(file).toLowerCase()));
    return send(res, 200, { files });
  }

  if (url.pathname === "/api/file") {
    if (!isAllowedJson(rel)) return send(res, 400, { error: "That file is not editable." });
    if (req.method === "GET") {
      try {
        return send(res, 200, await fs.readFile(path.join(ROOT, rel), "utf8"), { "Content-Type": "application/json; charset=utf-8" });
      } catch (error) {
        if (error.code === "ENOENT") return send(res, 404, { error: "File not found." });
        throw error;
      }
    }
    if (req.method === "PUT") {
      const text = (await readBody(req, MAX_JSON_BYTES)).toString("utf8");
      try {
        JSON.parse(text);
      } catch {
        return send(res, 400, { error: "Body is not valid JSON." });
      }
      await atomicWrite(rel, `${JSON.stringify(JSON.parse(text), null, 2)}\n`);
      return send(res, 200, { ok: true });
    }
  }

  if (url.pathname === "/api/upload" && req.method === "POST") {
    const name = url.searchParams.get("name") ?? "";
    if (!UPLOAD_NAME.test(name) || name.includes("..") || !UPLOAD_EXTENSIONS.has(path.extname(name).toLowerCase())) {
      return send(res, 400, { error: "Unsupported file name or type." });
    }
    const body = await readBody(req, MAX_UPLOAD_BYTES);
    if (!body.length) return send(res, 400, { error: "Empty upload." });
    await atomicWrite(`slides/${name}`, body);
    return send(res, 200, { ok: true, path: `slides/${name}` });
  }

  return send(res, 404, { error: "Unknown API route." });
}

async function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    return send(res, 400, "Bad request");
  }
  if (rel.endsWith("/")) rel += "index.html";
  const target = path.resolve(ROOT, `.${rel}`);
  const relative = path.relative(ROOT, target);
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative.split(path.sep).some((part) => part.startsWith(".") || part === "node_modules")) {
    return send(res, 404, "Not found");
  }
  try {
    const body = await fs.readFile(target);
    res.writeHead(200, { "Content-Type": MIME[path.extname(target).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    send(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    // Defends against DNS rebinding: only accept requests addressed to this machine.
    const hostName = (req.headers.host ?? "").replace(/:\d+$/, "");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(hostName)) return send(res, 403, "Forbidden host");
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    send(res, error.status ?? 500, { error: error.status === 413 ? error.message : "Server error." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`JBC signage admin helper running (local only).`);
  console.log(`  Admin GUI:      http://localhost:${PORT}/admin/`);
  console.log(`  Signage preview: http://localhost:${PORT}/`);
  console.log("Edits are saved to project files. Review and commit them in VS Code. Press Ctrl+C to stop.");
});
