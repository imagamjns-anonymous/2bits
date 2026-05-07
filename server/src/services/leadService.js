const db = require("../db");

function mapLead(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    company: row.company || "",
    notes: row.notes || "",
    temperature: row.temperature,
    source: row.source,
    cardImageUrl: row.card_image_url || "",
    lastContactedAt: row.last_contacted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildFilterQuery(userId, filters = {}) {
  const clauses = [];
  const values = [];

  if (userId !== undefined && userId !== null) {
    values.push(userId);
    clauses.push(`user_id = ?`);
  }

  if (filters.temperature && filters.temperature !== "all") {
    values.push(filters.temperature);
    clauses.push(`temperature = ?`);
  }

  if (filters.date) {
    values.push(filters.date);
    clauses.push(`DATE(created_at) = ?`);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    values.push(term, term, term, term);
    clauses.push(
      `(name LIKE ? COLLATE NOCASE OR phone LIKE ? COLLATE NOCASE OR company LIKE ? COLLATE NOCASE OR notes LIKE ? COLLATE NOCASE)`
    );
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { values, whereClause };
}

async function listLeads(filters = {}) {
  const { userId } = filters;
  const { whereClause, values } = buildFilterQuery(userId, filters);
  const page = Number.isFinite(filters.page) ? filters.page : 1;
  const pageSize = Number.isFinite(filters.pageSize) ? filters.pageSize : 20;
  const offset = (page - 1) * pageSize;

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM leads ${whereClause}`,
    [...values]
  );

  const result = await db.query(
    `SELECT * FROM leads ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );

  return {
    items: (result.rows || []).map(mapLead),
    total: countResult.rows[0]?.total || 0,
    page,
    pageSize,
  };
}

async function createLead(payload) {
  const result = await db.query(
    `INSERT INTO leads (user_id, name, phone, company, notes, temperature, source, card_image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.userId || null,
      payload.name,
      payload.phone,
      payload.company || "",
      payload.notes || "",
      payload.temperature,
      payload.source,
      payload.cardImageUrl || "",
    ]
  );

  // Turso/libSQL returns lastInsertRowid
  const insertId = result.lastInsertRowid;
  const newLead = await db.query(`SELECT * FROM leads WHERE id = ?`, [insertId]);
  return mapLead(newLead.rows[0]);
}

async function updateLead(id, payload, userId) {
  const fields = [];
  const values = [];
  const allowedFields = {
    name: "name",
    phone: "phone",
    company: "company",
    notes: "notes",
    temperature: "temperature",
    source: "source",
    cardImageUrl: "card_image_url",
    lastContactedAt: "last_contacted_at",
  };

  Object.entries(allowedFields).forEach(([key, column]) => {
    if (payload[key] !== undefined) {
      values.push(payload[key]);
      fields.push(`${column} = ?`);
    }
  });

  if (!fields.length) {
    const existingLead = await db.query("SELECT * FROM leads WHERE id = ?", [id]);
    return existingLead.rows[0] ? mapLead(existingLead.rows[0]) : null;
  }

  const whereClause = userId !== undefined && userId !== null
    ? "WHERE id = ? AND user_id = ?"
    : "WHERE id = ?";
  values.push(id);
  if (userId !== undefined && userId !== null) values.push(userId);

  await db.query(
    `UPDATE leads SET ${fields.join(", ")} ${whereClause}`,
    values
  );

  const updated = await db.query("SELECT * FROM leads WHERE id = ?", [id]);
  return updated.rows[0] ? mapLead(updated.rows[0]) : null;
}

async function markLeadContacted(id, userId) {
  const whereClause = userId !== undefined && userId !== null
    ? "WHERE id = ? AND user_id = ?"
    : "WHERE id = ?";
  const values = userId !== undefined && userId !== null ? [id, userId] : [id];

  await db.query(
    `UPDATE leads SET last_contacted_at = CURRENT_TIMESTAMP ${whereClause}`,
    values
  );

  const result = await db.query("SELECT * FROM leads WHERE id = ?", [id]);
  return result.rows[0] ? mapLead(result.rows[0]) : null;
}

async function setLeadContactStatus(id, marked, userId) {
  const setClause = marked
    ? "last_contacted_at = COALESCE(last_contacted_at, CURRENT_TIMESTAMP)"
    : "last_contacted_at = NULL";

  const whereClause = userId !== undefined && userId !== null
    ? "WHERE id = ? AND user_id = ?"
    : "WHERE id = ?";
  const values = userId !== undefined && userId !== null ? [id, userId] : [id];

  await db.query(`UPDATE leads SET ${setClause} ${whereClause}`, values);

  const result = await db.query("SELECT * FROM leads WHERE id = ?", [id]);
  return result.rows[0] ? mapLead(result.rows[0]) : null;
}

async function deleteLead(id, userId) {
  const whereClause = userId !== undefined && userId !== null
    ? "WHERE id = ? AND user_id = ?"
    : "WHERE id = ?";
  const values = userId !== undefined && userId !== null ? [id, userId] : [id];

  const result = await db.query(`DELETE FROM leads ${whereClause}`, values);
  return result.rowsAffected > 0;
}

async function getLeadStats(filters = {}) {
  const { userId } = filters;
  const { whereClause, values } = buildFilterQuery(userId, filters);

  const result = await db.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN temperature = 'hot' THEN 1 ELSE 0 END) AS hot,
       SUM(CASE WHEN temperature = 'warm' THEN 1 ELSE 0 END) AS warm,
       SUM(CASE WHEN temperature = 'cold' THEN 1 ELSE 0 END) AS cold,
       SUM(CASE WHEN last_contacted_at IS NOT NULL THEN 1 ELSE 0 END) AS contacted
     FROM leads
     ${whereClause}`,
    values
  );

  return result.rows[0];
}

async function getDailyStats(filters = {}) {
  const { userId } = filters;
  const userClause = (userId !== undefined && userId !== null) ? "AND user_id = ?" : "";
  const values = (userId !== undefined && userId !== null) ? [userId] : [];

  // Get last 7 days as YYYY-MM-DD strings
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const result = await db.query(
    `SELECT DATE(created_at) as day,
       COUNT(*) as total,
       SUM(CASE WHEN temperature = 'hot' THEN 1 ELSE 0 END) as hot,
       SUM(CASE WHEN temperature = 'warm' THEN 1 ELSE 0 END) as warm,
       SUM(CASE WHEN temperature = 'cold' THEN 1 ELSE 0 END) as cold
     FROM leads
     WHERE DATE(created_at) >= ? ${userClause}
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [days[0], ...values]
  );

  // Map results by day, filling 0 for days with no leads
  const byDay = {};
  (result.rows || []).forEach(row => {
    byDay[row.day] = row;
  });

  return days.map(day => ({
    day,
    label: new Date(day + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    total: byDay[day]?.total || 0,
    hot: byDay[day]?.hot || 0,
    warm: byDay[day]?.warm || 0,
    cold: byDay[day]?.cold || 0,
  }));
}

module.exports = {
  listLeads,
  createLead,
  updateLead,
  markLeadContacted,
  setLeadContactStatus,
  deleteLead,
  getLeadStats,
  getDailyStats,
};
