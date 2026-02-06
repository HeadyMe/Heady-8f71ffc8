/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  HEADY MANAGER - Node.js MCP Server & API Gateway               ║
 * ║  Sacred Geometry Architecture v3.0.0                             ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const PORT = Number(process.env.PORT || 3300);
const app = express();

// ─── Middleware ─────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
  credentials: true,
}));
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Static Assets ─────────────────────────────────────────────────
const frontendBuildPath = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
}
app.use(express.static("public"));

// ─── Utility ────────────────────────────────────────────────────────
function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

// ─── Health & Pulse ─────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "heady-manager",
    version: "3.0.0",
    ts: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.get("/api/pulse", (req, res) => {
  res.json({
    ok: true,
    service: "heady-manager",
    version: "3.0.0",
    ts: new Date().toISOString(),
    status: "active",
    endpoints: ["/api/health", "/api/registry", "/api/nodes", "/api/pipeline/*"],
  });
});

// ─── Registry ───────────────────────────────────────────────────────
const REGISTRY_PATH = path.join(__dirname, ".heady", "registry.json");

function loadRegistry() {
  return readJsonSafe(REGISTRY_PATH) || { nodes: {}, tools: {}, workflows: {}, services: {}, skills: {}, metadata: {} };
}

function saveRegistry(data) {
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2), "utf8");
}

app.get("/api/registry", (req, res) => {
  const registryPath = path.join(__dirname, "heady-registry.json");
  const registry = readJsonSafe(registryPath);
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json(registry);
});

// ─── Node Management ────────────────────────────────────────────────
app.get("/api/nodes", (req, res) => {
  const reg = loadRegistry();
  const nodes = Object.entries(reg.nodes || {}).map(([id, n]) => ({ id, ...n }));
  res.json({ total: nodes.length, active: nodes.filter(n => n.status === "active").length, nodes, ts: new Date().toISOString() });
});

app.get("/api/nodes/:nodeId", (req, res) => {
  const reg = loadRegistry();
  const node = reg.nodes[req.params.nodeId.toUpperCase()];
  if (!node) return res.status(404).json({ error: `Node '${req.params.nodeId}' not found` });
  res.json({ id: req.params.nodeId.toUpperCase(), ...node });
});

app.post("/api/nodes/:nodeId/activate", (req, res) => {
  const reg = loadRegistry();
  const id = req.params.nodeId.toUpperCase();
  if (!reg.nodes[id]) return res.status(404).json({ error: `Node '${id}' not found` });
  reg.nodes[id].status = "active";
  reg.nodes[id].last_invoked = new Date().toISOString();
  saveRegistry(reg);
  res.json({ success: true, node: id, status: "active" });
});

app.post("/api/nodes/:nodeId/deactivate", (req, res) => {
  const reg = loadRegistry();
  const id = req.params.nodeId.toUpperCase();
  if (!reg.nodes[id]) return res.status(404).json({ error: `Node '${id}' not found` });
  reg.nodes[id].status = "available";
  saveRegistry(reg);
  res.json({ success: true, node: id, status: "available" });
});

// ─── System Status & Production Activation ──────────────────────────
app.get("/api/system/status", (req, res) => {
  const reg = loadRegistry();
  const nodeList = Object.entries(reg.nodes || {});
  const activeNodes = nodeList.filter(([, n]) => n.status === "active").length;

  res.json({
    system: "Heady Systems",
    version: "3.0.0",
    environment: (reg.metadata || {}).environment || "development",
    production_ready: activeNodes === nodeList.length && nodeList.length > 0,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    capabilities: {
      nodes: { total: nodeList.length, active: activeNodes },
      tools: { total: Object.keys(reg.tools || {}).length },
      workflows: { total: Object.keys(reg.workflows || {}).length },
      services: { total: Object.keys(reg.services || {}).length },
    },
    sacred_geometry: { architecture: "active", organic_systems: activeNodes === nodeList.length },
    ts: new Date().toISOString(),
  });
});

