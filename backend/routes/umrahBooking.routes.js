import express from "express";
import {
  createUmrahBooking,
  getAllUmrahBookings,
  getMyBookings,
  getAllBookingsAdmin,
  getUmrahBookingById,
  updateUmrahBooking,
  deleteUmrahBooking,
  submitPayment,
  reviewPayment,
  updateVisaStatus,
  updateHotelStatus,
  updateVoucherStatus,
  updateOverallStatus,
} from "../controllers/umrahBooking.controller.js";
import { protect, adminOnly } from "../middleware/auth.middleware.js";
import { uploadUmrahDoc, uploadPassengerDoc } from "../config/cloudinary.js";

const router = express.Router();

/* ===========================
   MAIN CRUD ROUTES
=========================== */
router.post(
  "/",
  protect,
  uploadPassengerDoc.array("passportFiles", 20),
  createUmrahBooking,
);
router.get("/", protect, getAllUmrahBookings);
router.get("/my-bookings", protect, getMyBookings);
router.get("/admin/all", protect, adminOnly, getAllBookingsAdmin);
router.get("/:id", protect, getUmrahBookingById);
router.put("/:id", protect, updateUmrahBooking);
router.delete("/:id", protect, deleteUmrahBooking);

/* ===========================
   PAYMENT ROUTES
=========================== */
// Agent/User submits payment with receipt
router.post(
  "/:id/submit-payment",
  protect,
  uploadUmrahDoc.single("receiptFile"),
  submitPayment,
);

// Admin reviews payment (update status, upload proof, or reject)
router.patch(
  "/payment/:paymentId/review",
  protect,
  adminOnly,
  uploadUmrahDoc.single("approvalProofFile"),
  reviewPayment,
);

/* ===========================
   OTHER STATUS UPDATE ROUTES
=========================== */
router.patch(
  "/:id/visa-status",
  protect,
  adminOnly,
  uploadUmrahDoc.single("approvalDocument"),
  updateVisaStatus,
);
router.patch(
  "/:id/hotel-status",
  protect,
  adminOnly,
  uploadUmrahDoc.single("confirmationDocument"),
  updateHotelStatus,
);
router.patch("/:id/voucher-status", protect, adminOnly, updateVoucherStatus);
router.patch("/:id/overall-status", protect, adminOnly, updateOverallStatus);

export default router;
