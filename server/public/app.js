// ─── Auth Guard ───────────────────────────────────────
const AUTH_KEY = "2bits-auth";
if (!localStorage.getItem(AUTH_KEY)) {
  window.location.replace("/login");
}

function getLoggedInUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch (_) {
    return null;
  }
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.replace("/login");
}

const state = {
  editingLeadId: null,
  source: "manual",
  temperature: "hot",
  filters: {
    search: "",
    date: "",
  },
  previewMode: false,
  renderedLeads: [],
};

const THEME_STORAGE_KEY = "2bits-theme";
const FOLLOWUP_TEMPLATE_STORAGE_KEY = "2bits-followup-template";
const DEFAULT_FOLLOWUP_TEMPLATE =
  "Great meeting you at Expo 2026. I would love to continue the conversation and share the next steps.";

const mockLeads = [];

const elements = {
  brandLogo: document.getElementById("brandLogo"),
  syncText: document.getElementById("syncText"),
  statsGrid: document.getElementById("statsGrid"),
  searchInput: document.getElementById("searchInput"),
  themeToggle: document.getElementById("themeToggle"),
  themeToggleIcon: document.getElementById("themeToggleIcon"),
  refreshButton: document.getElementById("refreshButton"),
  newLeadButton: document.getElementById("newLeadButton"),
  leadForm: document.getElementById("leadForm"),
  formModePill: document.getElementById("formModePill"),
  sourceSwitch: document.getElementById("sourceSwitch"),
  temperatureSwitch: document.getElementById("temperatureSwitch"),
  cardUploadBlock: document.getElementById("cardUploadBlock"),
  qrInputBlock: document.getElementById("qrInputBlock"),
  cardFile: document.getElementById("cardFile"),
  cardPreview: document.getElementById("cardPreview"),
  uploadIcon: document.getElementById("uploadIcon"),
  uploadText: document.getElementById("uploadText"),
  clearCardButton: document.getElementById("clearCardButton"),
  qrPayload: document.getElementById("qrPayload"),
  expoName: document.getElementById("expoName"),
  saveButton: document.getElementById("saveButton"),
  cancelEditButton: document.getElementById("cancelEditButton"),
  dateFilter: document.getElementById("dateFilter"),
  applyFiltersButton: document.getElementById("applyFiltersButton"),
  clearFiltersButton: document.getElementById("clearFiltersButton"),
  exportButton: document.getElementById("exportButton"),
  exportButtonSecondary: document.getElementById("exportButtonSecondary"),
  copyDataButton: document.getElementById("copyDataButton"),
  followupTemplate: document.getElementById("followupTemplate"),
  resetTemplateButton: document.getElementById("resetTemplateButton"),
  resultsSummary: document.getElementById("resultsSummary"),
  hotLeadList: document.getElementById("hotLeadList"),
  warmLeadList: document.getElementById("warmLeadList"),
  coldLeadList: document.getElementById("coldLeadList"),
  hotCount: document.getElementById("hotCount"),
  warmCount: document.getElementById("warmCount"),
  coldCount: document.getElementById("coldCount"),
  leadCardTemplate: document.getElementById("leadCardTemplate"),
  toastStack: document.getElementById("toastStack"),
};

let activeLeadMenu = null;

