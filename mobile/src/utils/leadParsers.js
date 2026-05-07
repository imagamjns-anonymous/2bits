function parseLines(rawValue) {
  return rawValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseVCard(rawValue) {
  const lines = parseLines(rawValue);
  const result = {};

  lines.forEach((line) => {
    if (line.startsWith("FN:")) {
      result.name = line.slice(3).trim();
    }

    if (line.startsWith("ORG:")) {
      result.company = line.slice(4).trim();
    }

    if (line.startsWith("TEL")) {
      const phone = line.split(":").slice(1).join(":").trim();
      if (phone) {
        result.phone = phone;
      }
    }

    if (line.startsWith("NOTE:")) {
      result.notes = line.slice(5).trim();
    }
  });

  return result;
}

function parseMeCard(rawValue) {
  const cleaned = rawValue.replace(/^MECARD:/i, "");
  const parts = cleaned.split(";");
  const result = {};

  parts.forEach((part) => {
    if (part.startsWith("N:")) {
      result.name = part.slice(2).replace(",", " ").trim();
    }

    if (part.startsWith("TEL:")) {
      result.phone = part.slice(4).trim();
    }

    if (part.startsWith("ORG:")) {
      result.company = part.slice(4).trim();
    }

    if (part.startsWith("NOTE:")) {
      result.notes = part.slice(5).trim();
    }
  });

  return result;
}

function parseSimpleKeyValue(rawValue) {
  const result = {};
  const lines = parseLines(rawValue);

  lines.forEach((line) => {
    const [label, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const normalizedLabel = label.trim().toLowerCase();

    if (!value) {
      return;
    }

    if (normalizedLabel === "name") {
      result.name = value;
    }

    if (normalizedLabel === "phone" || normalizedLabel === "mobile") {
      result.phone = value;
    }

    if (normalizedLabel === "company" || normalizedLabel === "organisation") {
      result.company = value;
    }

    if (normalizedLabel === "notes" || normalizedLabel === "note") {
      result.notes = value;
    }
  });

  return result;
}

function parseJson(rawValue) {
  const parsed = JSON.parse(rawValue);
  return {
    name: parsed.name || "",
    phone: parsed.phone || "",
    company: parsed.company || "",
    notes: parsed.notes || "",
  };
}

function parseLeadFromQr(rawValue) {
  try {
    if (rawValue.startsWith("BEGIN:VCARD")) {
      return parseVCard(rawValue);
    }

    if (rawValue.startsWith("MECARD:")) {
      return parseMeCard(rawValue);
    }

    if (rawValue.trim().startsWith("{")) {
      return parseJson(rawValue);
    }

    const simple = parseSimpleKeyValue(rawValue);

    if (Object.keys(simple).length) {
      return simple;
    }
  } catch (_error) {
    return {
      notes: rawValue,
    };
  }

  return {
    notes: rawValue,
  };
}

export { parseLeadFromQr };
