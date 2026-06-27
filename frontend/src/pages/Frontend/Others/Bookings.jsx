import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axios";
import { theme } from "../../../theme/theme";
import { toast } from "react-toastify";
import { X, Upload, Plus, CheckCircle, CreditCard, FileText } from "lucide-react";

export default function OthersBookings({ type }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "",
    receiptNumber: "",
    notes: "",
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // ─── Payment helpers ────────────────────────────────────────────────────────
  const getPayments = (booking) =>
    booking.metadata?.payments || booking.payments || [];

  const getApprovedPaidAmount = (booking) =>
    getPayments(booking)
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

  const getPendingAmount = (booking) =>
    getPayments(booking)
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Available = total minus approved AND pending (prevents over-submission)
  const getRemainingAmount = (booking) => {
    const total = booking.metadata?.totalPrice || 0;
    const committed = getApprovedPaidAmount(booking) + getPendingAmount(booking);
    return Math.max(0, total - committed);
  };

  // ─── Payment modal handlers ─────────────────────────────────────────────────
  const handleOpenDetailsModal = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedBooking(null);
  };

  const handleOpenPaymentModal = (booking) => {
    setSelectedBooking(booking);
    setShowPaymentModal(true);
    setPaymentForm({ amount: "", method: "", receiptNumber: "", notes: "" });
    setReceiptFile(null);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedBooking(null);
    setPaymentForm({ amount: "", method: "", receiptNumber: "", notes: "" });
    setReceiptFile(null);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    const remaining = getRemainingAmount(selectedBooking);
    const submittingAmount = parseFloat(paymentForm.amount);

    if (submittingAmount < 1) {
      toast.error("Amount must be at least 1");
      return;
    }
    if (remaining <= 0) {
      toast.error(
        "This booking already has payments covering the full amount. No further payment can be submitted.",
      );
      return;
    }
    if (submittingAmount > remaining) {
      toast.error(
        `Amount cannot exceed the available balance of ${selectedBooking.metadata?.currency || "PKR"} ${remaining.toLocaleString()} (approved + pending payments already cover the rest)`,
      );
      return;
    }

    try {
      setSubmittingPayment(true);

      let receiptImageUrl = "";
      if (receiptFile) {
        const uploadData = new FormData();
        uploadData.append("file", receiptFile);
        const uploadRes = await axiosInstance.post(
          "/zip-accounts/upload-receipt",
          uploadData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        receiptImageUrl = uploadRes.data?.url || "";
      }

      const newPayment = {
        amount: submittingAmount,
        currency: selectedBooking.metadata?.currency || "PKR",
        method: paymentForm.method,
        transactionRef: paymentForm.receiptNumber || "",
        receiptImage: receiptImageUrl,
        status: "pending",
        note: paymentForm.notes || "",
        submittedAt: new Date().toISOString(),
      };

      const updatedPayments = [...getPayments(selectedBooking), newPayment];

      const payload = {
        type: selectedBooking.type,
        bookingAgainst: selectedBooking.bookingAgainst || null,
        metadata: { ...selectedBooking.metadata, payments: updatedPayments },
        created_by: selectedBooking.created_by || null,
      };

      await axiosInstance.put(
        `/zip-accounts/update-booking/${selectedBooking._id}`,
        payload,
      );

      toast.success("Payment submitted successfully! Waiting for admin review.");
      handleClosePaymentModal();
      fetchBookings();
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error(error.response?.data?.message || "Failed to submit payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/zip-accounts/get-booking");
      if (res.data.success) {
        // Filter bookings based on type and only show those with originalPkg (valid bookings)
        const filteredBookings = res.data.data.bookings.filter(
          (booking) => booking.type === type && booking.metadata?.originalPkg,
        );
        const storedUser = localStorage.getItem("frontend_user");
        const currentUserId = storedUser
          ? JSON.parse(storedUser)?.zipId || JSON.parse(storedUser)?.id
          : null;
        const filtered = currentUserId
          ? filteredBookings.filter((b) => b.created_by === currentUserId)
          : filteredBookings;
        setBookings(filtered);
        // setBookings(filteredBookings);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredBookings = () => {
    if (statusFilter === "all") return bookings;
    return bookings.filter(
      (booking) => booking.status?.toLowerCase() === statusFilter.toLowerCase(),
    );
  };

  const getStatusCounts = () => {
    const counts = {
      all: bookings.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
    bookings.forEach((booking) => {
      const status = booking.status?.toLowerCase();
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });
    return counts;
  };

  useEffect(() => {
    fetchBookings();
  }, [type]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderTypeSpecificData = (booking) => {
    const { metadata } = booking;
    const originalPkg = metadata?.originalPkg;

    if (!originalPkg) return <span className="text-gray-500 text-sm">-</span>;

    if (type === "Hotel") {
      const hotelDetails = metadata?.hotelDetails;
      const roomType = originalPkg.rates?.find(
        (r) => r._id === hotelDetails?.roomType,
      );

      return (
        <div className="text-sm space-y-1">
          <div className="font-medium text-gray-900">
            {originalPkg.hotelName}
          </div>
          <div className="text-gray-600">Room: {roomType?.name || "N/A"}</div>
          <div className="text-xs text-gray-500">
            Check-in: {hotelDetails?.checkIn}
          </div>
          <div className="text-xs text-gray-500">
            Check-out: {hotelDetails?.checkOut}
          </div>
        </div>
      );
    }

    if (type === "Transport") {
      return (
        <div className="text-sm space-y-1">
          <div className="font-medium text-gray-900">
            {originalPkg.transportType}
          </div>
          <div className="text-gray-600">Sector: {originalPkg.sector}</div>
          <div className="text-xs text-gray-500">
            Contact: {originalPkg.contactNumber}
          </div>
        </div>
      );
    }

    if (type === "Visa") {
      const visaDetails = metadata?.visaDetails;
      const duration = visaDetails?.duration;
      const transportMode = visaDetails?.transportMode;
      const pricing = originalPkg.pricing?.[duration]?.[transportMode] || {};

      return (
        <div className="text-sm space-y-1">
          <div className="font-medium text-gray-900">
            {originalPkg.visaName} - {originalPkg.visaCountry}
          </div>
          <div className="text-gray-600">Duration: {duration} days</div>
          <div className="text-gray-600 capitalize">
            Transport: {transportMode?.replace("with", "With ")}
          </div>
        </div>
      );
    }

    if (type === "GroupTicketing") {
      const groupDetails = metadata?.groupDetails;
      const flightDetails = metadata?.flightDetails;
      const pricing = metadata?.pricing;

      return (
        <div className="text-sm space-y-1">
          <div className="font-medium text-gray-900">
            {groupDetails?.airline?.name} - {groupDetails?.sector}
          </div>
          <div className="text-gray-600">PNR: {groupDetails?.pnr}</div>
          <div className="text-gray-600 capitalize">
            Type: {groupDetails?.groupType}
          </div>
          {flightDetails && flightDetails.length > 0 && (
            <div className="text-xs text-gray-500">
              Flights: {flightDetails[0]?.flightNo} ({flightDetails[0]?.depDate}
              )
            </div>
          )}
          {pricing && (
            <div className="text-xs font-semibold text-green-600">
              Total: {pricing.currency} {pricing.grandTotal?.toLocaleString()}
            </div>
          )}
          {metadata?.bookingReference && (
            <div className="text-xs text-blue-600">
              Ref: {metadata.bookingReference}
            </div>
          )}
        </div>
      );
    }

    if (type === "UmrahPackage") {
      const pricing = metadata?.totalPrice;
      const roomType = metadata?.roomType;

      return (
        <div className="text-sm space-y-1">
          <div className="font-medium text-gray-900">
            {originalPkg.packageName || metadata?.packageName}
          </div>
          <div className="text-gray-600">Sector: {originalPkg.sector}</div>
          <div className="text-gray-600 capitalize">Room: {roomType}</div>
          {originalPkg.hotels && originalPkg.hotels.length > 0 && (
            <div className="text-xs text-gray-500">
              Hotel: {originalPkg.hotels[0]?.name}
            </div>
          )}
          {pricing && (
            <div className="text-xs font-semibold text-green-600">
              Total: {metadata?.currency} {pricing?.toLocaleString()}
            </div>
          )}
          {originalPkg.refNumber && (
            <div className="text-xs text-blue-600">
              Ref: {originalPkg.refNumber}
            </div>
          )}
        </div>
      );
    }

    return <span className="text-gray-500 text-sm">-</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderColor: theme.colors.primary }}
          ></div>
          <p className="mt-4 text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  const filteredBookings = getFilteredBookings();
  const statusCounts = getStatusCounts();

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{type} Bookings</h1>
        <p className="text-gray-600 mt-1">
          Total {bookings.length} {type.toLowerCase()} booking(s) found
        </p>
      </div>

      {/* Status Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === "all"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
        >
          All ({statusCounts.all})
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === "pending"
              ? "bg-yellow-500 text-white"
              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            }`}
        >
          Pending ({statusCounts.pending})
        </button>
        <button
          onClick={() => setStatusFilter("confirmed")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === "confirmed"
              ? "bg-blue-500 text-white"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
        >
          Confirmed ({statusCounts.confirmed})
        </button>
        <button
          onClick={() => setStatusFilter("completed")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === "completed"
              ? "bg-green-500 text-white"
              : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
        >
          Completed ({statusCounts.completed})
        </button>
        <button
          onClick={() => setStatusFilter("cancelled")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === "cancelled"
              ? "bg-red-500 text-white"
              : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
        >
          Cancelled ({statusCounts.cancelled})
        </button>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">
            No {type.toLowerCase()} bookings found
            {statusFilter !== "all" && " for this status"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Package/Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking._id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleOpenDetailsModal(booking)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.bookingId}
                      </div>
                      {booking.metadata?.bookingNumber && (
                        <div className="text-xs text-gray-500">
                          {booking.metadata.bookingNumber}
                        </div>
                      )}
                      {booking.refNo && (
                        <div className="text-xs text-gray-500">
                          Ref: {booking.refNo}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.metadata?.packageName ||
                          booking.metadata?.originalPkg?.packageName ||
                          booking.metadata?.originalPkg?.hotelName ||
                          booking.metadata?.originalPkg?.visaName ||
                          "N/A"}
                      </div>
                      {booking.metadata?.originalPkg?.documentNumber && (
                        <div className="text-xs text-blue-600">
                          {booking.metadata.originalPkg.documentNumber}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 capitalize">
                        {booking.type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {booking.metadata?.contactInfo?.name || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {booking.metadata?.contactInfo?.email || "N/A"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {booking.metadata?.contactInfo?.phone || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {renderTypeSpecificData(booking)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          booking.status,
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(booking.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {(() => {
                        const total = booking.metadata?.totalPrice || 0;
                        const approved = getApprovedPaidAmount(booking);
                        const pending = getPendingAmount(booking);
                        const available = getRemainingAmount(booking);
                        const hasRejected = getPayments(booking).some(
                          (p) => p.status === "rejected",
                        );
                        const isFullyPaid = total > 0 && available <= 0;
                        const hasPending = pending > 0;

                        return (
                          <div className="flex flex-col items-center gap-1.5">
                            {/* Status badge */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${isFullyPaid
                                  ? "bg-emerald-50 text-emerald-700"
                                  : hasPending
                                    ? "bg-blue-50 text-blue-700"
                                    : approved > 0
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-gray-100 text-gray-600"
                                }`}
                            >
                              {isFullyPaid
                                ? "Covered"
                                : hasPending
                                  ? "Pending Review"
                                  : approved > 0
                                    ? "Partial"
                                    : "Unpaid"}
                            </span>

                            {hasRejected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                                {
                                  getPayments(booking).filter(
                                    (p) => p.status === "rejected",
                                  ).length
                                }{" "}
                                Rejected
                              </span>
                            )}

                            {/* Pay / Paid button */}
                            {isFullyPaid ? (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Paid
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPaymentModal(booking);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs font-medium"
                              >
                                <Plus className="w-3 h-3" />
                                Pay
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOOKING DETAILS MODAL */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={handleCloseDetailsModal}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-start justify-between bg-gradient-to-r from-emerald-50 to-blue-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {selectedBooking.bookingId || selectedBooking.refNo}
                </p>
              </div>
              <button
                onClick={handleCloseDetailsModal}
                className="p-2 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {/* Booking Info */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Booking Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">Booking ID</p>
                    <p className="font-mono font-bold text-gray-900">{selectedBooking.bookingId || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">Type</p>
                    <p className="font-semibold text-gray-900 capitalize">{selectedBooking.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">Status</p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${selectedBooking.status === "confirmed"
                          ? "bg-blue-50 text-blue-700"
                          : selectedBooking.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : selectedBooking.status === "completed"
                              ? "bg-emerald-50 text-emerald-700"
                              : selectedBooking.status === "cancelled"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                    >
                      {selectedBooking.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">Booked On</p>
                    <p className="font-semibold text-gray-900">{formatDate(selectedBooking.createdAt)}</p>
                  </div>
                  {selectedBooking.metadata?.totalPrice > 0 && (
                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase">Total Price</p>
                      <p className="font-bold text-emerald-600 text-lg">
                        {selectedBooking.metadata?.currency || "PKR"}{" "}
                        {selectedBooking.metadata.totalPrice.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedBooking.refNo && (
                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase">Ref No</p>
                      <p className="font-semibold text-gray-900">{selectedBooking.refNo}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Type-specific details */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Service Details
                </h3>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  {renderTypeSpecificData(selectedBooking)}
                </div>
              </div>

              {/* Contact Info */}
              {selectedBooking.metadata?.contactInfo?.name && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Contact Information</h3>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase">Name</p>
                      <p className="font-semibold text-gray-900">{selectedBooking.metadata.contactInfo.name}</p>
                    </div>
                    {selectedBooking.metadata.contactInfo.email && (
                      <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase">Email</p>
                        <p className="font-semibold text-gray-900">{selectedBooking.metadata.contactInfo.email}</p>
                      </div>
                    )}
                    {selectedBooking.metadata.contactInfo.phone && (
                      <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase">Phone</p>
                        <p className="font-semibold text-gray-900">{selectedBooking.metadata.contactInfo.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Status & History */}
              {selectedBooking.metadata?.totalPrice > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    Payment Status
                  </h3>
                  {/* Summary */}
                  {(() => {
                    const cur = selectedBooking.metadata?.currency || "PKR";
                    const total = selectedBooking.metadata?.totalPrice || 0;
                    const approved = getApprovedPaidAmount(selectedBooking);
                    const pending = getPendingAmount(selectedBooking);
                    const available = getRemainingAmount(selectedBooking);
                    const isFullyPaid = available <= 0;
                    return (
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Total</p>
                          <p className="font-bold text-gray-900 text-sm">{cur} {total.toLocaleString()}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Approved</p>
                          <p className="font-bold text-emerald-800 text-sm">{cur} {approved.toLocaleString()}</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 text-center">
                          <p className="text-[10px] font-bold uppercase text-amber-600 mb-1">Under Review</p>
                          <p className="font-bold text-amber-800 text-sm">{cur} {pending.toLocaleString()}</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center ${isFullyPaid ? "bg-emerald-50" : "bg-rose-50"}`}>
                          <p className={`text-[10px] font-bold uppercase mb-1 ${isFullyPaid ? "text-emerald-600" : "text-rose-600"}`}>
                            {isFullyPaid ? "Fully Paid" : "Available"}
                          </p>
                          <p className={`font-bold text-sm ${isFullyPaid ? "text-emerald-800" : "text-rose-800"}`}>
                            {cur} {available.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  {/* History */}
                  <div className="space-y-2">
                    {getPayments(selectedBooking).length > 0 ? (
                      getPayments(selectedBooking).map((payment, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-3 bg-gray-50">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">
                                {payment.currency || selectedBooking.metadata?.currency || "PKR"}{" "}
                                {payment.amount?.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {payment.submittedAt
                                  ? new Date(payment.submittedAt).toLocaleDateString()
                                  : "—"}{" "}
                                • {payment.method || "—"}
                                {payment.transactionRef ? ` • Ref: ${payment.transactionRef}` : ""}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-md ${payment.status === "approved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : payment.status === "pending"
                                    ? "bg-blue-100 text-blue-700"
                                    : payment.status === "rejected"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                            >
                              {payment.status === "pending"
                                ? "Pending Review"
                                : payment.status === "approved"
                                  ? "Approved"
                                  : payment.status === "rejected"
                                    ? "Rejected"
                                    : payment.status || "Pending"}
                            </span>
                          </div>
                          {payment.status === "rejected" && payment.note && (
                            <div className="px-3 pb-3 pt-2 bg-red-50 border-t border-red-200">
                              <p className="text-xs font-semibold text-red-700 uppercase mb-1">Rejection Note:</p>
                              <p className="text-xs text-red-800">{payment.note}</p>
                            </div>
                          )}
                          {payment.receiptImage && (
                            <div className="px-3 pb-3 pt-2 border-t border-gray-100">
                              <a
                                href={payment.receiptImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <Upload className="w-3 h-3" />
                                View Receipt
                              </a>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm italic">No payment submitted yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleCloseDetailsModal}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                Close
              </button>
              {(() => {
                const total = selectedBooking.metadata?.totalPrice || 0;
                const available = getRemainingAmount(selectedBooking);
                if (!total || available <= 0) return null;
                return (
                  <button
                    onClick={() => {
                      handleCloseDetailsModal();
                      handleOpenPaymentModal(selectedBooking);
                    }}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Submit Payment
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && selectedBooking && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={handleClosePaymentModal}
          ></div>

          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Submit Payment</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Ref:{" "}
                  <span className="font-mono font-medium text-emerald-600">
                    {selectedBooking.bookingId || selectedBooking.refNo}
                  </span>
                </p>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4">
              {/* Booking Info Summary */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">Booking ID</p>
                    <p className="font-mono font-bold text-gray-900">
                      {selectedBooking.bookingId || selectedBooking.refNo || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">Type</p>
                    <p className="font-semibold text-gray-900 capitalize">
                      {selectedBooking.type || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">Service</p>
                    <p className="font-semibold text-gray-900 truncate">
                      {selectedBooking.metadata?.packageName ||
                        selectedBooking.metadata?.originalPkg?.packageName ||
                        selectedBooking.metadata?.originalPkg?.hotelName ||
                        selectedBooking.metadata?.originalPkg?.visaName ||
                        "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">Booking Status</p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${selectedBooking.status === "confirmed"
                          ? "bg-emerald-50 text-emerald-700"
                          : selectedBooking.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                    >
                      {selectedBooking.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount Display */}
              {(() => {
                const cur = selectedBooking.metadata?.currency || "PKR";
                const total = selectedBooking.metadata?.totalPrice || 0;
                const approved = getApprovedPaidAmount(selectedBooking);
                const pending = getPendingAmount(selectedBooking);
                const available = getRemainingAmount(selectedBooking);
                return (
                  <div className="bg-emerald-50 rounded-2xl p-4 mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                          Total
                        </p>
                        <p className="text-base font-black text-emerald-900">
                          {cur} {total.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-1">
                          Approved
                        </p>
                        <p className="text-base font-black text-blue-900">
                          {cur} {approved.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wider mb-1">
                          Under Review
                        </p>
                        <p className="text-base font-black text-amber-900">
                          {cur} {pending.toLocaleString()}
                        </p>
                      </div>
                      <div className={available <= 0 ? "opacity-60" : ""}>
                        <p className="text-rose-600 text-[10px] font-bold uppercase tracking-wider mb-1">
                          Available
                        </p>
                        <p className="text-base font-black text-rose-900">
                          {cur} {available.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {available <= 0 && (
                      <p className="mt-3 text-center text-xs font-semibold text-rose-700 bg-rose-100 rounded-lg py-2">
                        Full amount is covered by approved / pending payments. No further payment needed.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Payment History */}
              {getPayments(selectedBooking).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Payment History
                  </h3>
                  <div className="space-y-2">
                    {getPayments(selectedBooking).map((payment, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-3">
                          <div className="text-sm flex-1">
                            <p className="font-bold text-gray-800">
                              {payment.currency ||
                                selectedBooking.metadata?.currency ||
                                "PKR"}{" "}
                              {payment.amount?.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {payment.submittedAt
                                ? new Date(payment.submittedAt).toLocaleDateString()
                                : "—"}{" "}
                              • {payment.method || "—"}
                              {payment.transactionRef
                                ? ` • Ref: ${payment.transactionRef}`
                                : ""}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-md ${payment.status === "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : payment.status === "pending"
                                  ? "bg-blue-100 text-blue-700"
                                  : payment.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                          >
                            {payment.status === "pending"
                              ? "Pending Review"
                              : payment.status === "approved"
                                ? "Approved"
                                : payment.status === "rejected"
                                  ? "Rejected"
                                  : payment.status || "Pending"}
                          </span>
                        </div>
                        {payment.status === "rejected" && payment.note && (
                          <div className="px-3 pb-3 pt-1">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                              <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1">
                                Note:
                              </p>
                              <p className="text-xs text-red-800">{payment.note}</p>
                            </div>
                          </div>
                        )}
                        {payment.receiptImage && (
                          <div className="px-3 pb-3 pt-1">
                            <a
                              href={payment.receiptImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              <Upload className="w-3 h-3" />
                              View Receipt
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visa Status */}
              {selectedBooking.visaStatus?.status &&
                selectedBooking.visaStatus.status !== "Not Applied" && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Visa Status
                    </h3>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">Status:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${selectedBooking.visaStatus.status === "Approved"
                              ? "bg-blue-50 text-blue-700"
                              : selectedBooking.visaStatus.status === "Rejected"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                        >
                          {selectedBooking.visaStatus.status}
                        </span>
                      </div>
                      {selectedBooking.visaStatus.applicationNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">Application No:</span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {selectedBooking.visaStatus.applicationNumber}
                          </span>
                        </div>
                      )}
                      {selectedBooking.visaStatus.approvalDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">Approval Date:</span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {new Date(selectedBooking.visaStatus.approvalDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {selectedBooking.visaStatus.notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Notes:</p>
                          <p className="text-xs text-gray-700">{selectedBooking.visaStatus.notes}</p>
                        </div>
                      )}
                      {selectedBooking.visaStatus.approvalDocument && (
                        <div className="pt-2">
                          <a
                            href={selectedBooking.visaStatus.approvalDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <FileText className="w-3 h-3" />
                            View Visa Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Hotel Status */}
              {selectedBooking.hotelStatus?.status &&
                selectedBooking.hotelStatus.status !== "Not Booked" && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Hotel Status
                    </h3>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">Status:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${selectedBooking.hotelStatus.status === "Confirmed"
                              ? "bg-purple-50 text-purple-700"
                              : selectedBooking.hotelStatus.status === "Cancelled"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                        >
                          {selectedBooking.hotelStatus.status}
                        </span>
                      </div>
                      {selectedBooking.hotelStatus.confirmationNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">Confirmation No:</span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {selectedBooking.hotelStatus.confirmationNumber}
                          </span>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.bookingDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">Booking Date:</span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {new Date(selectedBooking.hotelStatus.bookingDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Notes:</p>
                          <p className="text-xs text-gray-700">{selectedBooking.hotelStatus.notes}</p>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.confirmationDocument && (
                        <div className="pt-2">
                          <a
                            href={selectedBooking.hotelStatus.confirmationDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
                          >
                            <FileText className="w-3 h-3" />
                            View Hotel Confirmation
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Form */}
              <form onSubmit={handleSubmitPayment} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Amount * (Max:{" "}
                      {selectedBooking.metadata?.currency || "PKR"}{" "}
                      {getRemainingAmount(selectedBooking).toLocaleString()})
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={getRemainingAmount(selectedBooking)}
                      disabled={getRemainingAmount(selectedBooking) <= 0}
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, amount: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm disabled:opacity-50"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Method *
                    </label>
                    <select
                      required
                      value={paymentForm.method}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, method: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm"
                    >
                      <option value="">Select</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Online">Online</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 ml-1">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    value={paymentForm.receiptNumber}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm"
                    placeholder="TRX-123456"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 ml-1">
                    Upload Proof *
                  </label>
                  <label
                    htmlFor="receipt-upload-others"
                    className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-gray-300 group-hover:text-emerald-500 mb-2" />
                    <span className="text-sm font-medium text-gray-600 group-hover:text-emerald-700">
                      {receiptFile ? receiptFile.name : "Choose receipt file"}
                    </span>
                    <input
                      type="file"
                      required
                      accept="image/*,application/pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="receipt-upload-others"
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-4 pb-8">
                  <button
                    type="button"
                    onClick={handleClosePaymentModal}
                    className="flex-1 px-6 py-3.5 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment || getRemainingAmount(selectedBooking) <= 0}
                    className="flex-2 px-6 py-3.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                  >
                    {submittingPayment ? "Processing..." : "Confirm Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
