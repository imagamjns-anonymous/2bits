const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.post("/scan", async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI vision not configured on server." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model  = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert at reading Indian business cards in ANY orientation (rotated, tilted, upside-down, dark background, any font).

Extract ONLY these 3 fields and return ONLY a raw JSON object — no markdown, no explanation.

Rules:
- name: The person's full name only. NOT the company name. NOT the job title (Manager/CEO/Director etc).
- phone: 10-digit Indian mobile number, digits only, strip +91 prefix. If multiple numbers, pick the mobile (starts with 6-9).
- company: Company or organization name only. NOT the address.

If unsure about a field, use "".

Example: {"name":"Deepak Khosla","phone":"9773922477","company":"KG Bearing India LLP"}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      },
    ]);

    const rawText  = result.response.text().trim();
    const jsonText = rawText.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return res.status(422).json({ error: "Could not read card clearly. Please fill manually." });
    }

    return res.json({
      data: {
        name:    (parsed.name    || "").trim(),
        phone:   (parsed.phone   || "").replace(/\D/g, ""),
        company: (parsed.company || "").trim(),
      },
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