function buildQuery(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function buildHeaders(headers = {}, body) {
  const mergedHeaders = new Headers(headers);

  if (body && !(body instanceof FormData) && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  const user = getLoggedInUser();
  if (user && user.token && !mergedHeaders.has("Authorization")) {
    mergedHeaders.set("Authorization", `Bearer ${user.token}`);
  }

  return mergedHeaders;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers, options.body),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function requestBlob(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers, options.body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return response.blob();
}

function formatDate(value) {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleString();
}

function sanitizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getBadgeTone(temperature) {
  if (temperature === "hot") {
    return { label: "Hot lead", tone: "hot" };
  }

  if (temperature === "cold") {
    return { label: "Cold lead", tone: "cold" };
  }

  return { label: "Warm lead", tone: "warm" };
}

function isLeadMarked(lead) {
  return Boolean(lead.lastContactedAt);
}

function computeStats(leads) {
  return leads.reduce(
    (stats, lead) => {
      stats.total += 1;

      if (lead.temperature === "hot") {
        stats.hot += 1;
      } else if (lead.temperature === "cold") {
        stats.cold += 1;
      } else {
        stats.warm += 1;
      }

      return stats;
    },
    { total: 0, hot: 0, warm: 0, cold: 0 },
  );
}

function filterPreviewLeads(leads) {
  const searchTerm = state.filters.search.trim().toLowerCase();
  const selectedDate = state.filters.date;

  return leads.filter((lead) => {
    const searchableText = [lead.name, lead.phone, lead.company, lead.notes]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const leadDate = lead.createdAt ? new Date(lead.createdAt).toISOString().slice(0, 10) : "";
    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
    const matchesDate = !selectedDate || leadDate === selectedDate;

    return matchesSearch && matchesDate;
  });
}

function parseQrPayload(rawValue) {
  const value = rawValue.trim();

  if (!value) {
    return {};
  }

  if (value.startsWith("BEGIN:VCARD")) {
    const parsed = {};
    value.split(/\r?\n/).forEach((line) => {
      if (line.startsWith("FN:")) {
        parsed.name = line.slice(3).trim();
      }
      if (line.startsWith("TEL")) {
        parsed.phone = line.split(":").slice(1).join(":").trim();
      }
      if (line.startsWith("ORG:")) {
        parsed.company = line.slice(4).trim();
      }
      if (line.startsWith("NOTE:")) {
        parsed.notes = line.slice(5).trim();
      }
    });
    return parsed;
  }

  if (value.startsWith("MECARD:")) {
    const parsed = {};
    value
      .replace(/^MECARD:/i, "")
      .split(";")
      .forEach((part) => {
        if (part.startsWith("N:")) {
          parsed.name = part.slice(2).replace(",", " ").trim();
        }
        if (part.startsWith("TEL:")) {
          parsed.phone = part.slice(4).trim();
        }
        if (part.startsWith("ORG:")) {
          parsed.company = part.slice(4).trim();
        }
        if (part.startsWith("NOTE:")) {
          parsed.notes = part.slice(5).trim();
        }
      });
    return parsed;
  }

  try {
    if (value.startsWith("{")) {
      const json = JSON.parse(value);
      return {
        name: json.name || "",
        phone: json.phone || "",
        company: json.company || "",
        notes: json.notes || "",
      };
    }
  } catch (_error) {
    return { notes: value };
  }

  const parsed = {};
  value.split(/\r?\n/).forEach((line) => {
    const [label, ...rest] = line.split(":");
    const lineValue = rest.join(":").trim();
    const normalized = label.trim().toLowerCase();

    if (!lineValue) {
      return;
    }

    if (normalized === "name") {
      parsed.name = lineValue;
    } else if (normalized === "phone" || normalized === "mobile") {
      parsed.phone = lineValue;
    } else if (normalized === "company" || normalized === "organisation") {
      parsed.company = lineValue;
    } else if (normalized === "notes" || normalized === "note") {
      parsed.notes = lineValue;
    }
  });

  return Object.keys(parsed).length ? parsed : { notes: value };
}

function showToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  elements.toastStack.appendChild(toast);

  window.setTimeout(() => {
    toast.style.animation = "toast-out 220ms ease forwards";
    window.setTimeout(() => toast.remove(), 220);
  }, 2400);
}

function updateApiStatus(isOnline, message) {
  if (!elements.syncText) {
    return;
  }

  if (!isOnline && message) {
    elements.syncText.textContent = message;
  }
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  elements.themeToggleIcon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
}

function initializeTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(storedTheme || (prefersDark ? "dark" : "light"));
}

function initializeFollowupTemplate() {
  const storedTemplate = localStorage.getItem(FOLLOWUP_TEMPLATE_STORAGE_KEY);
  elements.followupTemplate.value = storedTemplate || DEFAULT_FOLLOWUP_TEMPLATE;
}

function setButtonLoading(button, isLoading, loadingText) {
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);

  if (isLoading) {
    button.dataset.previousText = button.textContent;
    button.textContent = loadingText;
    return;
  }

  button.textContent = button.dataset.previousText || button.textContent;
}

function setSaveLoading(isLoading) {
  elements.saveButton.disabled = isLoading;
  elements.saveButton.classList.toggle("is-loading", isLoading);

  if (isLoading) {
    elements.saveButton.dataset.previousText = elements.saveButton.textContent;
    elements.saveButton.textContent = state.editingLeadId ? "Updating" : "Saving";
    return;
  }

  elements.saveButton.textContent =
    elements.saveButton.dataset.previousText ||
    (state.editingLeadId ? "Update lead" : "Save lead");
}

function renderStats(stats) {
  const items = [
    { label: "Total", value: stats.total || 0 },
    { label: "Hot", value: stats.hot || 0 },
    { label: "Warm", value: stats.warm || 0 },
    { label: "Cold", value: stats.cold || 0 },
  ];

  elements.statsGrid.innerHTML = "";

  items.forEach((item) => {
    const tile = document.createElement("article");
    tile.className = "stat-tile";
    tile.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    elements.statsGrid.appendChild(tile);
  });

  initChart();
}

let leadsChartInstance = null;

