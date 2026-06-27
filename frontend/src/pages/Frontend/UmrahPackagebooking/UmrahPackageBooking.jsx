import React, { useState, useEffect, useMemo } from "react";
import {
  getMyBookings,
  submitPayment,
  updateUmrahBooking,
} from "../../../api/umrahBookingApi";
import {
  Search,
  RefreshCw,
  Filter,
  X,
  Plus,
  Upload,
  Check,
  Clock,
  XCircle,
  CheckCircle,
  CreditCard,
  FileCheck,
  Building,
  Edit2,
  Save,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";

export default function UmrahBooking() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [visaFilter, setVisaFilter] = useState("All");
  const [hotelFilter, setHotelFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

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

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    passengers: [],
    specialRequests: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getMyBookings();
      console.log(response);
      setBookings(response.data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenEditModal = (booking) => {
    setSelectedBooking(booking);
    setEditForm({
      passengers: JSON.parse(JSON.stringify(booking.passengers || [])),
      specialRequests: booking.specialRequests || "",
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedBooking(null);
    setEditForm({ passengers: [], specialRequests: "" });
  };

  const handlePassengerChange = (index, field, value) => {
    const updatedPassengers = [...editForm.passengers];
    updatedPassengers[index][field] = value;
    setEditForm({ ...editForm, passengers: updatedPassengers });
  };

  const handleAddPassenger = () => {
    setEditForm({
      ...editForm,
      passengers: [
        ...editForm.passengers,
        {
          type: "Adult",
          title: "Mr",
          givenName: "",
          surName: "",
          passport: "",
          dateOfBirth: "",
          passportExpiry: "",
          nationality: "Pakistan",
        },
      ],
    });
  };

  const handleRemovePassenger = (index) => {
    if (editForm.passengers.length > 1) {
      const updatedPassengers = editForm.passengers.filter(
        (_, i) => i !== index,
      );
      setEditForm({ ...editForm, passengers: updatedPassengers });
    }
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      const updateData = {
        passengers: editForm.passengers,
        specialRequests: editForm.specialRequests,
      };
      await updateUmrahBooking(selectedBooking._id, updateData);
      toast.success("Booking updated successfully!");
      handleCloseEditModal();
      fetchBookings();
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error(error.response?.data?.message || "Failed to update booking");
    } finally {
      setIsUpdating(false);
    }
  };

  const canEditBooking = (booking) => {
    return !booking.paymentStatus?.paymentHistory?.length > 0;
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!receiptFile) {
      toast.error("Please upload a receipt");
      return;
    }

    // Calculate remaining amount
    const totalAmount = selectedBooking.pricing?.totalPrice || 0;
    const paidAmount = selectedBooking.paymentStatus?.paidAmount || 0;
    const remainingAmount = totalAmount - paidAmount;
    const submittingAmount = parseFloat(paymentForm.amount);

    // Validate: Amount must not exceed remaining amount
    if (submittingAmount > remainingAmount) {
      toast.error(
        `Amount cannot exceed remaining balance of PKR ${remainingAmount.toLocaleString()}`,
      );
      return;
    }

    // Validate: Amount must be at least 1
    if (submittingAmount < 1) {
      toast.error("Amount must be at least PKR 1");
      return;
    }

    try {
      setSubmittingPayment(true);
      const formData = new FormData();
      formData.append("amount", paymentForm.amount);
      formData.append("method", paymentForm.method);
      formData.append("receiptNumber", paymentForm.receiptNumber);
      formData.append("notes", paymentForm.notes);
      formData.append("receiptFile", receiptFile);

      await submitPayment(selectedBooking._id, formData);
      toast.success(
        "Payment submitted successfully! Waiting for admin review.",
      );
      handleClosePaymentModal();
      fetchBookings();
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error(error.response?.data?.message || "Failed to submit payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Filter and Search Logic
  const filteredAndSortedBookings = useMemo(() => {
    let result = [...bookings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((booking) => {
        const passengerName = `${booking.passengers?.[0]?.givenName || ""} ${
          booking.passengers?.[0]?.surName || ""
        }`.toLowerCase();

        return (
          booking.bookingNumber?.toLowerCase().includes(term) ||
          booking.packageName?.toLowerCase().includes(term) ||
          passengerName.includes(term)
        );
      });
    }

    if (statusFilter !== "All") {
      result = result.filter((b) => b.overallStatus === statusFilter);
    }
    if (paymentFilter !== "All") {
      result = result.filter((b) => b.paymentStatus?.status === paymentFilter);
    }
    if (visaFilter !== "All") {
      result = result.filter((b) => b.visaStatus?.status === visaFilter);
    }
    if (hotelFilter !== "All") {
      result = result.filter((b) => b.hotelStatus?.status === hotelFilter);
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA, valB;

        switch (sortConfig.key) {
          case "bookingNumber":
            valA = a.bookingNumber || "";
            valB = b.bookingNumber || "";
            break;
          case "packageName":
            valA = a.packageName || "";
            valB = b.packageName || "";
            break;
          case "totalPrice":
            valA = a.pricing?.totalPrice || 0;
            valB = b.pricing?.totalPrice || 0;
            break;
          case "overallStatus":
            valA = a.overallStatus || "";
            valB = b.overallStatus || "";
            break;
          default:
            return 0;
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    bookings,
    searchTerm,
    statusFilter,
    paymentFilter,
    visaFilter,
    hotelFilter,
    sortConfig,
  ]);

  const handleSort = (key) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSortConfig({ key, direction: "asc" });
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPaymentFilter("All");
    setVisaFilter("All");
    setHotelFilter("All");
    setSortConfig({ key: null, direction: "asc" });
  };

  const statusOptions = [
    "All",
    ...new Set(bookings.map((b) => b.overallStatus).filter(Boolean)),
  ];
  const paymentOptions = [
    "All",
    ...new Set(bookings.map((b) => b.paymentStatus?.status).filter(Boolean)),
  ];
  const visaOptions = [
    "All",
    ...new Set(bookings.map((b) => b.visaStatus?.status).filter(Boolean)),
  ];
  const hotelOptions = [
    "All",
    ...new Set(bookings.map((b) => b.hotelStatus?.status).filter(Boolean)),
  ];

  const totalBookings = bookings.length;
  const totalSpent = bookings.reduce(
    (sum, b) => sum + (b.pricing?.totalPrice || 0),
    0,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">
            Loading your Umrah bookings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 font-sans">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              My Umrah Bookings
            </h1>
            <p className="text-gray-500 mt-1">
              Manage and track all your Umrah journeys
            </p>
          </div>
          <button
            onClick={fetchBookings}
            className="mt-4 md:mt-0 flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm font-medium text-gray-700"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Total Bookings</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalBookings}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Total Spent</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">
              PKR {totalSpent.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Active Bookings</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">
              {
                bookings.filter(
                  (b) =>
                    b.overallStatus === "Confirmed" ||
                    b.overallStatus === "Pending",
                ).length
              }
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Search */}
            <div className="flex-1 relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by Booking ID, Package or Passenger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full lg:w-auto">
              {[
                {
                  label: "Booking Status",
                  val: statusFilter,
                  set: setStatusFilter,
                  opts: statusOptions,
                },
                {
                  label: "Payment Status",
                  val: paymentFilter,
                  set: setPaymentFilter,
                  opts: paymentOptions,
                },
                {
                  label: "Visa Status",
                  val: visaFilter,
                  set: setVisaFilter,
                  opts: visaOptions,
                },
                {
                  label: "Hotel Status",
                  val: hotelFilter,
                  set: setHotelFilter,
                  opts: hotelOptions,
                },
              ].map((filter, idx) => (
                <div key={idx} className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-600 ml-1 mb-1">
                    {filter.label}
                  </label>
                  <select
                    value={filter.val}
                    onChange={(e) => filter.set(e.target.value)}
                    className="h-12 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-sm font-medium text-gray-700"
                  >
                    {filter.opts.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Clear Button */}
              <button
                onClick={resetFilters}
                className="h-12 mt-5.5 px-4 text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-100 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-red-50"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* HEADER */}
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr className="whitespace-nowrap">
                  <th
                    onClick={() => handleSort("bookingNumber")}
                    className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-emerald-600"
                  >
                    Booking ID{" "}
                    {sortConfig.key === "bookingNumber" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>

                  <th
                    onClick={() => handleSort("packageName")}
                    className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-emerald-600"
                  >
                    Package{" "}
                    {sortConfig.key === "packageName" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Passenger
                  </th>

                  <th
                    onClick={() => handleSort("totalPrice")}
                    className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-emerald-600"
                  >
                    Price{" "}
                    {sortConfig.key === "totalPrice" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Booking
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Visa
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Hotel
                  </th>

                  <th className="px-4 py-3 text-center font-semibold text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>

              {/* BODY */}
              <tbody className="divide-y divide-gray-50">
                {filteredAndSortedBookings.length > 0 ? (
                  filteredAndSortedBookings.map((booking) => (
                    <tr
                      key={booking._id}
                      onClick={() => handleOpenDetailsModal(booking)}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-gray-900 whitespace-nowrap">
                        {booking.bookingNumber}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate max-w-35">
                            {booking.packageName}
                          </span>
                          {booking.packageSource === "zip-accounts" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                              ZIP
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {booking.passengers?.[0]?.givenName}{" "}
                          {booking.passengers?.[0]?.surName}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {booking.passengerCount?.total}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        {booking.pricing?.currency}{" "}
                        {booking.pricing?.totalPrice?.toLocaleString()}
                      </td>

                      {/* Booking Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                          {booking.overallStatus}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              booking.paymentStatus?.status === "Paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : booking.paymentStatus?.status === "Pending" &&
                                    booking.paymentStatus?.paymentHistory
                                      ?.length > 0
                                  ? "bg-blue-50 text-blue-700"
                                  : booking.paymentStatus?.status === "Pending"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-red-50 text-red-700"
                            }`}
                          >
                            {booking.paymentStatus?.status === "Pending" &&
                            booking.paymentStatus?.paymentHistory?.length > 0
                              ? "Review"
                              : booking.paymentStatus?.status || "N/A"}
                          </span>
                          {booking.paymentStatus?.paymentHistory?.some(
                            (p) => p.paymentStatus === "Rejected",
                          ) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                              {
                                booking.paymentStatus.paymentHistory.filter(
                                  (p) => p.paymentStatus === "Rejected",
                                ).length
                              }{" "}
                              Rejected
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Visa */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            booking.visaStatus?.status === "Approved"
                              ? "bg-blue-50 text-blue-700"
                              : booking.visaStatus?.status === "Pending"
                                ? "bg-amber-50 text-amber-700"
                                : booking.visaStatus?.status === "Rejected"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {booking.visaStatus?.status || "N/A"}
                        </span>
                      </td>

                      {/* Hotel */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            booking.hotelStatus?.status === "Confirmed"
                              ? "bg-purple-50 text-purple-700"
                              : booking.hotelStatus?.status === "Pending"
                                ? "bg-amber-50 text-amber-700"
                                : booking.hotelStatus?.status === "Cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {booking.hotelStatus?.status || "N/A"}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {canEditBooking(booking) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(booking);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-medium whitespace-nowrap"
                              title="Edit booking"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                          ) : (
                            <button
                              disabled
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-md text-xs font-medium whitespace-nowrap cursor-not-allowed"
                              title="Cannot edit after payment submission"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                          )}
                          {booking.paymentStatus?.status === "Paid" ? (
                            <button
                              disabled
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium whitespace-nowrap"
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
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs font-medium whitespace-nowrap"
                            >
                              <Plus className="w-3 h-3" />
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-16 text-center">
                      <Filter className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-900">
                        No bookings
                      </p>
                      <p className="text-xs text-gray-500">Adjust filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FIXED MODAL UI */}
      {showPaymentModal && selectedBooking && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Subtle blurred overlay */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={handleClosePaymentModal}
          ></div>

          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header - Clean & Modern */}
            <div className="px-8 pt-8 pb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Submit Payment
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Ref:{" "}
                  <span className="font-mono font-medium text-emerald-600">
                    {selectedBooking.bookingNumber}
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
              {/* Amount Display */}
              <div className="bg-emerald-50 rounded-2xl p-6 mb-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
                      Package Total
                    </p>
                    <p className="text-2xl font-black text-emerald-900">
                      PKR{" "}
                      {selectedBooking.pricing?.totalPrice?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
                      Remaining
                    </p>
                    <p className="text-2xl font-black text-amber-900">
                      PKR{" "}
                      {(
                        (selectedBooking.pricing?.totalPrice || 0) -
                        (selectedBooking.paymentStatus?.paidAmount || 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment History - Compact */}
              {selectedBooking.paymentStatus?.paymentHistory?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Previous History
                  </h3>
                  <div className="space-y-2">
                    {selectedBooking.paymentStatus.paymentHistory.map(
                      (payment, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-3">
                            <div className="text-sm flex-1">
                              <p className="font-bold text-gray-800">
                                PKR {payment.amount?.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {new Date(
                                  payment.paymentDate,
                                ).toLocaleDateString()}{" "}
                                • {payment.method}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                                payment.paymentStatus === "Approved" ||
                                payment.paymentStatus === "Received"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : payment.paymentStatus === "Pending"
                                    ? "bg-blue-100 text-blue-700"
                                    : payment.paymentStatus === "Rejected"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {payment.paymentStatus === "Pending"
                                ? "Pending Review"
                                : payment.paymentStatus === "Received"
                                  ? "Approved"
                                  : payment.paymentStatus || "Pending"}
                            </span>
                          </div>
                          {payment.paymentStatus === "Rejected" &&
                            payment.rejectionReason && (
                              <div className="px-3 pb-3 pt-1">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                  <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1">
                                    Rejection Reason:
                                  </p>
                                  <p className="text-xs text-red-800">
                                    {payment.rejectionReason}
                                  </p>
                                </div>
                              </div>
                            )}
                          {(payment.paymentStatus === "Approved" ||
                            payment.paymentStatus === "Received") &&
                            payment.approvalProofFile && (
                              <div className="px-3 pb-3 pt-1">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                                    Approval Proof:
                                  </p>
                                  <a
                                    href={payment.approvalProofFile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                    View Proof Document
                                  </a>
                                </div>
                              </div>
                            )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Visa Status Details */}
              {selectedBooking.visaStatus?.status &&
                selectedBooking.visaStatus.status !== "Not Applied" && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Visa Status
                    </h3>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">
                          Status:
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            selectedBooking.visaStatus.status === "Approved"
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
                          <span className="text-xs text-gray-600 font-medium">
                            Application No:
                          </span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {selectedBooking.visaStatus.applicationNumber}
                          </span>
                        </div>
                      )}
                      {selectedBooking.visaStatus.approvalDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">
                            Approval Date:
                          </span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {new Date(
                              selectedBooking.visaStatus.approvalDate,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {selectedBooking.visaStatus.notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                            Notes:
                          </p>
                          <p className="text-xs text-gray-700">
                            {selectedBooking.visaStatus.notes}
                          </p>
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
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            View Visa Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Hotel Status Details */}
              {selectedBooking.hotelStatus?.status &&
                selectedBooking.hotelStatus.status !== "Not Booked" && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Hotel Status
                    </h3>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">
                          Status:
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            selectedBooking.hotelStatus.status === "Confirmed"
                              ? "bg-purple-50 text-purple-700"
                              : selectedBooking.hotelStatus.status ===
                                  "Cancelled"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {selectedBooking.hotelStatus.status}
                        </span>
                      </div>
                      {selectedBooking.hotelStatus.confirmationNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">
                            Confirmation No:
                          </span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {selectedBooking.hotelStatus.confirmationNumber}
                          </span>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.bookingDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">
                            Booking Date:
                          </span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {new Date(
                              selectedBooking.hotelStatus.bookingDate,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                            Notes:
                          </p>
                          <p className="text-xs text-gray-700">
                            {selectedBooking.hotelStatus.notes}
                          </p>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.confirmationDocument && (
                        <div className="pt-2">
                          <a
                            href={
                              selectedBooking.hotelStatus.confirmationDocument
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                            </svg>
                            View Hotel Confirmation
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Form Controls */}
              <form onSubmit={handleSubmitPayment} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Amount * (Max: PKR{" "}
                      {(
                        (selectedBooking.pricing?.totalPrice || 0) -
                        (selectedBooking.paymentStatus?.paidAmount || 0)
                      ).toLocaleString()}
                      )
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={
                        (selectedBooking.pricing?.totalPrice || 0) -
                        (selectedBooking.paymentStatus?.paidAmount || 0)
                      }
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          amount: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm"
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
                        setPaymentForm({
                          ...paymentForm,
                          method: e.target.value,
                        })
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
                      setPaymentForm({
                        ...paymentForm,
                        receiptNumber: e.target.value,
                      })
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
                    htmlFor="receipt-upload"
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
                      onChange={(e) =>
                        setReceiptFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                      id="receipt-upload"
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
                    disabled={submittingPayment}
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

      {/* BOOKING DETAILS MODAL */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={handleCloseDetailsModal}
          ></div>

          <div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-start justify-between bg-linear-to-r from-emerald-50 to-blue-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Booking Details
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {selectedBooking.bookingNumber}
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
              {/* Package Info */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Package Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Package
                    </p>
                    <p className="font-semibold text-gray-900">
                      {selectedBooking.packageName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Total Price
                    </p>
                    <p className="font-bold text-emerald-600 text-lg">
                      PKR{" "}
                      {selectedBooking.pricing?.totalPrice?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Passengers
                    </p>
                    <p className="font-semibold text-gray-900">
                      {selectedBooking.passengerCount?.total ||
                        selectedBooking.passengers?.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Booking Status
                    </p>
                    <span className="inline-block px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                      {selectedBooking.overallStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Passengers List */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Passenger Details
                </h3>
                <div className="space-y-3">
                  {selectedBooking.passengers?.map((passenger, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-base">
                            {passenger.title} {passenger.givenName}{" "}
                            {passenger.surName}
                          </h4>
                          <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mt-1">
                            {passenger.type}
                          </span>
                        </div>
                        {passenger.documentUrl && (
                          <a
                            href={passenger.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-xs font-semibold transition-all"
                          >
                            <FileCheck className="w-3 h-3" />
                            View Passport
                          </a>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase mb-1">
                            Passport
                          </p>
                          <p className="font-semibold text-gray-900">
                            {passenger.passport}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase mb-1">
                            Nationality
                          </p>
                          <p className="font-semibold text-gray-900">
                            {passenger.nationality}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase mb-1">
                            Date of Birth
                          </p>
                          <p className="font-semibold text-gray-900">
                            {new Date(
                              passenger.dateOfBirth,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase mb-1">
                            Passport Expiry
                          </p>
                          <p className="font-semibold text-gray-900">
                            {new Date(
                              passenger.passportExpiry,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Status & History */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Payment Status
                </h3>
                <div className="space-y-3">
                  {selectedBooking.paymentStatus?.paymentHistory?.length > 0 ? (
                    selectedBooking.paymentStatus.paymentHistory.map(
                      (payment, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-4 bg-gray-50">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 text-lg">
                                PKR {payment.amount?.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(
                                  payment.paymentDate,
                                ).toLocaleDateString()}{" "}
                                • {payment.method}
                                {payment.receiptNumber &&
                                  ` • ${payment.receiptNumber}`}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                payment.paymentStatus === "Approved" ||
                                payment.paymentStatus === "Received"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : payment.paymentStatus === "Pending"
                                    ? "bg-blue-100 text-blue-700"
                                    : payment.paymentStatus === "Rejected"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {payment.paymentStatus === "Pending"
                                ? "Pending Review"
                                : payment.paymentStatus === "Received"
                                  ? "Approved"
                                  : payment.paymentStatus || "Pending"}
                            </span>
                          </div>
                          {payment.paymentStatus === "Rejected" &&
                            payment.rejectionReason && (
                              <div className="px-4 py-3 bg-red-50 border-t border-red-200">
                                <p className="text-xs font-semibold text-red-700 uppercase mb-1">
                                  Rejection Reason:
                                </p>
                                <p className="text-sm text-red-800">
                                  {payment.rejectionReason}
                                </p>
                              </div>
                            )}
                          {(payment.paymentStatus === "Approved" ||
                            payment.paymentStatus === "Received") &&
                            payment.approvalProofFile && (
                              <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-200">
                                <a
                                  href={payment.approvalProofFile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  View Approval Proof
                                </a>
                              </div>
                            )}
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      No payment submitted yet
                    </p>
                  )}
                </div>
              </div>

              {/* Visa Status */}
              {selectedBooking.visaStatus?.status &&
                selectedBooking.visaStatus.status !== "Not Applied" && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-blue-600" />
                      Visa Status
                    </h3>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Status:
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
                            selectedBooking.visaStatus.status === "Approved"
                              ? "bg-blue-600 text-white"
                              : selectedBooking.visaStatus.status === "Rejected"
                                ? "bg-red-600 text-white"
                                : "bg-amber-600 text-white"
                          }`}
                        >
                          {selectedBooking.visaStatus.status}
                        </span>
                      </div>
                      {selectedBooking.visaStatus.applicationNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Application Number:
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {selectedBooking.visaStatus.applicationNumber}
                          </span>
                        </div>
                      )}
                      {selectedBooking.visaStatus.approvalDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Approval Date:
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {new Date(
                              selectedBooking.visaStatus.approvalDate,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {selectedBooking.visaStatus.notes && (
                        <div className="pt-3 border-t border-blue-300">
                          <p className="text-xs font-semibold text-blue-900 uppercase mb-1">
                            Notes:
                          </p>
                          <p className="text-sm text-gray-800">
                            {selectedBooking.visaStatus.notes}
                          </p>
                        </div>
                      )}
                      {selectedBooking.visaStatus.approvalDocument && (
                        <a
                          href={selectedBooking.visaStatus.approvalDocument}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 font-medium pt-2"
                        >
                          <FileCheck className="w-4 h-4" />
                          View Visa Document
                        </a>
                      )}
                    </div>
                  </div>
                )}

              {/* Hotel Status */}
              {selectedBooking.hotelStatus?.status &&
                selectedBooking.hotelStatus.status !== "Not Booked" && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Building className="w-5 h-5 text-purple-600" />
                      Hotel Status
                    </h3>
                    <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Status:
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
                            selectedBooking.hotelStatus.status === "Confirmed"
                              ? "bg-purple-600 text-white"
                              : selectedBooking.hotelStatus.status ===
                                  "Cancelled"
                                ? "bg-red-600 text-white"
                                : "bg-amber-600 text-white"
                          }`}
                        >
                          {selectedBooking.hotelStatus.status}
                        </span>
                      </div>
                      {selectedBooking.hotelStatus.confirmationNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Confirmation Number:
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {selectedBooking.hotelStatus.confirmationNumber}
                          </span>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.bookingDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Booking Date:
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {new Date(
                              selectedBooking.hotelStatus.bookingDate,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.notes && (
                        <div className="pt-3 border-t border-purple-300">
                          <p className="text-xs font-semibold text-purple-900 uppercase mb-1">
                            Notes:
                          </p>
                          <p className="text-sm text-gray-800">
                            {selectedBooking.hotelStatus.notes}
                          </p>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.confirmationDocument && (
                        <a
                          href={
                            selectedBooking.hotelStatus.confirmationDocument
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-purple-700 hover:text-purple-900 font-medium pt-2"
                        >
                          <Building className="w-4 h-4" />
                          View Hotel Confirmation
                        </a>
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
              {selectedBooking.paymentStatus?.status !== "Paid" && (
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT BOOKING MODAL */}
      {showEditModal && selectedBooking && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={handleCloseEditModal}
          ></div>

          <div className="relative bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-start justify-between bg-linear-to-r from-blue-50 to-emerald-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Booking
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {selectedBooking.bookingNumber}
                </p>
                <p className="text-amber-600 text-xs font-semibold mt-2">
                  ⚠️ You can only edit before submitting any payment
                </p>
              </div>
              <button
                onClick={handleCloseEditModal}
                className="p-2 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleUpdateBooking}
              className="flex-1 overflow-y-auto px-8 py-6"
            >
              {/* Passengers Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    Passengers ({editForm.passengers.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddPassenger}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Add Passenger
                  </button>
                </div>

                <div className="space-y-4">
                  {editForm.passengers.map((passenger, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">
                          Passenger {index + 1}
                        </h4>
                        {editForm.passengers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePassenger(index)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 ml-1 mb-1 block">
                            Type *
                          </label>
                          <select
                            required
                            value={passenger.type}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "type",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                          >
                            <option value="Adult">Adult</option>
                            <option value="Child">Child</option>
                            <option value="Infant">Infant</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600 ml-1 mb-1 block">
                            Title *
                          </label>
                          <select
                            required
                            value={passenger.title}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "title",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                          >
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                            <option value="Miss">Miss</option>
                            <option value="Dr">Dr</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600 ml-1 mb-1 block">
                            Given Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={passenger.givenName}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "givenName",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            placeholder="First name"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600 ml-1 mb-1 block">
                            Surname *
                          </label>
                          <input
                            type="text"
                            required
                            value={passenger.surName}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "surName",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            placeholder="Last name"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600 ml-1 mb-1 block">
                            Passport Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={passenger.passport}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "passport",
                                e.target.value.toUpperCase(),
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            placeholder="AA1234567"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600 ml-1 mb-1 block">
                            Date of Birth *
                          </label>
                          <input
                            type="date"
                            required
                            value={
                              passenger.dateOfBirth?.split("T")[0] ||
                              passenger.dateOfBirth
                            }
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "dateOfBirth",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600 ml-1 mb-1 block">
                            Nationality *
                          </label>
                          <input
                            type="text"
                            required
                            value={passenger.nationality}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "nationality",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            placeholder="Pakistan"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600 ml-1 mb-1 block">
                            Passport Expiry *
                          </label>
                          <input
                            type="date"
                            required
                            value={
                              passenger.passportExpiry?.split("T")[0] ||
                              passenger.passportExpiry
                            }
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "passportExpiry",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      {passenger.documentUrl && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-600">
                            Passport Document:
                          </span>
                          <a
                            href={passenger.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <FileCheck className="w-3 h-3" />
                            View Document
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Requests */}
              <div className="mb-6">
                <label className="text-sm font-bold text-gray-900 mb-2 block">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={editForm.specialRequests}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      specialRequests: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  placeholder="Any special requests or notes..."
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 px-6 py-3 text-gray-600 font-semibold text-sm hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
