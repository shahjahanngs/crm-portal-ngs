import express from "express";
import { fetchZIPUmrahPkgs } from "../controllers/umrahPkg.controller.js";
import { getZipGroupTicketing } from "../controllers/zipAccounts.controller.js";

const router = express.Router();

router.get("/umrahPackages", fetchZIPUmrahPkgs);
router.get("/group-ticketing", getZipGroupTicketing);

export default router;