async function initChart() {
  const canvas = document.getElementById("leadsChart");
  if (!canvas) return;

  if (leadsChartInstance) {
    leadsChartInstance.data.datasets.forEach(() => { });
    leadsChartInstance.destroy();
    leadsChartInstance = null;
  }

  const ctx = canvas.getContext("2d");
  const isDark = document.body.dataset.theme === "dark";
  const textColor = isDark ? "#a0a0b0" : "#475569";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  // Fetch real data from the backend
  let labels = [];
  let hotData = [];
  let warmData = [];
  let coldData = [];
  let totalData = [];

  try {
    const res = await apiFetch("/api/leads/stats/daily");
    const json = await res.json();
    const days = json.data || [];

    if (days.length > 0) {
      labels = days.map(d => d.label);
      hotData = days.map(d => Number(d.hot) || 0);
      warmData = days.map(d => Number(d.warm) || 0);
      coldData = days.map(d => Number(d.cold) || 0);
      totalData = days.map(d => Number(d.total) || 0);
    }
  } catch (_) {
    // Fall back to empty chart if API fails
  }

  leadsChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total",
          data: totalData,
          borderColor: "#9d4edd",
          backgroundColor: "rgba(157, 78, 221, 0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Hot",
          data: hotData,
          borderColor: "#ff0a54",
          backgroundColor: "rgba(255, 10, 84, 0.07)",
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Warm",
          data: warmData,
          borderColor: "#ffb703",
          backgroundColor: "rgba(255, 183, 3, 0.07)",
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Cold",
          data: coldData,
          borderColor: "#00f5d4",
          backgroundColor: "rgba(0, 245, 212, 0.07)",
          tension: 0.4,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: textColor, usePointStyle: true } },
        tooltip: {
          backgroundColor: isDark ? "#1a1a2e" : "#fff",
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          borderWidth: 1,
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, maxRotation: 30 }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, precision: 0, stepSize: 1 },
          beginAtZero: true,
        }
      }
    }
  });
}

function createEmptyLaneState(message) {
  const node = document.createElement("div");
  node.className = "empty-state";
  node.textContent = message;
  return node;
}

function renderLane(target, leads, emptyMessage = "No matching leads in this section.") {
  target.innerHTML = "";

  if (!leads.length) {
    target.appendChild(createEmptyLaneState(emptyMessage));
    return;
  }

  leads.forEach((lead, index) => {
    const fragment = elements.leadCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".lead-card");
    const badge = getBadgeTone(lead.temperature);
    const markButton = fragment.querySelector(".lead-card__mark");
    const menuWrap = fragment.querySelector(".lead-card__menu-wrap");
    const menuButton = fragment.querySelector(".lead-card__menu-button");

    card.style.animationDelay = `${index * 70}ms`;
    card.dataset.leadId = String(lead.id);
    fragment.querySelector(".lead-avatar").textContent = getInitials(lead.name);
    fragment.querySelector(".lead-card__name").textContent = lead.name;
    fragment.querySelector(".lead-card__company").textContent = lead.company || "Independent";
    fragment.querySelector(".lead-card__meta").textContent = [
      lead.phone,
      `Source: ${lead.source}`,
      `Created: ${formatDate(lead.createdAt)}`,
      `Last contacted: ${formatDate(lead.lastContactedAt)}`,
      lead.notes ? `Notes: ${lead.notes}` : "Notes: No notes captured yet.",
    ].join("\n");
    fragment.querySelector(".lead-card__badge").textContent = badge.label;
    fragment.querySelector(".lead-card__badge").dataset.tone = badge.tone;

    // Add tilt effect class
    card.classList.add("tilt-card");
    card.dataset.tilt = "";
    card.dataset.tiltMax = "10";
    card.dataset.tiltSpeed = "400";
    card.dataset.tiltGlare = "true";
    card.dataset.tiltMaxGlare = "0.15";

    markButton.textContent = isLeadMarked(lead) ? "Marked" : "Unmarked";
    markButton.dataset.marked = String(isLeadMarked(lead));
    markButton.addEventListener("click", async () => toggleLeadMarked(lead));
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleLeadMenu(menuWrap);
    });

    fragment
      .querySelector(".lead-card__menu-edit")
      .addEventListener("click", () => {
        closeLeadMenu();
        startEdit(lead);
      });
    fragment
      .querySelector(".lead-card__menu-delete")
      .addEventListener("click", async () => {
        closeLeadMenu();
        await deleteLead(lead);
      });
    fragment
      .querySelector(".lead-card__message")
      .addEventListener("click", async () => sendMessage(lead));

    target.appendChild(fragment);
  });

  if (window.VanillaTilt) {
    VanillaTilt.init(target.querySelectorAll(".tilt-card"));
  }
}

function renderLeads(leads, emptyMessage) {
  const groupedLeads = {
    hot: leads.filter((lead) => lead.temperature === "hot"),
    warm: leads.filter((lead) => lead.temperature === "warm"),
    cold: leads.filter((lead) => lead.temperature === "cold"),
  };

  renderLane(elements.hotLeadList, groupedLeads.hot, emptyMessage);
  renderLane(elements.warmLeadList, groupedLeads.warm, emptyMessage);
  renderLane(elements.coldLeadList, groupedLeads.cold, emptyMessage);

  elements.hotCount.textContent = String(groupedLeads.hot.length);
  elements.warmCount.textContent = String(groupedLeads.warm.length);
  elements.coldCount.textContent = String(groupedLeads.cold.length);
}

function setRenderedLeads(leads, summaryText) {
  state.renderedLeads = Array.isArray(leads) ? [...leads] : [];
  renderLeads(state.renderedLeads);

  if (typeof summaryText === "string") {
    elements.resultsSummary.textContent = summaryText;
  }
}

