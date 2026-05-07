const { toCsv } = require("../utils/csv");
const leadService = require("../services/leadService");
const leadServiceInMemory = require("../services/leadServiceInMemory");
const { isMemoryMode } = require("../initDb");

function getLeadService() {
  return isMemoryMode() ? leadServiceInMemory : leadService;
}

const VALID_TEMPERATURES = new Set(["hot", "warm", "cold"]);
const VALID_SOURCES = new Set(["manual", "card", "qr"]);

function normalizePayload(body, { partial = false } = {}) {
  const normalized = {};

  const fields = {
    name: (value) => value.trim(),
    phone: (value) => value.trim(),
    company: (value) => value.trim(),
    notes: (value) => value.trim(),
    temperature: (value) => value.trim().toLowerCase(),
    source: (value) => value.trim().toLowerCase(),
    cardImageUrl: (value) => value.trim(),
  };

  Object.entries(fields).forEach(([key, formatter]) => {
    if (typeof body[key] === "string") {
      normalized[key] = formatter(body[key]);
    } else if (!partial) {
      if (key === "temperature") {
        normalized[key] = "warm";
      } else if (key === "source") {
        normalized[key] = "manual";
      } else {
        normalized[key] = "";
      }
    }
  });

  return normalized;
}

function validateLeadPayload(payload, { partial = false } = {}) {
  if (!partial || payload.name) {
    if (!payload.name) {
      return "Name is required.";
    }
  }

  if (!partial || payload.phone) {
    if (!payload.phone) {
      return "Phone is required.";
    }
  }

  if (payload.temperature && !VALID_TEMPERATURES.has(payload.temperature)) {
    return "Temperature must be hot, warm, or cold.";
  }

  if (payload.source && !VALID_SOURCES.has(payload.source)) {
    return "Source must be manual, card, or qr.";
  }

  return null;
}

function parseListFilters(query) {
  const page = Math.max(Number.parseInt(query.page || "1", 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number.parseInt(query.pageSize || "20", 10) || 20, 1),
    100
  );

  return {
    temperature: query.temperature,
    date: query.date,
    search: typeof query.search === "string" ? query.search.trim() : "",
    page,
    pageSize,
  };
}

async function listLeads(req, res, next) {
  try {
    const filters = parseListFilters(req.query);
    if (req.auth && req.auth.user) filters.userId = req.auth.user.id;
    const result = await getLeadService().listLeads(filters);
    res.json({
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.max(Math.ceil(result.total / result.pageSize), 1),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createLead(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    const validationError = validateLeadPayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    if (req.auth && req.auth.user) payload.userId = req.auth.user.id;
    const lead = await getLeadService().createLead(payload);
    res.status(201).json({ data: lead });
  } catch (error) {
    next(error);
  }
}

async function updateLead(req, res, next) {
  try {
    const payload = normalizePayload(req.body, { partial: true });
    const validationError = validateLeadPayload(payload, { partial: true });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    const lead = await getLeadService().updateLead(req.params.id, payload, req.auth?.user?.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found." });
    }
    res.json({ data: lead });
  } catch (error) {
    next(error);
  }
}

async function exportLeads(req, res, next) {
  try {
    const filters = parseListFilters({ ...req.query, page: "1", pageSize: "1000" });
    if (req.auth && req.auth.user) filters.userId = req.auth.user.id;
    const result = await getLeadService().listLeads(filters);
    const csv = toCsv(result.items);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="expo-leads-${stamp}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

async function markLeadContacted(req, res, next) {
  try {
    const lead = await getLeadService().markLeadContacted(req.params.id, req.auth?.user?.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found." });
    }
    res.json({ data: lead });
  } catch (error) {
    next(error);
  }
}

async function setLeadContactStatus(req, res, next) {
  try {
    const marked = Boolean(req.body?.marked);
    const lead = await getLeadService().setLeadContactStatus(req.params.id, marked, req.auth?.user?.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found." });
    }
    res.json({ data: lead });
  } catch (error) {
    next(error);
  }
}

async function deleteLead(req, res, next) {
  try {
    const deleted = await getLeadService().deleteLead(req.params.id, req.auth?.user?.id);
    if (!deleted) {
      return res.status(404).json({ error: "Lead not found." });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function getLeadStats(req, res, next) {
  try {
    const filters = {
      temperature: req.query.temperature,
      date: req.query.date,
      search: typeof req.query.search === "string" ? req.query.search.trim() : "",
    };
    if (req.auth && req.auth.user) filters.userId = req.auth.user.id;
    const stats = await getLeadService().getLeadStats(filters);
    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
}

async function getDailyStats(req, res, next) {
  try {
    const filters = {};
    if (req.auth && req.auth.user) filters.userId = req.auth.user.id;
    // Fall back to basic stats if in memory mode (no daily query available)
    const service = getLeadService();
    if (typeof service.getDailyStats !== "function") {
      return res.json({ data: [] });
    }
    const data = await service.getDailyStats(filters);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listLeads,
  createLead,
  updateLead,
  exportLeads,
  markLeadContacted,
  setLeadContactStatus,
  deleteLead,
  getLeadStats,
  getDailyStats,
};
