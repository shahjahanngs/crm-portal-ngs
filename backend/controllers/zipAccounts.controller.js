/**
 * ZIP Accounts Controller (Simplified)
 *
 * Controller for basic ZIP Accounts API operations
 * Uses helpers for complex queries that require filtering
 *
 * @module controllers/zipAccounts
 */

import zipAccountsService from "../services/zipAccounts.service.js";
import Register from "../models/Register.js";
import { cloudinary } from "../config/cloudinary.js";
import {
  findAccountById,
  findAccountByName,
  findSubhead1ById,
  findSubhead2ById,
  findSubhead1ByName,
  findSubhead2ByName,
  getAccountsBySubhead2Id as findAccountsBySubhead2,
  getSubhead2BySubhead1Id as findSubhead2BySubhead1,
} from "../utils/zipAccountHelper.js";

/**
 * Get all ZIP accounts
 */
export const getAllAccounts = async (req, res) => {
  try {
    const result = await zipAccountsService.getAllAccounts();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get All Accounts Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all subhead1 (chart of accounts level 1)
 */
export const getSubhead1 = async (req, res) => {
  try {
    const result = await zipAccountsService.getSubhead1();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead1 Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all subhead2 (chart of accounts level 2)
 */
export const getSubhead2 = async (req, res) => {
  try {
    const result = await zipAccountsService.getSubhead2();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead2 Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get account by ID
 */
export const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await findAccountById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Account By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get account by name
 */
export const getAccountByName = async (req, res) => {
  try {
    const { name } = req.params;
    const result = await findAccountByName(name);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Account By Name Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subhead1 by ID
 */
export const getSubhead1ById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await findSubhead1ById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Subhead1 not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead1 By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subhead2 by ID
 */
export const getSubhead2ById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await findSubhead2ById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Subhead2 not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead2 By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subhead1 by name
 */
export const getSubhead1ByName = async (req, res) => {
  try {
    const { name } = req.params;
    const result = await findSubhead1ByName(name);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Subhead1 not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead1 By Name Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subhead2 by name
 */
export const getSubhead2ByName = async (req, res) => {
  try {
    const { name } = req.params;
    const result = await findSubhead2ByName(name);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Subhead2 not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead2 By Name Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get accounts by subhead2 ID
 */
export const getAccountsBySubhead2Id = async (req, res) => {
  try {
    const { subhead2Id } = req.params;
    const result = await findAccountsBySubhead2(subhead2Id);

    res.status(200).json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Get Accounts By Subhead2 ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subhead2 by subhead1 ID
 */
export const getSubhead2BySubhead1Id = async (req, res) => {
  try {
    const { subhead1Id } = req.params;
    const result = await findSubhead2BySubhead1(subhead1Id);

    res.status(200).json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Get Subhead2 By Subhead1 ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getZipGroupTicketing = async (req, res) => {
  try {
    const result = await zipAccountsService.fetchGroupTicketing();
    // External API may return a plain array or { success, data } — normalise to array
    const list = Array.isArray(result) ? result : (result?.data ?? result);
    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Get Zip Group Ticketing Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getZipHotels = async (req, res) => {
  try {
    const result = await zipAccountsService.fetchHotels();
    const list = Array.isArray(result) ? result : (result?.data ?? result);
    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Get Zip Hotels Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getZipBankAccounts = async (req, res) => {
  try {
    const result = await zipAccountsService.fetchBankAccounts();
    const list = Array.isArray(result) ? result : (result?.data ?? result);

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Get Zip Bank Accounts Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getZipVisaPkgs = async (req, res) => {
  try {
    const result = await zipAccountsService.fetchVisaPackages();
    const list = Array.isArray(result) ? result : (result?.data ?? result);
    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Get Zip Visa Pkgs Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getZipTransportPkgs = async (req, res) => {
  try {
    const result = await zipAccountsService.fetchTransportPackages();
    const list = Array.isArray(result) ? result : (result?.data ?? result);
    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Get Zip Visa transport pkgs Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getZipHotelPkgs = async (req, res) => {
  try {
    const result = await zipAccountsService.fetchHotelPackages();
    const list = Array.isArray(result) ? result : (result?.data ?? result);
    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error("Get Zip hotel Pkgs Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const submitOtherService = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Fetch user to get zipId
    const user = await Register.findById(userId).select("zipId name email");

    if (!user || !user.zipId) {
      return res.status(400).json({
        success: false,
        message: "User zipId not found. Please contact administrator.",
      });
    }

    // Validate zipId is not empty
    const zipId = user.zipId.trim();
    if (!zipId) {
      return res.status(400).json({
        success: false,
        message: "User zipId is empty. Please contact administrator.",
      });
    }

    // Generate unique booking number based on service type
    const timestamp = Date.now();
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    let bookingPrefix = "SVC"; // Default service prefix
    if (req.body.type === "Visa") {
      bookingPrefix = "VISA";
    } else if (req.body.type === "Hotel") {
      bookingPrefix = "HOTEL";
    } else if (req.body.type === "Transport") {
      bookingPrefix = "TRNSP";
    } else if (req.body.type === "UmrahPackage") {
      bookingPrefix = "UMRAH";
    }

    const bookingNumber = `${bookingPrefix}-${timestamp}-${randomSuffix}`;

    // Parse passengers if needed
    let passengers = req.body.passengers || [];
    if (typeof passengers === "string") {
      passengers = JSON.parse(passengers);
    }

    // Calculate total passengers
    const totalPassengers = passengers.length;

    // Use originalPkg from request body (sent by frontend which already has full package data)
    let originalPkg = req.body.originalPkg || null;
    if (originalPkg) {
      console.log(
        `📦 Using originalPkg from request body:`,
        originalPkg.visaName ||
          originalPkg.hotelName ||
          originalPkg.name ||
          originalPkg._id,
      );
    } else {
      console.warn(
        `⚠️ originalPkg not provided in request body for type: ${req.body.type}`,
      );
    }

    // Prepare consistent metadata structure similar to Umrah bookings
    const serviceMetadata = {
      localBookingId: bookingNumber,
      bookingNumber: bookingNumber,
      packageId: req.body.packageId,
      roomType: req.body.roomType,
      packageName: req.body.packageName || `${req.body.type} Service`,
      serviceType: req.body.type, // 'Visa', 'Hotel', or 'Transport'
      totalPassengers: totalPassengers,
      originalPkg: originalPkg,
      contactInfo: req.body.contactInfo || {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
      },
      passengers: passengers.map((p) => ({
        type: p.type || "Adult",
        name:
          p.name ||
          p.fullName ||
          `${p.givenName || ""} ${p.surName || ""}`.trim(),
        givenName: p.givenName,
        surName: p.surName,
        passport: p.passport || p.passportNumber,
        passportExpiry: p.passportExpiry || "",
        dob: p.dateOfBirth || p.dob,
        nationality: p.nationality,
        gender: p.gender,
        documentUrl: p.documentUrl,
        title: p.title || "",
      })),
      specialRequests: req.body.notes || req.body.specialRequests,
      createdBy: user.email,
      userId: userId.toString(),
      totalPrice: req.body.totalPrice || 0,
      currency: req.body.currency || "PKR",
    };

    // Add service-specific details to metadata
    if (req.body.type === "Visa") {
      serviceMetadata.visaDetails = {
        duration: req.body.duration,
        transportMode: req.body.transportMode,
        visaType: req.body.visaType,
        processingType: req.body.processingType,
      };
    } else if (req.body.type === "Hotel") {
      serviceMetadata.hotelDetails = {
        roomType: req.body.roomType,
        checkIn: req.body.checkIn,
        checkOut: req.body.checkOut,
        numberOfNights: req.body.numberOfNights,
        numberOfRooms: req.body.numberOfRooms,
      };
    } else if (req.body.type === "Transport") {
      serviceMetadata.transportDetails = {
        numberOfPax: req.body.numberOfPax,
        vehicleType: req.body.vehicleType,
        pickupLocation: req.body.pickupLocation,
        dropoffLocation: req.body.dropoffLocation,
        pickupDate: req.body.pickupDate,
        pickupTime: req.body.pickupTime,
      };
    }

    // Prepare ZIP booking data with consistent structure
    const zipBookingData = {
      refNo: bookingNumber,
      bookingId: bookingNumber,
      type: req.body.type,
      bookingAgainst: req.body.packageId,
      status: "pending",
      payments: [],
      metadata: serviceMetadata,
      is_void: false,
      created_by: zipId,
    };

    const result = await zipAccountsService.createPKGBooking(zipBookingData);
    console.log("✅ ZIP Accounts booking created:", result);

    res.status(201).json({
      success: true,
      data: result,
      bookingNumber: bookingNumber,
      message: "Booking created successfully",
    });
  } catch (error) {
    console.error("❌ Submit other service error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getZipBookings = async (req, res) => {
  try {
    const result = await zipAccountsService.fetchBookings(req.query);
    res.status(200).json({
      success: true,
      data: result,
      message: "Booking fetched successfully",
    });
  } catch (error) {
    console.error("fetch booking error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getZipVoucherForBooking = async (req, res) => {
  try {
    const { bookingNumber } = req.params;
    const result = await zipAccountsService.fetchVoucherForBooking(bookingNumber);

    res.status(200).json({
      success: true,
      data: result,
      message: "Voucher fetched successfully",
    });
  } catch (error) {
    console.error("Fetch ZIP voucher for booking error:", error);
    const isNotFound = /not found/i.test(error.message);
    res.status(isNotFound ? 404 : 500).json({
      success: false,
      message: isNotFound ? "Your voucher is not generated till now" : error.message,
    });
  }
};

export const updateZipBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const result = await zipAccountsService.updateBooking(id, payload);

    res.status(200).json({
      success: true,
      data: result,
      message: "Booking updated successfully",
    });
  } catch (error) {
    console.error("Update ZIP booking error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadPaymentReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    // req.file.path is the Cloudinary secure_url when using CloudinaryStorage
    const url = req.file.path || req.file.secure_url || "";
    res.status(200).json({ success: true, url });
  } catch (error) {
    console.error("Upload payment receipt error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