function renderPreviewDashboard() {
  const filteredPreviewLeads = filterPreviewLeads(mockLeads);
  renderStats(computeStats(filteredPreviewLeads));
  setRenderedLeads(filteredPreviewLeads, `⚠️ OFFLINE MODE: Showing ${filteredPreviewLeads.length} unsaved leads`);
  if (elements.syncText) {
    elements.syncText.innerHTML = '<span style="color:var(--hot); font-weight:bold;">⚠️ Connection Lost.</span> Leads you save now will disappear if you refresh.';
  }
}

function closeLeadMenu() {
  if (activeLeadMenu) {
    activeLeadMenu.classList.remove("lead-card__menu-wrap--open");
    activeLeadMenu = null;
  }
}

function toggleLeadMenu(menuWrap) {
  const isOpen = activeLeadMenu === menuWrap;
  closeLeadMenu();

  if (!isOpen) {
    menuWrap.classList.add("lead-card__menu-wrap--open");
    activeLeadMenu = menuWrap;
  }
}

let html5QrcodeScanner = null;

function setSource(source) {
  state.source = source;
  elements.cardUploadBlock.classList.toggle("context-panel--hidden", source !== "card");
  elements.qrInputBlock.classList.toggle("context-panel--hidden", source !== "qr");

  [...elements.sourceSwitch.querySelectorAll("[data-source]")].forEach((button) => {
    button.classList.toggle("mode-chip--active", button.dataset.source === source);
  });

  if (source === "qr") {
    if (!html5QrcodeScanner) {
      html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      html5QrcodeScanner.render((decodedText) => {
        elements.qrPayload.value = decodedText;
        const parsed = parseQrPayload(decodedText);
        
        if (parsed.name && !elements.leadForm.name.value.trim()) elements.leadForm.name.value = parsed.name;
        if (parsed.phone && !elements.leadForm.phone.value.trim()) elements.leadForm.phone.value = parsed.phone;
        if (parsed.company && !elements.leadForm.company.value.trim()) elements.leadForm.company.value = parsed.company;
        if (parsed.notes && !elements.leadForm.notes.value.trim()) elements.leadForm.notes.value = parsed.notes;
        
        showToast("QR Code Scanned Successfully!", "success");
        
        if (html5QrcodeScanner) {
          html5QrcodeScanner.clear();
          html5QrcodeScanner = null;
        }
      }, () => {});
    }
  } else {
    if (html5QrcodeScanner) {
      html5QrcodeScanner.clear();
      html5QrcodeScanner = null;
    }
  }
}

function setTemperature(temperature) {
  state.temperature = temperature;

  [...elements.temperatureSwitch.querySelectorAll("[data-temperature]")].forEach((button) => {
    button.classList.toggle("temp-chip--active", button.dataset.temperature === temperature);
  });
}

function resetForm() {
  elements.leadForm.reset();
  elements.expoName.value = "Expo 2026";
  state.editingLeadId = null;
  elements.formModePill.textContent = "Create mode";
  elements.saveButton.textContent = "Save lead";
  elements.saveButton.dataset.previousText = "Save lead";
  elements.cancelEditButton.classList.add("ghost-button--hidden");
  
  // Clear Card Upload state
  elements.cardFile.value = "";
  elements.cardPreview.src = "";
  elements.cardPreview.style.display = "none";
  elements.uploadIcon.textContent = "add_photo_alternate";
  elements.uploadIcon.style.color = "var(--text-dim)";
  elements.uploadText.textContent = "Upload visiting card image";
  elements.clearCardButton.style.display = "none";
  
  // Clear QR state
  elements.qrPayload.value = "";
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear();
    html5QrcodeScanner = null;
  }

  setSource("manual");
  setTemperature("hot");
}

