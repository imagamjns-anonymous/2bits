const express = require("express");
const leadController = require("../controllers/leadController");

const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/stats/daily", leadController.getDailyStats);
router.get("/stats", leadController.getLeadStats);
router.get("/export/csv", leadController.exportLeads);
router.get("/", leadController.listLeads);
router.post("/", leadController.createLead);
router.put("/:id", leadController.updateLead);
router.post("/:id/contacted", leadController.markLeadContacted);
router.post("/:id/contact-status", leadController.setLeadContactStatus);
router.delete("/:id", leadController.deleteLead);

module.exports = router;
