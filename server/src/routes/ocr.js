const express = require("express");
const vision = require("@google-cloud/vision");
const path = require("path");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Initialize Vision client with service account key
const keyPath = path.resolve(__dirname, "../../", process.env.GOOGLE_CLOUD_KEY_FILE || "config/google-vision-key.json");
const client = new vision.ImageAnnotatorClient({
  keyFilename: keyPath,
});

/**
 * Parse OCR text to extract name, phone, and company
 */
function parseBusinessCardText(text) {
  // Phone patterns: Indian mobile (10 digits, 6-9 start), with or without +91, spaces, dashes
  const phonePattern = /(?:\+91|0)?[\s-]?([6-9]\d{9}|[6-9]\d[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2})/gi;
  const phoneMatches = text.match(phonePattern) || [];
  
  const phone = phoneMatches.length > 0
    ? phoneMatches[0].replace(/[^\d]/g, "").slice(-10) // Extract last 10 digits
    : "";

  // Remove phone numbers from text to avoid confusion with other fields
  let cleanText = text.replace(phonePattern, "").trim();

  // Split into lines for better parsing
  const lines = cleanText.split(/[\n;,]/).map(line => line.trim()).filter(Boolean);

  // Heuristics to find name, company
  let name = "";
  let company = "";

  // Company keywords to identify company lines
  const companyKeywords = /^(pvt|ltd|llp|co\.|corp|inc|company|solutions|services|group|consulting|industries|enterprises|trade|india|technologies|systems)/i;

  for (const line of lines) {
    if (line.length > 50 || companyKeywords.test(line)) {
      // Long lines or lines with company keywords are likely company names
      if (!company && line.length < 60) company = line;
    } else if (line.length > 2 && line.length < 40 && /^[A-Z]/.test(line)) {
      // Lines starting with capital letter, reasonable length = potential name
      if (!name && !/[0-9]{2,}/.test(line)) name = line; // Avoid lines with many numbers
    }
  }

  return {
    name: name || "",
    phone: phone || "",
    company: company || "",
  };
}

router.post("/scan", async (req, res, next) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided." });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Perform OCR using Google Cloud Vision
    const request = {
      image: { content: imageBuffer },
    };

    const [result] = await client.documentTextDetection(request);
    const fullTextAnnotation = result.fullTextAnnotation;

    if (!fullTextAnnotation || !fullTextAnnotation.text) {
      return res.status(422).json({ error: "No text detected in image. Please try another photo." });
    }

    const ocrText = fullTextAnnotation.text;

    // Parse the OCR text to extract name, phone, company
    const parsed = parseBusinessCardText(ocrText);

    return res.json({
      data: {
        name: parsed.name,
        phone: parsed.phone,
        company: parsed.company,
      },
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
