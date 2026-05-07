function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/$/, "");
}

function buildQuery(filters = {}) {
  const searchParams = new URLSearchParams();

  if (filters.temperature && filters.temperature !== "all") {
    searchParams.set("temperature", filters.temperature);
  }

  if (filters.date) {
    searchParams.set("date", filters.date);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

async function getLeads(baseUrl, filters) {
  const query = buildQuery({
    ...filters,
    page: 1,
    pageSize: 100,
  });
  const response = await requestJson(`${normalizeBaseUrl(baseUrl)}/leads${query}`);
  return response.data;
}

async function createLead(baseUrl, payload) {
  const response = await requestJson(`${normalizeBaseUrl(baseUrl)}/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return response.data;
}

async function updateLead(baseUrl, leadId, payload) {
  const response = await requestJson(
    `${normalizeBaseUrl(baseUrl)}/leads/${leadId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  return response.data;
}

async function markLeadContacted(baseUrl, leadId) {
  const response = await requestJson(
    `${normalizeBaseUrl(baseUrl)}/leads/${leadId}/contacted`,
    {
      method: "POST",
    }
  );

  return response.data;
}

async function uploadLeadCard(baseUrl, imageUri) {
  const formData = new FormData();
  formData.append("card", {
    uri: imageUri,
    name: `lead-card-${Date.now()}.jpg`,
    type: "image/jpeg",
  });

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/uploads/card`, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Unable to upload card image.");
  }

  return payload.data;
}

async function exportLeadCsv(baseUrl, filters) {
  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/leads/export/csv${buildQuery(filters)}`
  );

  if (!response.ok) {
    throw new Error("Unable to export leads.");
  }

  return response.text();
}

export {
  createLead,
  exportLeadCsv,
  getLeads,
  markLeadContacted,
  updateLead,
  uploadLeadCard,
};
