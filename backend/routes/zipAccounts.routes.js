import express from "express";
import { fetchZIPUmrahPkgs, fetchUmrahRemainingSeats } from "../controllers/umrahPkg.controller.js";
import {
  getZipBookings,
  getZipVoucherForBooking,
  getZipGroupTicketing,
  getZipHotelPkgs,
  getZipHotels,
  getZipTransportPkgs,
  getZipVisaPkgs,
  submitOtherService,
  updateZipBooking,
  uploadPaymentReceipt,
} from "../controllers/zipAccounts.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { uploadUmrahDoc } from "../config/cloudinary.js";

const router = express.Router();

router.get("/umrahPackages", fetchZIPUmrahPkgs);
router.get("/umrahPackages/remaining-seats", fetchUmrahRemainingSeats);
router.get("/group-ticketing", getZipGroupTicketing);
router.get("/hotels", getZipHotels);

// ==============================================EXTRA SERVICES ===================================================
router.get("/visa-packages", getZipVisaPkgs);
router.get("/transport-packages", getZipTransportPkgs);
router.get("/hotel-packages", getZipHotelPkgs);
router.post("/submit-booking", protect, submitOtherService);
router.get("/get-booking", protect, getZipBookings);
router.get("/voucher/:bookingNumber", protect, getZipVoucherForBooking);
router.put("/update-booking/:id", protect, updateZipBooking);
router.post(
  "/upload-receipt",
  protect,
  uploadUmrahDoc.single("file"),
  uploadPaymentReceipt,
);

export default router;