app.post("/api/system/production", (req, res) => {
  const reg = loadRegistry();
  const ts = new Date().toISOString();
  const report = { nodes: [], tools: [], workflows: [], services: [] };

  for (const [name, node] of Object.entries(reg.nodes || {})) {
    node.status = "active"; node.last_invoked = ts; report.nodes.push(name);
  }
  for (const [name, tool] of Object.entries(reg.tools || {})) {
    tool.status = "active"; report.tools.push(name);
  }
  for (const [name, wf] of Object.entries(reg.workflows || {})) {
    wf.status = "active"; report.workflows.push(name);
  }
  for (const [name, svc] of Object.entries(reg.services || {})) {
    svc.status = name === "heady-manager" ? "healthy" : "active"; report.services.push(name);
  }
  for (const [, sk] of Object.entries(reg.skills || {})) { sk.status = "active"; }

  reg.metadata = { ...reg.metadata, last_updated: ts, version: "3.0.0-production", environment: "production", all_nodes_active: true, production_activated_at: ts };
  saveRegistry(reg);

  res.json({
    success: true,
    environment: "production",
    activated: { nodes: report.nodes.length, tools: report.tools.length, workflows: report.workflows.length, services: report.services.length },
    sacred_geometry: "FULLY_ACTIVATED",
    ts,
  });
});

// ─── HeadyBuddy Companion API ────────────────────────────────────────
app.post("/api/buddy/chat", (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  // Placeholder response engine — wire to LLM backend (PYTHIA / OpenAI / local) when ready
  const suggestions = [
    "I can help you plan your day — just say 'plan my day'!",
    "Try asking me to summarize something, or open HeadyAutoIDE.",
    "I'm here whenever you need me. What's on your mind?",
    "Let me know if you'd like step-by-step guidance on anything.",
    "Ready to help you build something great today!",
  ];

  const reply = suggestions[Math.floor(Math.random() * suggestions.length)];

  res.json({
    ok: true,
    reply,
    context: {
      messagesReceived: (history || []).length + 1,
      engine: "placeholder",
      note: "Wire to PYTHIA or external LLM for production responses.",
    },
    ts: new Date().toISOString(),
  });
});

app.get("/api/buddy/health", (req, res) => {
  res.json({
    ok: true,
    service: "headybuddy",
    status: "active",
    engine: "placeholder",
    ts: new Date().toISOString(),
  });
});

app.get("/api/buddy/suggestions", (req, res) => {
  const hour = new Date().getHours();
  let contextChips;

  if (hour < 12) {
    contextChips = [
      { label: "Plan my morning", prompt: "Help me plan a productive morning." },
      { label: "Review goals", prompt: "What are my priorities for today?" },
      { label: "Quick win", prompt: "Suggest a quick task I can knock out right now." },
    ];
  } else if (hour < 17) {
    contextChips = [
      { label: "Plan afternoon", prompt: "Help me plan the rest of my afternoon." },
      { label: "Focus session", prompt: "Set up a 25-minute focus session for me." },
      { label: "Take a break", prompt: "I need a break. Suggest something refreshing." },
    ];
  } else {
    contextChips = [
      { label: "Wrap up day", prompt: "Help me wrap up and review what I accomplished today." },
      { label: "Tomorrow prep", prompt: "Help me prepare for tomorrow." },
      { label: "Learn something", prompt: "Teach me something interesting in 2 minutes." },
    ];
  }

  res.json({ ok: true, suggestions: contextChips, ts: new Date().toISOString() });
});

// ─── Pipeline Placeholder (wire up src/hc_pipeline.js when ready) ───
app.get("/api/pipeline/config", (req, res) => {
  res.json({ status: "idle", message: "Pipeline engine not yet initialized. Wire up src/hc_pipeline.js." });
});

app.post("/api/pipeline/run", (req, res) => {
  res.json({ status: "idle", message: "Pipeline engine not yet initialized." });
});

app.get("/api/pipeline/state", (req, res) => {
  res.json({ status: "idle", message: "No pipeline run in progress." });
});

// ─── Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("HeadyManager Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    ts: new Date().toISOString(),
  });
});

// ─── SPA Fallback ───────────────────────────────────────────────────
app.get("*", (req, res) => {
  const indexPath = path.join(frontendBuildPath, "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).json({ error: "Not found" });
});

// ─── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ∞ Heady Manager v3.0.0 listening on port ${PORT}`);
  console.log(`  ∞ Health: http://localhost:${PORT}/api/health`);
  console.log(`  ∞ Environment: ${process.env.NODE_ENV || "development"}\n`);
});