function startEdit(lead) {
  state.editingLeadId = lead.id;
  elements.formModePill.textContent = `Editing #${lead.id}`;
  elements.saveButton.textContent = "Update lead";
  elements.cancelEditButton.classList.remove("ghost-button--hidden");
  setSource(lead.source || "manual");
  setTemperature(lead.temperature || "hot");
  elements.leadForm.name.value = lead.name || "";
  elements.leadForm.phone.value = lead.phone || "";
  elements.leadForm.company.value = lead.company || "";
  elements.leadForm.notes.value = lead.notes || "";
  flashTarget("#captureSection");
  document.querySelector("#captureSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function flashTarget(selector) {
  const target = document.querySelector(selector);

  if (!target) {
    return;
  }

  target.classList.remove("panel-flash");
  void target.offsetWidth;
  target.classList.add("panel-flash");
}

async function uploadCardImage() {
  if (!elements.cardFile.files.length) {
    return "";
  }

  const formData = new FormData();
  formData.append("card", elements.cardFile.files[0]);

  const response = await fetch("/api/uploads/card", {
    method: "POST",
    headers: buildHeaders({}, formData),
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || "Unable to upload card image.");
    error.status = response.status;
    throw error;
  }

  return payload.data.url;
}

async function fetchStats() {
  const payload = await requestJson(`/api/leads/stats${buildQuery(state.filters)}`);
  renderStats(payload.data);
}

async function fetchLeads() {
  const query = buildQuery({
    ...state.filters,
    page: 1,
    pageSize: 60,
  });
  const payload = await requestJson(`/api/leads${query}`);
  setRenderedLeads(payload.data, `Showing ${payload.data.length} active leads`);
}

async function refreshDashboard() {
  try {
    state.previewMode = false;
    updateApiStatus(true, "API online");

    // Skeleton Loading state
    elements.statsGrid.innerHTML = Array(4).fill('<article class="stat-tile skeleton"><span>Label</span><strong>00</strong></article>').join("");
    document.querySelectorAll('.lead-list').forEach(l => l.innerHTML = '<div class="lead-card skeleton" style="height:150px;"></div>');

    await Promise.all([fetchStats(), fetchLeads()]);
    elements.syncText.textContent = `Last synced ${new Date().toLocaleTimeString()}`;
  } catch (_error) {
    state.previewMode = true;
    updateApiStatus(false, "Preview mode");
    renderPreviewDashboard();
  }
}

function buildFollowupMessage(lead) {
  const template = elements.followupTemplate.value.trim() || DEFAULT_FOLLOWUP_TEMPLATE;
  const greeting = lead.name ? `Hi ${lead.name}, ` : "Hi, ";
  return `${greeting}${template}`;
}

async function sendMessage(lead) {
  const phone = sanitizePhone(lead.phone);

  if (!phone) {
    showToast("This lead does not have a valid phone number.", "error");
    return;
  }

  const message = buildFollowupMessage(lead);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener,noreferrer");

  if (state.previewMode) {
    if (!isLeadMarked(lead)) {
      const index = mockLeads.findIndex((item) => item.id === lead.id);
      if (index >= 0) {
        mockLeads[index] = {
          ...mockLeads[index],
          lastContactedAt: new Date().toISOString(),
        };
        renderPreviewDashboard();
      }
    }
    showToast(`Preview WhatsApp opened for ${lead.name}`, "warning");
    return;
  }

  try {
    if (!isLeadMarked(lead)) {
      await requestJson(`/api/leads/${lead.id}/contact-status`, {
        method: "POST",
        body: JSON.stringify({ marked: true }),
      });
    } else {
      await requestJson(`/api/leads/${lead.id}/contacted`, { method: "POST" });
    }
    await refreshDashboard();
    showToast(`WhatsApp opened for ${lead.name}`, "success");
  } catch (_error) {
    showToast(`Preview WhatsApp opened for ${lead.name}`, "warning");
  }
}

async function toggleLeadMarked(lead) {
  const marked = !isLeadMarked(lead);

  if (state.previewMode) {
    const index = mockLeads.findIndex((item) => item.id === lead.id);

    if (index >= 0) {
      mockLeads[index] = {
        ...mockLeads[index],
        lastContactedAt: marked ? new Date().toISOString() : null,
      };
      renderPreviewDashboard();
    }

    showToast(marked ? `Marked ${lead.name}` : `Unmarked ${lead.name}`, "success");
    return;
  }

  try {
    await requestJson(`/api/leads/${lead.id}/contact-status`, {
      method: "POST",
      body: JSON.stringify({ marked }),
    });
    await refreshDashboard();
    showToast(marked ? `Marked ${lead.name}` : `Unmarked ${lead.name}`, "success");
  } catch (_error) {
    showToast("Unable to change marked state", "error");
  }
}

async function deleteLead(lead) {
  const confirmed = window.confirm(`Delete ${lead.name}?`);

  if (!confirmed) {
    return;
  }

  if (state.previewMode) {
    const index = mockLeads.findIndex((item) => item.id === lead.id);
    if (index >= 0) {
      mockLeads.splice(index, 1);
      renderPreviewDashboard();
    }
    showToast(`Deleted ${lead.name}`, "success");
    return;
  }

  try {
    const response = await fetch(`/api/leads/${lead.id}`, {
      method: "DELETE",
      headers: buildHeaders(),
    });

    if (!response.ok) {
      throw new Error("Delete failed");
    }

    if (state.editingLeadId === lead.id) {
      resetForm();
    }

    closeLeadMenu();
    const nextLeads = state.renderedLeads.filter((item) => item.id !== lead.id);
    renderStats(computeStats(nextLeads));
    setRenderedLeads(nextLeads, `Showing ${nextLeads.length} active leads`);
    if (!nextLeads.length) {
      renderLeads([], "No matching leads in this section.");
    }
    showToast(`Deleted ${lead.name}`, "success");
    void refreshDashboard();
  } catch (_error) {
    showToast("Unable to delete lead", "error");
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const wasEditing = Boolean(state.editingLeadId);
  setSaveLoading(true);
  let payload;

  try {
    payload = {
      name: elements.leadForm.name.value.trim(),
      phone: elements.leadForm.phone.value.trim(),
      company: elements.leadForm.company.value.trim(),
      notes: elements.leadForm.notes.value.trim(),
      temperature: state.temperature,
      source: state.source,
    };

    if (state.source === "card") {
      try {
        const cardImageUrl = await uploadCardImage();
        if (cardImageUrl) {
          payload.cardImageUrl = cardImageUrl;
        }
      } catch (uploadError) {
        console.error("Image upload failed, but saving lead anyway:", uploadError);
        showToast("Lead saved, but card image failed to upload.", "warning");
      }
    }

    if (state.source === "qr" && elements.qrPayload.value.trim()) {
      const parsed = parseQrPayload(elements.qrPayload.value);
      payload = {
        ...payload,
        ...parsed,
        notes: payload.notes || parsed.notes || "",
      };
    }

    // Always attempt to save to the real database first, even if initial check failed
    const endpoint = state.editingLeadId ? `/api/leads/${state.editingLeadId}` : "/api/leads";

    await requestJson(endpoint, {
      method: state.editingLeadId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    resetForm();
    await refreshDashboard();
    showToast(wasEditing ? "Lead updated" : "Lead saved", "success");
    if (!wasEditing && window.confetti) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  } catch (_error) {
    if (!payload) {
      showToast("Unable to save lead", "error");
      return;
    }

    const previewLead = {
      id: state.editingLeadId || Date.now(),
      ...payload,
      createdAt: new Date().toISOString(),
      lastContactedAt: null,
    };

    if (wasEditing) {
      const index = mockLeads.findIndex((lead) => lead.id === state.editingLeadId);
      if (index >= 0) {
        mockLeads[index] = {
          ...mockLeads[index],
          ...previewLead,
        };
      }
    } else {
      mockLeads.unshift(previewLead);
    }

    state.previewMode = true;
    renderPreviewDashboard();
    elements.syncText.textContent = "Saved in preview mode because the API or database is not available.";
    resetForm();
    showToast(wasEditing ? "Lead updated in preview" : "Lead saved in preview", "warning");
    if (!wasEditing && window.confetti) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  } finally {
    setSaveLoading(false);
  }
}

function buildPreviewCsv() {
  const filteredPreviewLeads = filterPreviewLeads(mockLeads);

  return [
    ["Name", "Phone", "Company", "Notes", "Temperature", "Source"],
    ...filteredPreviewLeads.map((lead) => [
      lead.name,
      lead.phone ? `\t${lead.phone}` : "",
      lead.company,
      lead.notes,
      lead.temperature ? lead.temperature.charAt(0).toUpperCase() + lead.temperature.slice(1) : "",
      lead.source ? lead.source.charAt(0).toUpperCase() + lead.source.slice(1) : "",
    ]),
  ]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadCsv() {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `leads_export_${dateStr}.csv`;

  if (state.previewMode) {
    downloadFile(new Blob([buildPreviewCsv()], { type: "text/csv" }), filename);
    showToast("Preview CSV exported", "warning");
    return;
  }

  requestBlob(`/api/leads/export/csv${buildQuery(state.filters)}`)
    .then((blob) => {
      downloadFile(blob, filename);
      showToast("CSV exported", "success");
    })
    .catch(() => {
      downloadFile(new Blob([buildPreviewCsv()], { type: "text/csv" }), filename);
      showToast("Preview CSV exported", "warning");
    });
}

function copyToClipboard() {
  if (state.previewMode) {
    navigator.clipboard.writeText(buildPreviewCsv()).then(() => {
      showToast("Data copied to clipboard! Paste directly into Excel.", "success");
    });
    return;
  }

  requestBlob(`/api/leads/export/csv${buildQuery(state.filters)}`)
    .then((blob) => blob.text())
    .then((text) => {
      navigator.clipboard.writeText(text).then(() => {
        showToast("Data copied to clipboard! Paste directly into Excel.", "success");
      });
    })
    .catch(() => {
      navigator.clipboard.writeText(buildPreviewCsv()).then(() => {
        showToast("Preview data copied to clipboard!", "warning");
      });
    });
}

function applyFilters() {
  state.filters.search = elements.searchInput.value.trim();
  state.filters.date = elements.dateFilter.value;

  if (state.previewMode) {
    renderPreviewDashboard();
    return;
  }

  void refreshDashboard();
}

function clearFilters() {
  elements.searchInput.value = "";
  elements.dateFilter.value = "";
  state.filters = {
    search: "",
    date: "",
  };

  if (state.previewMode) {
    renderPreviewDashboard();
    return;
  }

  void refreshDashboard();
}

function bindThemeToggle() {
  elements.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  });
}

function bindNavigation() {
  const buttons = document.querySelectorAll("[data-target]");
  const anchors = document.querySelectorAll("a[href^='#']");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const selector = button.dataset.target;
      const target = document.querySelector(selector);

      if (!target) {
        return;
      }

      target.scrollIntoView({ behavior: "smooth", block: "start" });
      flashTarget(selector);
    });
  });

  anchors.forEach((anchor) => {
    anchor.addEventListener("click", () => {
      const selector = anchor.getAttribute("href");
      if (selector && selector.startsWith("#")) {
        window.setTimeout(() => flashTarget(selector), 120);
      }
    });
  });
}

