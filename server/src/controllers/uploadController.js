const { put } = require("@vercel/blob");
const path = require("path");

async function uploadCard(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Card image is required." });
    }

    const extension = path.extname(req.file.originalname) || ".jpg";
    const safeBaseName = path
      .basename(req.file.originalname, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    const filename = `${Date.now()}-${safeBaseName || "card"}${extension}`;

    // Upload to Vercel Blob
    const blob = await put(filename, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });

    res.status(201).json({
      data: {
        filename: filename,
        url: blob.url,
      },
    });
  } catch (error) {
    console.error("Blob Upload Error:", error);
    res.status(500).json({ error: "Failed to upload image to cloud storage." });
  }
}

module.exports = {
  uploadCard,
};
