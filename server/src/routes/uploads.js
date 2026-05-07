const express = require("express");
const multer = require("multer");
const path = require("path");
const { uploadsDir } = require("../config");
const { uploadCard } = require("../controllers/uploadController");

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image uploads are supported."));
      return;
    }

    callback(null, true);
  },
});

router.post("/card", upload.single("card"), uploadCard);

module.exports = router;