function bindCommandPalette() {
  const cpBackdrop = document.getElementById("commandPalette");
  const cpInput = document.getElementById("cpInput");
  const cpLeadResults = document.getElementById("cpLeadResults");
  const cpLeadResultsGroup = document.getElementById("cpLeadResultsGroup");

  if (!cpBackdrop) return;

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      cpBackdrop.classList.add("is-open");
      cpInput.focus();
    }
    if (e.key === "Escape") {
      cpBackdrop.classList.remove("is-open");
      cpInput.value = "";
    }
  });

  cpBackdrop.addEventListener("click", (e) => {
    if (e.target === cpBackdrop) {
      cpBackdrop.classList.remove("is-open");
    }
  });

  document.querySelectorAll(".cp-item[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      cpBackdrop.classList.remove("is-open");
      if (action === "new-lead") {
        document.querySelector("#captureSection")?.scrollIntoView({ behavior: "smooth" });
      } else if (action === "export") {
        downloadCsv();
      } else if (action === "toggle-theme") {
        elements.themeToggle.click();
      }
    });
  });

  cpInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    if (!term) {
      cpLeadResultsGroup.style.display = "none";
      return;
    }
    const matches = state.renderedLeads.filter(l => l.name.toLowerCase().includes(term) || (l.company || "").toLowerCase().includes(term)).slice(0, 5);

    if (matches.length) {
      cpLeadResultsGroup.style.display = "";
      cpLeadResults.innerHTML = matches.map(l => `
        <button class="cp-item" onclick="document.getElementById('commandPalette').classList.remove('is-open'); document.querySelector('[data-lead-id=\\'${l.id}\\']').scrollIntoView({behavior:'smooth'})">
          <span class="material-symbols-outlined cp-icon">person</span>
          <div style="display:flex; flex-direction:column; align-items:flex-start;">
            <span>${l.name}</span>
            <span style="font-size:11px; color:var(--text-dim);">${l.company || "Independent"}</span>
          </div>
        </button>
      `).join("");
    } else {
      cpLeadResultsGroup.style.display = "none";
    }
  });
}

