// In-memory lead storage for preview without database
let leads = [];
let idCounter = 1;

function mapLead(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    company: row.company || "",
    notes: row.notes || "",
    temperature: row.temperature,
    source: row.source,
    cardImageUrl: row.cardImageUrl || "",
    lastContactedAt: row.lastContactedAt,
    createdAt: row.createdAt || new Date().toISOString(),
    updatedAt: row.updatedAt || new Date().toISOString(),
  };
}

function buildFilterQuery(filters = {}) {
  return leads.filter((lead) => {
    if (filters.temperature && filters.temperature !== "all" && lead.temperature !== filters.temperature) {
      return false;
    }
    if (filters.date) {
      const leadDate = new Date(lead.createdAt).toISOString().split("T")[0];
      if (leadDate !== filters.date) return false;
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        lead.name.toLowerCase().includes(search) ||
        lead.phone.toLowerCase().includes(search) ||
        lead.company.toLowerCase().includes(search) ||
        lead.notes.toLowerCase().includes(search)
      );
    }
    return true;
  });
}

async function listLeads(filters = {}) {
  const { userId, page = 1, pageSize = 20, ...filterOptions } = filters;
  const filtered = buildFilterQuery(filterOptions);
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map(mapLead);
  return { items, total, page, pageSize };
}

async function createLead(payload) {
  const newLead = {
    id: idCounter++,
    name: payload.name,
    phone: payload.phone,
    company: payload.company || "",
    notes: payload.notes || "",
    temperature: payload.temperature,
    source: payload.source,
    cardImageUrl: payload.cardImageUrl || "",
    lastContactedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  leads.push(newLead);
  return mapLead(newLead);
}

async function updateLead(id, payload) {
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) return null;
  const lead = leads[index];
  const allowedFields = {
    name: "name",
    phone: "phone",
    company: "company",
    notes: "notes",
    temperature: "temperature",
    source: "source",
    cardImageUrl: "cardImageUrl",
    lastContactedAt: "lastContactedAt",
  };
  Object.entries(allowedFields).forEach(([key, field]) => {
    if (payload[key] !== undefined) {
      lead[field] = payload[key];
    }
  });
  lead.updatedAt = new Date().toISOString();
  leads[index] = lead;
  return mapLead(lead);
}

async function markLeadContacted(id) {
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) return null;
  leads[index].lastContactedAt = new Date().toISOString();
  return mapLead(leads[index]);
}

async function setLeadContactStatus(id, marked) {
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) return null;
  leads[index].lastContactedAt = marked ? new Date().toISOString() : null;
  return mapLead(leads[index]);
}

async function deleteLead(id) {
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) return false;
  leads.splice(index, 1);
  return true;
}

async function getLeadStats(filters = {}) {
  const { userId, ...filterOptions } = filters;
  const filtered = buildFilterQuery(filterOptions);
  return {
    total: filtered.length,
    hot: filtered.filter((l) => l.temperature === "hot").length,
    warm: filtered.filter((l) => l.temperature === "warm").length,
    cold: filtered.filter((l) => l.temperature === "cold").length,
    contacted: filtered.filter((l) => l.lastContactedAt !== null).length,
  };
}

module.exports = {
  listLeads,
  createLead,
  updateLead,
  markLeadContacted,
  setLeadContactStatus,
  deleteLead,
  getLeadStats,
};
