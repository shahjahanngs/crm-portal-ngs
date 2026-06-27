import express from "express";
import { getZipBankAccounts } from "../controllers/zipAccounts.controller.js";

const router = express.Router();

router.get("/bank-accounts", getZipBankAccounts);

export default router;