function bindRipples() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn, .nav-item, .chip");
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("div");
    const size = Math.max(rect.width, rect.height);

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    ripple.style.position = "absolute";
    ripple.style.background = "rgba(255,255,255,0.2)";
    ripple.style.borderRadius = "50%";
    ripple.style.pointerEvents = "none";
    ripple.style.transform = "scale(0)";
    ripple.style.animation = "ripple 0.6s linear";

    if (getComputedStyle(btn).position === "static") {
      btn.style.position = "relative";
    }
    btn.style.overflow = "hidden";

    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

function bindEvents() {
  bindThemeToggle();
  bindNavigation();
  bindCommandPalette();
  bindRipples();

  document.addEventListener("click", () => closeLeadMenu());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLeadMenu();
    }
  });
  elements.refreshButton.addEventListener("click", () => window.location.reload());
  elements.newLeadButton.addEventListener("click", () => {
    document.querySelector("#captureSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    flashTarget("#captureSection");
  });
  elements.leadForm.addEventListener("submit", handleSubmit);

  if (elements.cardFile) {
    elements.cardFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          elements.cardPreview.src = ev.target.result;
          elements.cardPreview.style.display = "block";
          elements.uploadIcon.style.display = "inline-block";
          elements.uploadIcon.textContent = "document_scanner";
          elements.uploadText.style.display = "block";
          elements.uploadText.textContent = "Scanning card with AI...";
          elements.clearCardButton.style.display = "inline-block";

          try {
            // ── Compress image before sending (handles huge phone photos) ──
            const compressedBase64 = await new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const MAX = 1200; 
                let { width, height } = img;
                if (width > MAX || height > MAX) {
                  if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
                  else { width = Math.round(width * MAX / height); height = MAX; }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width; canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                resolve(dataUrl.split(",")[1]);
              };
              img.onerror = () => reject(new Error("Could not process image file."));
              img.src = ev.target.result;
            });

            // ── Call backend OCR endpoint (auth token sent automatically) ──
            const ocrJson = await requestJson("/api/ocr/scan", {
              method: "POST",
              body: JSON.stringify({
                imageBase64: compressedBase64,
                mimeType: "image/jpeg"
              })
            });

            console.log("OCR Result:", ocrJson);
            const parsed = ocrJson.data || {};

            const name = parsed.name || "";
            const phone = parsed.phone || "";
            const company = parsed.company || "";

            const nameEl = document.getElementById("name");
            const phoneEl = document.getElementById("phone");
            const compEl = document.getElementById("company");

            if (name && !nameEl.value) nameEl.value = name;
            if (company && !compEl.value) compEl.value = company;
            if (phone && !phoneEl.value) phoneEl.value = phone;

            const filled = [name, phone, company].filter(Boolean).length;
            elements.uploadIcon.textContent = "check_circle";
            elements.uploadIcon.style.color = "var(--cold)";
            elements.uploadText.textContent = filled > 0
              ? `✅ ${filled} field${filled > 1 ? "s" : ""} auto-filled!`
              : "⚠️ Scanned — please fill fields manually.";
            showToast(
              filled > 0 ? "Card scanned! Please verify the fields." : "Scan done — couldn't detect all fields.",
              filled > 0 ? "success" : "warning"
            );

          } catch (error) {
            console.error("OCR Error:", error);
            elements.uploadIcon.textContent = "error";
            elements.uploadText.textContent = `❌ Error: ${error.message}`;
            showToast(`Scan error: ${error.message}`, "warning");
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (elements.clearCardButton) {
    elements.clearCardButton.addEventListener("click", () => {
      elements.cardFile.value = "";
      elements.cardPreview.src = "";
      elements.cardPreview.style.display = "none";
      elements.uploadIcon.style.display = "inline-block";
      elements.uploadText.style.display = "block";
      elements.clearCardButton.style.display = "none";
    });
  }

  elements.cancelEditButton.addEventListener("click", resetForm);
  elements.applyFiltersButton.addEventListener("click", applyFilters);
  elements.clearFiltersButton.addEventListener("click", clearFilters);
  elements.exportButton.addEventListener("click", downloadCsv);
  elements.exportButtonSecondary.addEventListener("click", downloadCsv);
  if (elements.copyDataButton) elements.copyDataButton.addEventListener("click", copyToClipboard);
  elements.followupTemplate.addEventListener("input", () => {
    localStorage.setItem(FOLLOWUP_TEMPLATE_STORAGE_KEY, elements.followupTemplate.value);
  });
  elements.resetTemplateButton.addEventListener("click", () => {
    elements.followupTemplate.value = DEFAULT_FOLLOWUP_TEMPLATE;
    localStorage.setItem(FOLLOWUP_TEMPLATE_STORAGE_KEY, DEFAULT_FOLLOWUP_TEMPLATE);
    showToast("Follow-up line reset", "success");
  });

  elements.sourceSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-source]");
    if (button) {
      setSource(button.dataset.source);
    }
  });

  elements.temperatureSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("[data-temperature]");
    if (button) {
      setTemperature(button.dataset.temperature);
    }
  });

  elements.qrPayload.addEventListener("blur", () => {
    const parsed = parseQrPayload(elements.qrPayload.value);

    if (parsed.name && !elements.leadForm.name.value.trim()) {
      elements.leadForm.name.value = parsed.name;
    }
    if (parsed.phone && !elements.leadForm.phone.value.trim()) {
      elements.leadForm.phone.value = parsed.phone;
    }
    if (parsed.company && !elements.leadForm.company.value.trim()) {
      elements.leadForm.company.value = parsed.company;
    }
    if (parsed.notes && !elements.leadForm.notes.value.trim()) {
      elements.leadForm.notes.value = parsed.notes;
    }
  });

  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyFilters();
    }
  });
}

