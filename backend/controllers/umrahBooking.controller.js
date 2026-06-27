import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import zipAccountsService from "../services/zipAccounts.service.js";
import { mapToHotelUmrahVoucherPayload } from "../utils/transform.js";

/* ===========================
   CREATE UMRAH PACKAGE BOOKING
   
   NOTE: Bookings can reference packages from two sources:
   - "zip-accounts": External ZIP API packages (NOT in local DB)
   - "local-db": Locally managed packages (stored in MongoDB)
   
   Status updates work with booking data only, not package lookups.
=========================== */
export const createUmrahBooking = async (req, res) => {
  try {
    // Generate unique booking number
    const timestamp = Date.now();
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const bookingNumber = `UMR-${timestamp}-${randomSuffix}`;

    // Parse passengers array if it comes as string (from FormData)
    let passengers = req.body.passengers;
    if (typeof passengers === "string") {
      passengers = JSON.parse(passengers);
    } else if (typeof passengers === "object" && !Array.isArray(passengers)) {
      // If passengers come as object with indices as keys
      passengers = Object.values(passengers);
    }

    // Handle uploaded passport files
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        if (passengers[index]) {
          passengers[index].documentUrl = file.path; // Cloudinary URL
        }
      });
    }

    // Parse pricing object if it comes as individual fields
    let pricing = req.body.pricing;
    if (!pricing || typeof pricing !== "object" || Array.isArray(pricing)) {
      pricing = {
        pricePerPerson: parseFloat(
          req.body["pricing[pricePerPerson]"] || req.body.pricePerPerson || 0,
        ),
        currency: req.body["pricing[currency]"] || req.body.currency || "PKR",
      };
    }

    // Parse flight details if they come as individual fields
    let flightDetails = req.body.flightDetails;
    if (
      !flightDetails ||
      typeof flightDetails !== "object" ||
      Array.isArray(flightDetails)
    ) {
      flightDetails = {
        departure: {
          date: req.body["flightDetails[departure][date]"],
          from: req.body["flightDetails[departure][from]"],
          to: req.body["flightDetails[departure][to]"],
          flightNumber: req.body["flightDetails[departure][flightNumber]"],
        },
        return: req.body["flightDetails[return][date]"]
          ? {
              date: req.body["flightDetails[return][date]"],
              flightNumber: req.body["flightDetails[return][flightNumber]"],
            }
          : undefined,
      };
    }

    // Calculate total price
    const totalPassengers = passengers?.length || 0;
    const totalPrice = pricing?.pricePerPerson
      ? pricing.pricePerPerson * totalPassengers
      : 0;

    const bookingData = {
      bookingNumber,
      packageId: req.body.packageId,
      packageName: req.body.packageName,
      packageSource: req.body.packageSource || "local-db",
      user: req.body.user,
      passengers,
      roomType: req.body.roomType,
      pricing: {
        ...pricing,
        totalPrice,
      },
      flightDetails,
      specialRequests: req.body.specialRequests,
      paymentStatus: {
        status: "Pending",
        totalAmount: totalPrice,
        paidAmount: 0,
        remainingAmount: totalPrice,
        paymentHistory: [],
      },
    };

    const booking = await UmrahPackageBooking.create(bookingData);

    res.status(201).json({
      success: true,
      message: "Umrah package booking created successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Create Umrah Booking Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET ALL UMRAH BOOKINGS
=========================== */
export const getAllUmrahBookings = async (req, res) => {
  try {
    const { status, user, packageId } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.overallStatus = status;
    if (user) filter.user = user;
    if (packageId) filter.packageId = packageId;

    const bookings = await UmrahPackageBooking.find(filter)
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get All Umrah Bookings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET MY BOOKINGS (USER)
=========================== */
export const getMyBookings = async (req, res) => {
  try {
    // req.user is set by protect middleware
    const bookings = await UmrahPackageBooking.find({
      user: req.user._id.toString(),
    })
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get My Bookings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET ALL BOOKINGS (ADMIN ONLY)
=========================== */
export const getAllBookingsAdmin = async (req, res) => {
  try {
    const { status, user, packageId, search } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.overallStatus = status;
    if (user) filter.user = user;
    if (packageId) filter.packageId = packageId;
    if (search) {
      filter.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { packageName: { $regex: search, $options: "i" } },
      ];
    }

    const bookings = await UmrahPackageBooking.find(filter)
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get All Bookings Admin Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET SINGLE UMRAH BOOKING BY ID
=========================== */
export const getUmrahBookingById = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Get Umrah Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE UMRAH BOOKING
=========================== */
export const updateUmrahBooking = async (req, res) => {
  try {
    // If updating passengers, recalculate total price
    if (req.body.passengers || req.body.pricing?.pricePerPerson) {
      const booking = await UmrahPackageBooking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Umrah booking not found",
        });
      }

      const passengers = req.body.passengers || booking.passengers;
      const pricePerPerson =
        req.body.pricing?.pricePerPerson || booking.pricing.pricePerPerson;
      const totalPrice = pricePerPerson * passengers.length;

      req.body.pricing = {
        ...booking.pricing,
        ...req.body.pricing,
        totalPrice,
      };

      // Update payment status total amount if needed
      if (req.body.paymentStatus) {
        req.body.paymentStatus.totalAmount = totalPrice;
      } else {
        req.body.paymentStatus = {
          ...booking.paymentStatus,
          totalAmount: totalPrice,
        };
      }
    }

    const booking = await UmrahPackageBooking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Umrah booking updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Umrah Booking Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   DELETE UMRAH BOOKING
=========================== */
export const deleteUmrahBooking = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Umrah booking deleted successfully",
    });
  } catch (error) {
    console.error("Delete Umrah Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   SUBMIT PAYMENT (AGENT/USER)
   Agent/User submits payment with receipt
=========================== */
export const submitPayment = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // Verify user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only submit payments for your own bookings",
      });
    }

    const { amount, method, receiptNumber, notes } = req.body;

    if (!amount || !method) {
      return res.status(400).json({
        success: false,
        message: "Amount and payment method are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Receipt file is required",
      });
    }

    // Create payment entry with pending status
    const paymentEntry = {
      amount: parseFloat(amount),
      method,
      paymentDate: new Date(),
      receiptNumber: receiptNumber || "",
      receiptFile: req.file.path, // Cloudinary URL
      notes: notes || "",
      paymentStatus: "Pending", // Admin needs to review
      submittedBy: req.user._id.toString(),
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: "",
      approvalProofFile: "",
    };

    booking.paymentStatus.paymentHistory.push(paymentEntry);
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Payment submitted successfully. Waiting for admin review.",
      data: booking,
    });
  } catch (error) {
    console.error("Submit Payment Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   REVIEW PAYMENT (ADMIN ONLY)
   Admin reviews payment and updates status
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
=========================== */
export const reviewPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { paymentStatus, rejectionReason } = req.body;

    // Find booking by scanning all payment histories with toString comparison
    const allBookings = await UmrahPackageBooking.find({
      "paymentStatus.paymentHistory.0": { $exists: true },
    });

    let booking = null;
    let payment = null;

    for (const b of allBookings) {
      const found = b.paymentStatus.paymentHistory.find(
        (p) => p._id.toString() === paymentId,
      );
      if (found) {
        booking = b;
        payment = found;
        break;
      }
    }

    if (!booking || !payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Validate status
    if (
      !["Pending", "Received", "Approved", "Rejected"].includes(paymentStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    // Check rejection reason if status is Rejected
    if (paymentStatus === "Rejected" && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required when rejecting payment",
      });
    }

    const previousStatus = payment.paymentStatus;

    // Update payment
    payment.paymentStatus = paymentStatus;
    payment.reviewedBy = req.user._id.toString();
    payment.reviewedAt = new Date();

    if (paymentStatus === "Rejected") {
      payment.rejectionReason = rejectionReason;
    }

    // If approved OR received, add proof file and update paid amount
    if (paymentStatus === "Approved" || paymentStatus === "Received") {
      if (req.file) {
        payment.approvalProofFile = req.file.path; // Cloudinary URL
      }

      // Update paid amount only if not already counted
      if (previousStatus !== "Approved" && previousStatus !== "Received") {
        booking.paymentStatus.paidAmount += payment.amount;
        booking.paymentStatus.remainingAmount =
          booking.paymentStatus.totalAmount - booking.paymentStatus.paidAmount;

        // Update overall payment status - only mark as Paid when fully paid
        if (booking.paymentStatus.remainingAmount <= 0) {
          booking.paymentStatus.status = "Paid";
        }
      }
    }

    // If moving from Approved/Received to Rejected, subtract from paid amount
    if (
      paymentStatus === "Rejected" &&
      (previousStatus === "Approved" || previousStatus === "Received")
    ) {
      booking.paymentStatus.paidAmount -= payment.amount;
      booking.paymentStatus.remainingAmount =
        booking.paymentStatus.totalAmount - booking.paymentStatus.paidAmount;

      // Update overall payment status
      if (booking.paymentStatus.paidAmount <= 0) {
        booking.paymentStatus.status = "Pending";
      } else if (booking.paymentStatus.remainingAmount <= 0) {
        booking.paymentStatus.status = "Paid";
      }
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: `Payment ${paymentStatus.toLowerCase()} successfully`,
      data: booking,
    });
  } catch (error) {
    console.error("Review Payment Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE VISA STATUS
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
   Checks payment dependency before allowing visa updates.
=========================== */
export const updateVisaStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // Check if payment is completed (dependency)
    if (booking.paymentStatus.status !== "Paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot update visa status. Payment must be completed.",
      });
    }

    const updateData = {
      ...booking.visaStatus,
      ...req.body,
    };

    // Add approval document if file uploaded
    if (req.file) {
      updateData.approvalDocument = req.file.path; // Cloudinary URL
    }

    booking.visaStatus = updateData;

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Visa status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Visa Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE HOTEL STATUS
=========================== */
/* ===========================
   UPDATE HOTEL STATUS
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
   Checks visa dependency before allowing hotel updates.
=========================== */
export const updateHotelStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // Check if visa is approved (dependency)
    if (booking.visaStatus.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Cannot update hotel status. Visa must be approved first.",
      });
    }

    const updateData = {
      ...booking.hotelStatus,
      ...req.body,
    };

    // Add confirmation document if file uploaded
    if (req.file) {
      updateData.confirmationDocument = req.file.path; // Cloudinary URL
    }

    booking.hotelStatus = updateData;

    // Auto-update overall status to "Confirmed" when hotel is confirmed
    if (updateData.status === "Confirmed") {
      booking.overallStatus = "Confirmed";

      // Create voucher in ZIP Accounts when hotel is confirmed
      // Only create if not already created
      if (!booking.voucherStatus.zipVoucherId) {
        try {
          console.log(
            "🔄 Creating ZIP Accounts voucher for booking:",
            booking.bookingNumber,
          );

          // Prepare data for ZIP voucher creation
          let packageData = {};

          // If package is from ZIP accounts, fetch the full package data
          if (booking.packageSource === "zip-accounts") {
            try {
              const zipPackages = await zipAccountsService.fetchUmrahPackages();
              const foundPackage = zipPackages.data?.find(
                (pkg) =>
                  pkg._id === booking.packageId || pkg.id === booking.packageId,
              );

              if (foundPackage) {
                packageData = foundPackage;
                console.log("📦 Found ZIP package data for voucher creation");
              }
            } catch (fetchError) {
              console.error(
                "⚠️ Could not fetch ZIP package data:",
                fetchError.message,
              );
              // Continue with minimal package data
            }
          }

          const voucherData = {
            packageId: booking.packageId,
            packageName: booking.packageName,
            packageSource: booking.packageSource,
            user: booking.user,
            roomType: booking.roomType,
            specialRequests: booking.specialRequests,
            pricing: booking.pricing,
            packageData:
              Object.keys(packageData).length > 0
                ? JSON.stringify(packageData)
                : JSON.stringify({
                    _id: booking.packageId,
                    packageName: booking.packageName,
                    packageSource: booking.packageSource,
                  }),
            passengers: booking.passengers,
          };

          const transformedData = mapToHotelUmrahVoucherPayload(voucherData);
          const zipRes =
            await zipAccountsService.createVoucher(transformedData);

          // Store ZIP voucher information in booking
          booking.voucherStatus.zipVoucherId =
            zipRes.newVoucher?._id || zipRes.data?._id;
          booking.voucherStatus.zipVoucherData = zipRes;
          booking.voucherStatus.zipVoucherCreatedAt = new Date();
          booking.voucherStatus.status = "Generated";
          booking.voucherStatus.generatedDate = new Date();
          booking.voucherStatus.voucherNumber =
            zipRes.newVoucher?.voucher_number || zipRes.data?.voucher_number;

          console.log(
            "✅ ZIP Voucher created successfully:",
            zipRes.newVoucher?._id || zipRes.data?._id,
          );
        } catch (zipError) {
          console.error("❌ Error creating ZIP voucher:", zipError.message);
          // Don't fail the hotel confirmation if ZIP voucher creation fails
          // Just log the error and continue
        }
      }
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Hotel status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Hotel Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE VOUCHER STATUS
=========================== */
export const updateVoucherStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    booking.voucherStatus = {
      ...booking.voucherStatus,
      ...req.body,
    };

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Voucher status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Voucher Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE OVERALL STATUS
=========================== */
export const updateOverallStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const booking = await UmrahPackageBooking.findByIdAndUpdate(
      req.params.id,
      { overallStatus: status },
      { new: true, runValidators: true },
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Overall status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Overall Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