async function boot() {
  initializeTheme();
  initializeFollowupTemplate();
  bindEvents();
  resetForm();

  try {
    await requestJson("/api");
  } catch (_error) {
    console.error("API Connectivity Error:", _error);
    state.previewMode = true;
    renderPreviewDashboard();
    showToast("Warning: Offline Mode. Leads won't be saved permanently.", "warning");
    return;
  }

  await refreshDashboard();
}

// ─── 3D Page Flip (About Us) ─────────────────────────
function flipToAbout(event) {
  if (event) event.preventDefault();
  const container = document.getElementById('pageFlipContainer');
  const toggleBtn = document.getElementById('sidebarToggle');
  if (!container) return;

  // Hide the hamburger menu so it doesn't overlap on the back face
  if (toggleBtn) {
    toggleBtn.style.opacity = '0';
    toggleBtn.style.pointerEvents = 'none';
  }

  // Scroll to top before flipping so the animation looks clean
  window.scrollTo({ top: 0, behavior: 'instant' });

  container.classList.add('is-flipped');

  // After flip completes, scroll the back face to top and hide front face
  setTimeout(() => {
    container.classList.add('is-flipped-done');
    const backFace = container.querySelector('.page-face--back');
    if (backFace) backFace.scrollTop = 0;
  }, 1000);
}

function flipToMain(event) {
  if (event) event.preventDefault();
  const container = document.getElementById('pageFlipContainer');
  const toggleBtn = document.getElementById('sidebarToggle');
  if (!container) return;

  container.classList.remove('is-flipped-done');

  // Force a tiny delay so the browser registers the display change before animating
  requestAnimationFrame(() => {
    container.classList.remove('is-flipped');
  });

  // Show the hamburger menu again as it flips back
  if (toggleBtn) {
    toggleBtn.style.opacity = '1';
    toggleBtn.style.pointerEvents = 'auto';
  }

  // After flip back, ensure we're at top
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, 1000);
}

// ─── Sidebar Toggle (Left Menu) ─────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar || !overlay) return;

  sidebar.classList.toggle('is-open');
  overlay.classList.toggle('is-active');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar || !overlay) return;

  sidebar.classList.remove('is-open');
  overlay.classList.remove('is-active');
}

// Make functions available globally so onclick attributes in HTML work
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

void boot();


