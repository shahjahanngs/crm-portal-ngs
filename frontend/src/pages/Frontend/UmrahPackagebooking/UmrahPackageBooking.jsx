import React, { useState, useEffect, useMemo } from "react";
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
  Scan,
  UserPlus,
  Trash2,
  Package,
} from "lucide-react";
import { toast } from "react-toastify";
import TopBar from "../../../components/TopBar/TopBar";
import axiosInstance from "../../../api/axios";
import { printGDSBooking } from "../../../utils/bookingPDFService";
import { parseMRZ } from "../../../utils/parseMRZ";

const ROOM_CAPACITY = {
  sharing: 1,
  double: 2,
  triple: 3,
  quad: 4,
  quint: 5,
  hexa: 6,
};

const ROOM_ORDER = ["sharing", "quint", "quad", "triple", "double", "hexa"];

const normalizeSeatId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const buildRemainingSeatsMap = (items = []) => {
  const map = {};

  items.forEach((item) => {
    const ids = [
      item.groupTicketingId,
      item.groupId,
      item.ticketingGroupId,
      item._id,
      item.id,
    ]
      .map(normalizeSeatId)
      .filter(Boolean);
    const remainingSeats =
      item.remainingSeats ??
      item.availableSeats ??
      item.available_no_of_pax ??
      item.seatsLeft;

    if (remainingSeats !== null && remainingSeats !== undefined) {
      ids.forEach((id) => {
        map[id] = Number(remainingSeats);
      });
    }
  });

  return map;
};

const normalizeRoomType = (roomType) => (roomType || "").toLowerCase().trim();

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
    roomType: "",
    pricePerPerson: 0,
    totalPrice: 0,
    specialRequests: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [passportFiles, setPassportFiles] = useState({});
  const [editRemainingSeats, setEditRemainingSeats] = useState(null);
  const [mrzModal, setMrzModal] = useState({ open: false, index: null });
  const [mrzInput, setMrzInput] = useState("");
  const [mrzError, setMrzError] = useState("");
  const [timers, setTimers] = useState({});
  const [printingVoucherId, setPrintingVoucherId] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/zip-accounts/get-booking");
      const storedUser = localStorage.getItem("frontend_user");
      const currentUserId = storedUser
        ? JSON.parse(storedUser)?.zipId || JSON.parse(storedUser)?.id
        : null;
      const allBookings = response.data.data.bookings || [];
      console.log(storedUser, response.data.data);

      const filtered = currentUserId
        ? allBookings.filter((b) => b.created_by === currentUserId)
        : allBookings;
      setBookings(filtered);
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

  const getBookingNumber = (booking) =>
    booking?.refNo ||
    booking?.bookingId ||
    booking?.metadata?.bookingNumber ||
    booking?.metadata?.localBookingId ||
    "";

  const handlePrintVoucher = async (booking) => {
    const bookingNumber = getBookingNumber(booking);
    if (!bookingNumber) {
      toast.error("Booking number not found");
      return;
    }

    const voucherWindow = window.open("", "_blank");
    if (!voucherWindow) {
      toast.error("Please allow pop-ups to view the voucher");
      return;
    }
    voucherWindow.opener = null;

    try {
      setPrintingVoucherId(booking._id);
      const response = await axiosInstance.get(
        `/zip-accounts/voucher/${encodeURIComponent(bookingNumber)}`,
      );
      const payload = response.data?.data || response.data || {};
      const publicToken = payload.publicToken || payload.voucher?.public_token;
      const sharePath =
        payload.sharePath ||
        (publicToken ? `/app4/share/umrah-voucher/${publicToken}` : "");

      if (!sharePath) {
        voucherWindow.close();
        toast.info("Your voucher is not generated till now");
        return;
      }

      const voucherUrl = sharePath.startsWith("http")
        ? sharePath
        : `${window.location.origin}${sharePath}`;
      voucherWindow.location.href = voucherUrl;
    } catch (error) {
      voucherWindow.close();
      const status = error.response?.status;
      if (status === 404) {
        toast.info("Your voucher is not generated till now");
        return;
      }
      toast.error(error.response?.data?.message || "Failed to open voucher");
    } finally {
      setPrintingVoucherId(null);
    }
  };

  const normalizePassengerForEdit = (passenger = {}) => {
    const nameParts = (passenger.name || "").trim().split(/\s+/);
    const fallbackGivenName = nameParts[0] || "";
    const fallbackSurName = nameParts.slice(1).join(" ");

    return {
      ...passenger,
      type: passenger.type || "Adult",
      title: passenger.title || "Mr",
      givenName: passenger.givenName || fallbackGivenName,
      surName: passenger.surName || fallbackSurName,
      passport: passenger.passport || passenger.passportNumber || "",
      dateOfBirth: passenger.dateOfBirth || passenger.dob || "",
      passportExpiry: passenger.passportExpiry || "",
      nationality: passenger.nationality || "Pakistan",
    };
  };

  const getOriginalPackage = (booking = selectedBooking) =>
    booking?.metadata?.originalPkg || booking?.originalPkg || {};

  const getPackageRooms = (booking = selectedBooking) =>
    getOriginalPackage(booking)?.rooms || {};

  const getRoomPrice = (roomType, booking = selectedBooking) => {
    const normalizedRoom = normalizeRoomType(roomType);
    const price = Number(getPackageRooms(booking)?.[normalizedRoom]);
    if (Number.isFinite(price) && price > 0) return price;

    if (normalizedRoom === normalizeRoomType(booking?.metadata?.roomType)) {
      const fallbackPrice = Number(booking?.metadata?.pricePerPerson);
      if (Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
        return fallbackPrice;
      }
    }

    return 0;
  };

  const getChildPrice = (booking = selectedBooking) => {
    const pkg = getOriginalPackage(booking);
    return Number(
      pkg?.rooms?.childWithoutPackage ??
      pkg?.childPrice ??
      booking?.metadata?.childPrice ??
      0,
    );
  };

  const getInfantPrice = (booking = selectedBooking) => {
    const pkg = getOriginalPackage(booking);
    return Number(
      pkg?.rooms?.InfantWithoutPackage ??
      pkg?.rooms?.infantWithoutPackage ??
      pkg?.infantPrice ??
      booking?.metadata?.infantPrice ??
      0,
    );
  };

  const getPassengerSeatCount = (passengers = []) =>
    passengers.filter((p) => p.type !== "Infant").length;

  const getAdultLimit = (roomType, booking = selectedBooking) => {
    const normalizedRoom = normalizeRoomType(roomType);
    const effectiveSeatLimit = getEffectiveSeatLimit(booking);
    const roomCapacity = ROOM_CAPACITY[normalizedRoom];

    // Sharing rooms: each adult occupies one sharing room — limit by seat availability only
    if (normalizedRoom === "sharing") return effectiveSeatLimit;
    if (!roomCapacity) return effectiveSeatLimit;
    if (effectiveSeatLimit === null) return roomCapacity;
    return Math.min(roomCapacity, effectiveSeatLimit);
  };

  const getRequiredAdultCount = (roomType) => {
    const normalizedRoom = normalizeRoomType(roomType);
    if (normalizedRoom === "sharing") return null;
    return ROOM_CAPACITY[normalizedRoom] || null;
  };

  const getAvailableSeatsFromPackage = (booking = selectedBooking) => {
    const pkg = getOriginalPackage(booking);
    const value =
      editRemainingSeats ??
      pkg?.remainingSeats ??
      pkg?.availableRooms ??
      pkg?.availableSeats ??
      booking?.metadata?.availableSeats;
    const seats = Number(value);
    return Number.isFinite(seats) ? seats : null;
  };

  const getOriginalSeatCount = (booking = selectedBooking) =>
    getPassengerSeatCount(
      booking?.metadata?.passengers || booking?.passengers || [],
    );

  const getEffectiveSeatLimit = (booking = selectedBooking) => {
    const availableSeats = getAvailableSeatsFromPackage(booking);
    if (availableSeats === null) return null;
    return Math.max(0, availableSeats + getOriginalSeatCount(booking));
  };

  const getPayingPassengerLimit = (booking = selectedBooking) =>
    getEffectiveSeatLimit(booking);

  const getEditableRoomOptions = (booking = selectedBooking) => {
    const rooms = getPackageRooms(booking);
    const currentRoom = normalizeRoomType(booking?.metadata?.roomType);
    const effectiveSeatLimit = getEffectiveSeatLimit(booking);

    const options = ROOM_ORDER.filter((room) => {
      const price = Number(rooms?.[room]);
      const hasPrice = Number.isFinite(price) && price > 0;
      const isCurrentRoom = room === currentRoom;
      if (!hasPrice && !isCurrentRoom) return false;
      if (room === "sharing") return true;
      if (effectiveSeatLimit === null) return true;
      return effectiveSeatLimit >= (ROOM_CAPACITY[room] || 1) || isCurrentRoom;
    });

    if (currentRoom && !options.includes(currentRoom)) {
      options.unshift(currentRoom);
    }

    return options;
  };

  const calculateEditTotal = (
    passengers = editForm.passengers,
    roomType = editForm.roomType,
    booking = selectedBooking,
  ) => {
    const roomPrice = getRoomPrice(roomType, booking);
    return passengers.reduce((sum, passenger) => {
      if (passenger.type === "Infant") return sum + getInfantPrice(booking);
      if (passenger.type === "Child") return sum + getChildPrice(booking);
      return sum + roomPrice;
    }, 0);
  };

  const getEditPassengerCounts = (passengers = editForm.passengers) =>
    passengers.reduce(
      (acc, passenger) => {
        if (passenger.type === "Infant") acc.infants += 1;
        else if (passenger.type === "Child") acc.children += 1;
        else acc.adults += 1;
        return acc;
      },
      { adults: 0, children: 0, infants: 0 },
    );

  const formatMrzDate = (date) =>
    date instanceof Date && !Number.isNaN(date.getTime())
      ? date.toISOString().split("T")[0]
      : "";

  const handleOpenMrzModal = (index) => {
    setMrzModal({ open: true, index });
    setMrzInput("");
    setMrzError("");
  };

  const handleCloseMrzModal = () => {
    setMrzModal({ open: false, index: null });
    setMrzInput("");
    setMrzError("");
  };

  const handleMrzParse = () => {
    const rawBlocks = mrzInput.trim().split(/\n[ \t]*\n/);
    let results = [];

    if (rawBlocks.length > 1) {
      results = rawBlocks
        .map((block) => parseMRZ(block.trim()))
        .filter(Boolean);
    } else {
      const lines = mrzInput
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      for (let i = 0; i + 1 < lines.length; i += 2) {
        const parsed = parseMRZ(`${lines[i]}\n${lines[i + 1]}`);
        if (parsed) results.push(parsed);
      }
    }

    if (!results.length) {
      setMrzError(
        "Invalid MRZ code. Please paste the complete 2-line MRZ from the passport.",
      );
      return;
    }

    const startIndex = mrzModal.index ?? 0;
    let appliedCount = 0;
    const updatedPassengers = editForm.passengers.map((passenger, index) => {
      const result = results[index - startIndex];
      if (index < startIndex || !result) return passenger;

      appliedCount += 1;
      return {
        ...passenger,
        title: result.title || passenger.title,
        givenName: result.givenName || passenger.givenName,
        surName: result.surName || passenger.surName,
        passport: result.passport || passenger.passport,
        nationality: result.nationality || passenger.nationality,
        dateOfBirth: formatMrzDate(result.dateOfBirth) || passenger.dateOfBirth,
        passportExpiry:
          formatMrzDate(result.passportExpiry) || passenger.passportExpiry,
      };
    });

    setEditForm({
      ...editForm,
      passengers: updatedPassengers,
      totalPrice: calculateEditTotal(updatedPassengers, editForm.roomType),
    });
    toast.success(`${appliedCount} passport${appliedCount > 1 ? "s" : ""} scanned`);
    handleCloseMrzModal();
  };

  const getEditLimitError = (
    passengers = editForm.passengers,
    roomType = editForm.roomType,
    { requireMinimumAdults = false, ignoreAdultMaximum = false } = {},
  ) => {
    const counts = getEditPassengerCounts(passengers);
    const payingPassengers = counts.adults + counts.children;
    const adultLimit = getAdultLimit(roomType);
    const requiredAdults = getRequiredAdultCount(roomType);
    const payingLimit = getPayingPassengerLimit();

    if (
      !ignoreAdultMaximum &&
      adultLimit !== null &&
      counts.adults > adultLimit
    ) {
      return `${roomType} room allows only ${adultLimit} adult${adultLimit > 1 ? "s" : ""}.`;
    }

    if (
      requireMinimumAdults &&
      requiredAdults !== null &&
      counts.adults < requiredAdults
    ) {
      return `${roomType} room requires ${requiredAdults} adult${requiredAdults > 1 ? "s" : ""}.`;
    }

    if (payingLimit !== null && payingPassengers > payingLimit) {
      return `Only ${payingLimit} adult/child passenger${payingLimit > 1 ? "s" : ""} can be booked within package availability.`;
    }

    return "";
  };

  const canRemovePassenger = (
    passenger,
    passengers = editForm.passengers,
    roomType = editForm.roomType,
  ) => {
    if (passengers.length <= 1) return false;
    if (passenger.type !== "Adult") return true;

    const requiredAdults = getRequiredAdultCount(roomType);
    if (requiredAdults === null) return true;

    const adultCount = getEditPassengerCounts(passengers).adults;
    return adultCount > requiredAdults;
  };

  const fetchRemainingSeatsForEdit = async (booking) => {
    const pkg = getOriginalPackage(booking);
    const packageIds = [
      booking?.metadata?.packageId,
      booking?.bookingAgainst,
      pkg?._id,
      pkg?.id,
      pkg?.zipPackageId,
    ]
      .map(normalizeSeatId)
      .filter(Boolean);
    const groupTicketingIds = [
      pkg?.groupTicketingId,
      booking?.metadata?.groupTicketingId,
      booking?.groupTicketingId,
    ]
      .map(normalizeSeatId)
      .filter(Boolean);

    if (!packageIds.length && !groupTicketingIds.length) return;

    try {
      const [groupTicketingRes, packageSeatsRes] = await Promise.all([
        axiosInstance
          .get("/zip-accounts/group-ticketing")
          .catch(() => ({ data: { data: [] } })),
        axiosInstance
          .get("/zip-accounts/umrahPackages/remaining-seats")
          .catch(() => ({ data: { data: [] } })),
      ]);
      const groupSeatsMap = buildRemainingSeatsMap(
        groupTicketingRes.data?.data || [],
      );
      const packageSeatsMap = buildRemainingSeatsMap(
        packageSeatsRes.data?.data || [],
      );
      const matchedGroupSeats = groupTicketingIds
        .map((id) => groupSeatsMap[id])
        .find((value) => Number.isFinite(Number(value)));
      const matchedPackageSeats = [...packageIds, ...groupTicketingIds]
        .map((id) => packageSeatsMap[id])
        .find((value) => Number.isFinite(Number(value)));
      const seats = matchedGroupSeats ?? matchedPackageSeats;

      if (seats !== undefined) {
        setEditRemainingSeats(Number(seats));
      }
    } catch (error) {
      console.error("Error fetching remaining group ticket seats:", error);
    }
  };

  const handleOpenEditModal = (booking) => {
    const passengers = JSON.parse(
      JSON.stringify(booking.metadata?.passengers || booking.passengers || []),
    ).map(normalizePassengerForEdit);
    const roomType = normalizeRoomType(booking.metadata?.roomType) || "sharing";
    const pricePerPerson = getRoomPrice(roomType, booking);

    setSelectedBooking(booking);
    setEditForm({
      passengers,
      roomType,
      pricePerPerson,
      totalPrice:
        calculateEditTotal(passengers, roomType, booking) ||
        booking.metadata?.totalPrice ||
        0,
      specialRequests:
        booking.metadata?.specialRequests || booking.specialRequests || "",
    });
    setEditRemainingSeats(null);
    setShowEditModal(true);
    fetchRemainingSeatsForEdit(booking);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedBooking(null);
    setEditForm({
      passengers: [],
      roomType: "",
      pricePerPerson: 0,
      totalPrice: 0,
      specialRequests: "",
    });
    setPassportFiles({});
    setEditRemainingSeats(null);
    handleCloseMrzModal();
  };

  const handlePassengerChange = (index, field, value) => {
    const updatedPassengers = [...editForm.passengers];
    updatedPassengers[index][field] = value;

    if (field === "type" && value !== "Infant") {
      const limitError = getEditLimitError(updatedPassengers, editForm.roomType);
      if (limitError) {
        toast.warning(limitError);
        return;
      }
    }

    setEditForm({
      ...editForm,
      passengers: updatedPassengers,
      totalPrice: calculateEditTotal(updatedPassengers, editForm.roomType),
    });
  };

  const handleEditRoomTypeChange = (roomType) => {
    const normalizedRoom = normalizeRoomType(roomType);
    const limitError = getEditLimitError(editForm.passengers, normalizedRoom, {
      ignoreAdultMaximum: true,
    });
    if (limitError) {
      toast.warning(limitError);
      return;
    }

    setEditForm({
      ...editForm,
      roomType: normalizedRoom,
      pricePerPerson: getRoomPrice(normalizedRoom),
      totalPrice: calculateEditTotal(editForm.passengers, normalizedRoom),
    });

    const counts = getEditPassengerCounts(editForm.passengers);
    const adultLimit = getAdultLimit(normalizedRoom);
    if (adultLimit !== null && counts.adults > adultLimit) {
      toast.warning(
        `${normalizedRoom} room allows ${adultLimit} adult${adultLimit > 1 ? "s" : ""}. Remove ${counts.adults - adultLimit} extra adult${counts.adults - adultLimit > 1 ? "s" : ""} before saving.`,
      );
    }
  };

  const handleAddPassenger = (type = "Adult") => {
    const nextPassenger =
      type === "Infant"
        ? {
          type: "Infant",
          title: "INF",
          givenName: "",
          surName: "",
          passport: "",
          dateOfBirth: "",
          passportExpiry: "",
          nationality: "Pakistan",
        }
        : type === "Child"
          ? {
            type: "Child",
            title: "Child",
            givenName: "",
            surName: "",
            passport: "",
            dateOfBirth: "",
            passportExpiry: "",
            nationality: "Pakistan",
          }
          : {
            type: "Adult",
            title: "Mr",
            givenName: "",
            surName: "",
            passport: "",
            dateOfBirth: "",
            passportExpiry: "",
            nationality: "Pakistan",
          };
    const nextPassengers = [...editForm.passengers, nextPassenger];
    const limitError = getEditLimitError(nextPassengers, editForm.roomType);

    if (type !== "Infant" && limitError) {
      toast.warning(limitError);
      return;
    }

    setEditForm({
      ...editForm,
      passengers: nextPassengers,
      totalPrice: calculateEditTotal(nextPassengers, editForm.roomType),
    });
  };

  const handleRemovePassenger = (index) => {
    const passenger = editForm.passengers[index];
    if (!canRemovePassenger(passenger)) {
      const requiredAdults = getRequiredAdultCount(editForm.roomType);
      if (requiredAdults !== null && passenger?.type === "Adult") {
        toast.warning(
          `${editForm.roomType} room requires ${requiredAdults} adult${requiredAdults > 1 ? "s" : ""}`,
        );
      }
      return;
    }

    const updatedPassengers = editForm.passengers.filter(
      (_, i) => i !== index,
    );
    setEditForm({
      ...editForm,
      passengers: updatedPassengers,
      totalPrice: calculateEditTotal(updatedPassengers, editForm.roomType),
    });
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    try {
      setIsUpdating(true);

      if (!canEditBooking(selectedBooking)) {
        toast.error("Only pending bookings can be edited");
        return;
      }

      const limitError = getEditLimitError(editForm.passengers, editForm.roomType, {
        requireMinimumAdults: true,
      });
      if (limitError) {
        toast.error(`${limitError} Infants do not count toward seats.`);
        return;
      }

      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      const invalidExpiryIndex = editForm.passengers.findIndex((p) => {
        if (!p.passportExpiry) return false;
        return new Date(p.passportExpiry) <= sixMonthsFromNow;
      });
      if (invalidExpiryIndex !== -1) {
        toast.error(
          `Passport expiry for passenger ${invalidExpiryIndex + 1} must be more than 6 months from today`,
        );
        return;
      }

      const selectedRoomPrice = getRoomPrice(editForm.roomType);
      if (!selectedRoomPrice) {
        toast.error("Please select an available room type");
        return;
      }

      const missingPassportDocIndex = editForm.passengers.findIndex(
        (passenger, index) => !passenger.documentUrl && !passportFiles[index],
      );
      if (missingPassportDocIndex !== -1) {
        toast.error(
          `Please upload passport document for passenger ${missingPassportDocIndex + 1}`,
        );
        return;
      }

      // Upload any pending passport files and attach URLs to passengers
      const passengersWithDocs = await Promise.all(
        editForm.passengers.map(async (passenger, idx) => {
          const file = passportFiles[idx];
          if (!file) return passenger;
          const fd = new FormData();
          fd.append("file", file);
          try {
            const res = await axiosInstance.post(
              "/zip-accounts/upload-receipt",
              fd,
              { headers: { "Content-Type": "multipart/form-data" } },
            );
            return { ...passenger, documentUrl: res.data?.url || passenger.documentUrl };
          } catch (err) {
            console.error(`Passport upload failed for passenger ${idx}:`, err);
            return passenger;
          }
        }),
      );

      const updatedPassengers = passengersWithDocs.map((passenger) => ({
        ...passenger,
        name:
          `${passenger.givenName || ""} ${passenger.surName || ""}`.trim() ||
          passenger.name ||
          "",
        dob: passenger.dateOfBirth || passenger.dob || "",
      }));
      const updatedTotalPrice = calculateEditTotal(
        updatedPassengers,
        editForm.roomType,
      );

      const payload = {
        type: selectedBooking.type,
        bookingAgainst: selectedBooking.bookingAgainst || null,
        status: selectedBooking.status,
        payments: selectedBooking.payments || [],
        metadata: {
          ...selectedBooking.metadata,
          roomType: editForm.roomType,
          pricePerPerson: selectedRoomPrice,
          totalPrice: updatedTotalPrice,
          passengers: updatedPassengers,
          totalPassengers: updatedPassengers.length,
          specialRequests: editForm.specialRequests,
        },
        created_by: selectedBooking.created_by || null,
      };
      await axiosInstance.put(
        `/zip-accounts/update-booking/${selectedBooking._id}`,
        payload,
      );
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
    return booking?.status?.toString().toLowerCase().trim() === "pending";
  };

  // Helpers for ZIP payments array — payments live in metadata.payments
  const getPayments = (booking) =>
    booking.metadata?.payments || booking.payments || [];

  const getApprovedPaidAmount = (booking) =>
    getPayments(booking)
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Pending = under review (not yet approved/rejected)
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

      // Upload receipt to cloudinary if provided
      let receiptImageUrl = "";
      if (receiptFile) {
        const uploadData = new FormData();
        uploadData.append("file", receiptFile);
        const uploadRes = await axiosInstance.post(
          "/zip-accounts/upload-receipt",
          uploadData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        receiptImageUrl = uploadRes.data?.url || "";
      }

      // Build new payment entry matching ZIP payment schema
      const newPayment = {
        amount: submittingAmount,
        currency: selectedBooking.metadata?.currency || "",
        method: paymentForm.method,
        transactionRef: paymentForm.receiptNumber || "",
        receiptImage: receiptImageUrl,
        status: "pending",
        note: paymentForm.notes || "",
        submittedAt: new Date().toISOString(),
      };

      // Merge with existing payments (stored in metadata.payments)
      const updatedPayments = [...getPayments(selectedBooking), newPayment];

      // Build full booking payload for PUT
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

  const calculateRemainingTime = (expiresAt) => {
    if (!expiresAt) return { hours: 0, minutes: 0, seconds: 0, expired: true };
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      expired: false,
    };
  };

  const formatExpiryTime = (expiresAt) => {
    if (!expiresAt) return "";

    const expiryDate = new Date(expiresAt);
    if (Number.isNaN(expiryDate.getTime())) return "";

    return expiryDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    const pendingWithExpiry = bookings.filter(
      (b) => b.type === "UmrahPackage" && b.status === "pending" && b.expiresAt,
    );
    if (pendingWithExpiry.length === 0) return;
    const interval = setInterval(() => {
      const newTimers = {};
      pendingWithExpiry.forEach((booking) => {
        newTimers[booking._id] = calculateRemainingTime(booking.expiresAt);
      });
      setTimers(newTimers);
    }, 1000);
    return () => clearInterval(interval);
  }, [bookings]);

  useEffect(() => {
    fetchBookings();
  }, []);

  // Filter and Search Logic
  const filteredAndSortedBookings = useMemo(() => {
    // Filter only UmrahPackage type bookings
    let result = bookings.filter((booking) => booking.type === "UmrahPackage");

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((booking) => {
        const passengerName =
          `${booking.metadata?.passengers?.[0]?.name || ""}`.toLowerCase();

        return (
          booking.bookingId?.toLowerCase().includes(term) ||
          booking.metadata?.packageName?.toLowerCase().includes(term) ||
          passengerName.includes(term)
        );
      });
    }

    if (statusFilter !== "All") {
      result = result.filter((b) => b.status === statusFilter);
    }
    if (paymentFilter !== "All") {
      result = result.filter((b) => b.paymentStatus?.status === paymentFilter);
    }
    if (visaFilter !== "All") {
      result = result.filter((b) => getVisaLabel(b) === visaFilter);
    }
    if (hotelFilter !== "All") {
      result = result.filter((b) => b.hotelStatus?.status === hotelFilter);
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA, valB;

        switch (sortConfig.key) {
          case "bookingNumber":
            valA = a.bookingId || "";
            valB = b.bookingId || "";
            break;
          case "packageName":
            valA = a.metadata?.packageName || "";
            valB = b.metadata?.packageName || "";
            break;
          case "totalPrice":
            valA = a.metadata?.totalPrice || 0;
            valB = b.metadata?.totalPrice || 0;
            break;
          case "overallStatus":
            valA = a.status || "";
            valB = b.status || "";
            break;
          case "createdAt":
            valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
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

  // Filter only UmrahPackage bookings for stats and options
  const umrahBookings = bookings.filter((b) => b.type === "UmrahPackage");

  const VISA_LABEL_MAP = {
    not_applied: "Pending",
    submitted: "Applied",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    send_to_embassy: "Send to Embassy",
  };

  const getVisaRawKey = (booking) =>
    booking.metadata?.visaStatus ||
    (booking.visaStatus?.status
      ? booking.visaStatus.status.toLowerCase().replace(/ /g, "_")
      : null);

  const getVisaLabel = (booking) => {
    const raw = getVisaRawKey(booking);
    return raw ? VISA_LABEL_MAP[raw] || raw : null;
  };

  const getVisaColorClass = (rawKey) => {
    switch (rawKey) {
      case "approved": return "bg-blue-50 text-blue-700";
      case "submitted": return "bg-amber-50 text-amber-700";
      case "rejected": return "bg-red-50 text-red-700";
      case "cancelled": return "bg-red-50 text-red-700";
      case "send_to_embassy": return "bg-purple-50 text-purple-700";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  const statusOptions = [
    "All",
    ...new Set(umrahBookings.map((b) => b.status).filter(Boolean)),
  ];
  const paymentOptions = [
    "All",
    ...new Set(
      umrahBookings.map((b) => b.paymentStatus?.status).filter(Boolean),
    ),
  ];
  const visaOptions = [
    "All",
    ...new Set(umrahBookings.map((b) => getVisaLabel(b)).filter(Boolean)),
  ];
  const hotelOptions = [
    "All",
    ...new Set(umrahBookings.map((b) => b.hotelStatus?.status).filter(Boolean)),
  ];

  const visibleUmrahBookings = umrahBookings.filter((booking) => {
    const status = booking?.status?.toString().toLowerCase().trim();
    return status === "confirmed" || status === "pending";
  });

  const totalBookings = umrahBookings.length;
  const totalSpent = visibleUmrahBookings.reduce(
    (sum, b) => sum + (b.metadata?.totalPrice || 0),
    0,
  );
  const bookingStatusCounts = umrahBookings.reduce(
    (acc, booking) => {
      const status = booking?.status?.toString().toLowerCase().trim();

      if (["confirmed", "completed", "paid"].includes(status)) {
        acc.confirmed += 1;
      } else if (["pending", "on hold", "in progress"].includes(status)) {
        acc.hold += 1;
      } else if (["cancelled", "rejected"].includes(status)) {
        acc.cancelled += 1;
      }

      return acc;
    },
    { confirmed: 0, hold: 0, cancelled: 0 },
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
        <TopBar
          title={"My Umrah Bookings"}
          icon={<Package className="text-white w-6 h-6" />}
        />
        {/* Header */}
        {/* <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
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
        </div> */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Total Bookings</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalBookings}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Total Business Payment</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              PKR {totalSpent.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">On Hold</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">
              {bookingStatusCounts.hold}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Confirmed</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">
              {bookingStatusCounts.confirmed}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Cancelled</p>
            <p className="text-3xl font-bold text-rose-600 mt-1">
              {bookingStatusCounts.cancelled}
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
                    onClick={() => handleSort("createdAt")}
                    className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-emerald-600"
                  >
                    Date{" "}
                    {sortConfig.key === "createdAt" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>

                  {/* <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Expires
                  </th> */}

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
                  {/* <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Hotel
                  </th> */}

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
                        {booking.bookingId}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {booking.createdAt
                          ? new Date(booking.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>

                      {/* <td className="px-4 py-3 text-sm whitespace-nowrap">
                        
                      </td> */}

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate max-w-35">
                            {booking.metadata?.packageName}
                          </span>
                          {booking.metadata?.packageSource ===
                            "zip-accounts" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                ZIP
                              </span>
                            )}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {booking.metadata?.passengers?.[0]?.name}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {booking.metadata?.totalPassengers} pax
                        </div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        {booking.metadata?.currency}{" "}
                        {booking.metadata?.totalPrice?.toLocaleString()}
                      </td>

                      {/* Booking Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${booking.status === "confirmed"
                              ? "bg-emerald-50 text-emerald-700"
                              : booking.status === "pending"
                                ? "bg-amber-50 text-amber-700"
                                : booking.status === "cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                        >
                          {booking.status}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const payments = booking.metadata?.payments || booking.payments || [];
                            const total = booking.metadata?.totalPrice || 0;
                            const approved = payments
                              .filter((p) => p.status === "approved")
                              .reduce((s, p) => s + (p.amount || 0), 0);
                            const hasPending = payments.some(
                              (p) => p.status === "pending",
                            );
                            const hasRejected = payments.some(
                              (p) => p.status === "rejected",
                            );
                            const isFullyPaid = total > 0 && approved >= total;
                            return (
                              <>
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
                                    ? "Paid"
                                    : hasPending
                                      ? "Pending Review"
                                      : approved > 0
                                        ? "Partial"
                                        : "Unpaid"}
                                </span>
                                {hasRejected && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                                    {
                                      payments.filter(
                                        (p) => p.status === "rejected",
                                      ).length
                                    }{" "}
                                    Rejected
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Visa */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getVisaColorClass(getVisaRawKey(booking))}`}
                        >
                          {getVisaLabel(booking) || "N/A"}
                        </span>
                      </td>

                      {/* Hotel */}
                      {/* <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${booking.hotelStatus?.status === "Confirmed"
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
                      </td> */}

                      {/* Action */}
                      <td className="px-4 py-3 text-center whitespace-nowrap flex items-center justify-center flex-col">
                        <div className="pb-2">{booking.expiresAt && booking.status === "pending" ? (
                          (() => {
                            const timer = timers[booking._id] || calculateRemainingTime(booking.expiresAt);
                            if (timer.expired) {
                              const expiryTime = formatExpiryTime(booking.expiresAt);
                              return (
                                <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                  Auto cancelled{expiryTime ? ` at ${expiryTime}` : ""}
                                </span>
                              );
                            }

                            return (
                              <div className="flex items-center gap-1">
                                <div className="bg-rose-500 text-white px-2 py-1 rounded-md shadow-sm text-center min-w-9">
                                  <div className="text-sm font-bold leading-none">{String(timer.hours).padStart(2, "0")}</div>
                                  <div className="text-[8px] font-medium mt-0.5 opacity-90">HRS</div>
                                </div>
                                <div className="bg-amber-500 text-white px-2 py-1 rounded-md shadow-sm text-center min-w-9">
                                  <div className="text-sm font-bold leading-none">{String(timer.minutes).padStart(2, "0")}</div>
                                  <div className="text-[8px] font-medium mt-0.5 opacity-90">MIN</div>
                                </div>
                                <div className="bg-indigo-500 text-white px-2 py-1 rounded-md shadow-sm text-center min-w-9">
                                  <div className="text-sm font-bold leading-none">{String(timer.seconds).padStart(2, "0")}</div>
                                  <div className="text-[8px] font-medium mt-0.5 opacity-90">SEC</div>
                                </div>
                              </div>
                            );
                          })()
                        ) : null}</div>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              printGDSBooking(booking);
                            }}
                            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200 cursor-pointer"
                            title="Print Ticket"
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
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintVoucher(booking);
                            }}
                            disabled={printingVoucherId === booking._id}
                            className="p-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-emerald-200 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                            title="Open Voucher"
                          >
                            {printingVoucherId === booking._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileCheck className="w-4 h-4" />
                            )}
                          </button>
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
                              title="Only pending bookings can be edited"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                          )}
                          {(() => {
                            const payments = booking.metadata?.payments || booking.payments || [];
                            const total = booking.metadata?.totalPrice || 0;
                            const approved = payments
                              .filter((p) => p.status === "approved")
                              .reduce((s, p) => s + (p.amount || 0), 0);
                            const isFullyPaid = total > 0 && approved >= total;
                            return isFullyPaid ? (
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
                            );
                          })()}
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
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Booking ID
                    </p>
                    <p className="font-mono font-bold text-gray-900">
                      {selectedBooking.bookingId ||
                        selectedBooking.refNo ||
                        "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Package
                    </p>
                    <p className="font-semibold text-gray-900 truncate">
                      {selectedBooking.metadata?.packageName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Passengers
                    </p>
                    <p className="font-semibold text-gray-900">
                      {selectedBooking.metadata?.totalPassengers || "—"} pax
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Booking Status
                    </p>
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
                          Package Total
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

              {/* Payment History - Compact */}
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
                                ? new Date(
                                  payment.submittedAt,
                                ).toLocaleDateString()
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
                              <p className="text-xs text-red-800">
                                {payment.note}
                              </p>
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

              {/* Visa Status Details */}
              {getVisaRawKey(selectedBooking) && getVisaRawKey(selectedBooking) !== "not_applied" && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Visa Status
                  </h3>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-medium">
                        Status:
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getVisaColorClass(getVisaRawKey(selectedBooking))}`}>
                        {getVisaLabel(selectedBooking)}
                      </span>
                    </div>
                    {selectedBooking.visaStatus?.applicationNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">
                          Application No:
                        </span>
                        <span className="text-xs text-gray-800 font-semibold">
                          {selectedBooking.visaStatus.applicationNumber}
                        </span>
                      </div>
                    )}
                    {selectedBooking.visaStatus?.approvalDate && (
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
                    {selectedBooking.visaStatus?.notes && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                          Notes:
                        </p>
                        <p className="text-xs text-gray-700">
                          {selectedBooking.visaStatus.notes}
                        </p>
                      </div>
                    )}
                    {selectedBooking.visaStatus?.approvalDocument && (
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
                          className={`px-2 py-1 rounded-full text-xs font-bold ${selectedBooking.hotelStatus.status === "Confirmed"
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
                  {selectedBooking.bookingId || selectedBooking.bookingNumber}
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
                      {selectedBooking.metadata?.packageName ||
                        selectedBooking.packageName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Total Price
                    </p>
                    <p className="font-bold text-emerald-600 text-lg">
                      {selectedBooking.metadata?.currency || "PKR"}{" "}
                      {(
                        selectedBooking.metadata?.totalPrice ||
                        selectedBooking.pricing?.totalPrice
                      )?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Passengers
                    </p>
                    <p className="font-semibold text-gray-900">
                      {selectedBooking.metadata?.totalPassengers ||
                        selectedBooking.passengerCount?.total ||
                        selectedBooking.passengers?.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Booking Status
                    </p>
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-medium capitalize">
                      {selectedBooking.status || selectedBooking.overallStatus}
                    </span>
                  </div>
                  {selectedBooking.metadata?.roomType && (
                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase">
                        Room Type
                      </p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {selectedBooking.metadata.roomType}
                      </p>
                    </div>
                  )}
                  {/* <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">
                      Booking Expiry
                    </p>
                    {selectedBooking.expiresAt ? (
                      (() => {
                        const expiry = new Date(selectedBooking.expiresAt);
                        const isExpired = expiry < new Date();
                        return (
                          <p className={`font-semibold text-sm ${
                            isExpired ? "text-red-600" : "text-amber-600"
                          }`}>
                            {expiry.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            {" "}{expiry.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            {isExpired && " (Expired)"}
                          </p>
                        );
                      })()
                    ) : (
                      <p className="font-semibold text-gray-500">No Expiry</p>
                    )}
                  </div> */}
                </div>
              </div>

              {/* Passengers List */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Passenger Details
                </h3>
                <div className="space-y-3">
                  {(
                    selectedBooking.metadata?.passengers ||
                    selectedBooking.passengers
                  )?.map((passenger, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-base">
                            {passenger.title && `${passenger.title} `}
                            {passenger.name ||
                              `${passenger.givenName} ${passenger.surName}`}
                          </h4>
                          <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mt-1 capitalize">
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
                        {passenger.dob || passenger.dateOfBirth ? (
                          <div>
                            <p className="text-gray-500 text-xs font-semibold uppercase mb-1">
                              Date of Birth
                            </p>
                            <p className="font-semibold text-gray-900">
                              {new Date(
                                passenger.dob || passenger.dateOfBirth,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        ) : null}
                        {passenger.passportExpiry ? (
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
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Requests */}
              {(selectedBooking.metadata?.specialRequests ||
                selectedBooking.specialRequests) && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      Special Requests
                    </h3>
                    <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                      <p className="text-sm text-gray-800">
                        {selectedBooking.metadata?.specialRequests ||
                          selectedBooking.specialRequests}
                      </p>
                    </div>
                  </div>
                )}

              {/* Payment Status & History */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Payment Status
                </h3>
                {/* Summary bar */}
                {(() => {
                  const payments = getPayments(selectedBooking);
                  const total = selectedBooking.metadata?.totalPrice || 0;
                  const approved = payments
                    .filter((p) => p.status === "approved")
                    .reduce((s, p) => s + (p.amount || 0), 0);
                  const remaining = Math.max(0, total - approved);
                  const isFullyPaid = total > 0 && approved >= total;
                  if (payments.length === 0 && total === 0) return null;
                  return (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Total</p>
                        <p className="font-bold text-gray-900 text-sm">
                          {selectedBooking.metadata?.currency || "PKR"} {total.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Paid</p>
                        <p className="font-bold text-emerald-800 text-sm">
                          {selectedBooking.metadata?.currency || "PKR"} {approved.toLocaleString()}
                        </p>
                      </div>
                      <div className={`rounded-xl p-3 text-center ${isFullyPaid ? "bg-emerald-50" : "bg-amber-50"}`}>
                        <p className={`text-[10px] font-bold uppercase mb-1 ${isFullyPaid ? "text-emerald-600" : "text-amber-600"}`}>
                          {isFullyPaid ? "Fully Paid" : "Remaining"}
                        </p>
                        <p className={`font-bold text-sm ${isFullyPaid ? "text-emerald-800" : "text-amber-800"}`}>
                          {selectedBooking.metadata?.currency || "PKR"} {remaining.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })()}
                <div className="space-y-3">
                  {getPayments(selectedBooking).length > 0 ? (
                    getPayments(selectedBooking).map((payment, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-4 bg-gray-50">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-lg">
                              {payment.currency || selectedBooking.metadata?.currency || "PKR"}{" "}
                              {payment.amount?.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
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
                            className={`px-3 py-1.5 rounded-full text-xs font-bold ${payment.status === "approved"
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
                          <div className="px-4 py-3 bg-red-50 border-t border-red-200">
                            <p className="text-xs font-semibold text-red-700 uppercase mb-1">
                              Rejection Note:
                            </p>
                            <p className="text-sm text-red-800">{payment.note}</p>
                          </div>
                        )}
                        {payment.receiptImage && (
                          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                            <a
                              href={payment.receiptImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              <Upload className="w-4 h-4" />
                              View Receipt
                            </a>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm italic">
                      No payment submitted yet
                    </p>
                  )}
                </div>
              </div>

              {/* Visa Status */}
              {getVisaRawKey(selectedBooking) && getVisaRawKey(selectedBooking) !== "not_applied" && (
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
                      <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${{ approved: "bg-blue-600", submitted: "bg-amber-500", rejected: "bg-red-600", cancelled: "bg-red-600", send_to_embassy: "bg-purple-600" }[getVisaRawKey(selectedBooking)] || "bg-gray-500"
                        }`}
                      >
                        {getVisaLabel(selectedBooking)}
                      </span>
                    </div>
                    {selectedBooking.visaStatus?.applicationNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Application Number:
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {selectedBooking.visaStatus.applicationNumber}
                        </span>
                      </div>
                    )}
                    {selectedBooking.visaStatus?.approvalDate && (
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
                    {selectedBooking.visaStatus?.notes && (
                      <div className="pt-3 border-t border-blue-300">
                        <p className="text-xs font-semibold text-blue-900 uppercase mb-1">
                          Notes:
                        </p>
                        <p className="text-sm text-gray-800">
                          {selectedBooking.visaStatus.notes}
                        </p>
                      </div>
                    )}
                    {selectedBooking.visaStatus?.approvalDocument && (
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
                          className={`px-3 py-1 rounded-full text-sm font-bold ${selectedBooking.hotelStatus.status === "Confirmed"
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
              {(() => {
                const pmts = getPayments(selectedBooking);
                const total = selectedBooking.metadata?.totalPrice || 0;
                const approved = pmts
                  .filter((p) => p.status === "approved")
                  .reduce((s, p) => s + (p.amount || 0), 0);
                const isFullyPaid = total > 0 && approved >= total;
                return !isFullyPaid ? (
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
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* EDIT BOOKING MODAL */}
      {showEditModal && selectedBooking && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-1000">
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
                  {selectedBooking.bookingId || selectedBooking.bookingNumber}
                </p>
                <p className="text-gray-700 text-sm font-semibold mt-1">
                  {selectedBooking.metadata?.packageName ||
                    selectedBooking.packageName ||
                    "Umrah Package"}
                </p>
                <p className="text-amber-600 text-xs font-semibold mt-2">
                  You can edit this booking while it is pending
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
              {/* Room & Pricing Section */}
              <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                {(() => {
                  const roomOptions = getEditableRoomOptions(selectedBooking);
                  const counts = getEditPassengerCounts();
                  const payingPassengers = counts.adults + counts.children;
                  const adultLimit = getAdultLimit(editForm.roomType);
                  const requiredAdults = getRequiredAdultCount(editForm.roomType);
                  const payingLimit = getPayingPassengerLimit();
                  const availableSeats = getAvailableSeatsFromPackage();
                  const selectedRoomPrice = getRoomPrice(editForm.roomType);
                  const isAdultOverLimit =
                    adultLimit !== null && counts.adults > adultLimit;
                  const isAdultUnderRequired =
                    requiredAdults !== null && counts.adults < requiredAdults;
                  const isPayingOverLimit =
                    payingLimit !== null && payingPassengers > payingLimit;

                  return (
                    <>
                      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                        <div className=" min-w-[320px]">
                          <label className="text-xs font-semibold text-gray-600 ml-1 mb-1 block">
                            Room Type *
                          </label>
                          <select
                            required
                            value={editForm.roomType}
                            onChange={(e) =>
                              handleEditRoomTypeChange(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm capitalize"
                          >
                            {roomOptions.map((room) => (
                              <option key={room} value={room}>
                                {room.charAt(0).toUpperCase() + room.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-1">
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">
                              Room Price
                            </p>
                            <p className="text-sm font-bold text-blue-700">
                              PKR {selectedRoomPrice.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">
                              Group Seats Left
                            </p>
                            <p className="text-sm font-bold text-emerald-700">
                              {availableSeats === null
                                ? "N/A"
                                : availableSeats}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">
                              Adults
                            </p>
                            <p
                              className={`text-sm font-bold ${isAdultOverLimit || isAdultUnderRequired
                                  ? "text-red-700"
                                  : "text-gray-900"
                                }`}
                            >
                              {counts.adults}
                              {requiredAdults !== null
                                ? ` / ${requiredAdults} required`
                                : adultLimit !== null
                                  ? ` / ${adultLimit}`
                                  : ""}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">
                              Adult/Child Seats
                            </p>
                            <p
                              className={`text-sm font-bold ${isPayingOverLimit
                                  ? "text-red-700"
                                  : "text-gray-900"
                                }`}
                            >
                              {payingPassengers}
                              {payingLimit !== null ? ` / ${payingLimit}` : ""}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">
                              New Total
                            </p>
                            <p className="text-sm font-bold text-emerald-700">
                              PKR{" "}
                              {calculateEditTotal().toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="px-2 py-1 rounded-full bg-white border border-gray-200">
                          Adults: {counts.adults}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-white border border-gray-200">
                          Children: {counts.children}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-white border border-gray-200">
                          Infants: {counts.infants}
                        </span>
                        {(isAdultOverLimit ||
                          isAdultUnderRequired ||
                          isPayingOverLimit) && (
                            <span className="px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 font-semibold">
                              Fixed rooms require exact adult occupancy; children follow seat availability
                            </span>
                          )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Passengers Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    Passengers ({editForm.passengers.length})
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddPassenger("Adult")}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Adult
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPassenger("Child")}
                      className="flex items-center gap-2 px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Child
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPassenger("Infant")}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Infant
                    </button>
                  </div>
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
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenMrzModal(index)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm font-semibold"
                            title="Scan passport MRZ"
                          >
                            <Scan className="w-3 h-3" />
                            MRZ
                          </button>
                          {canRemovePassenger(passenger) && (
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
                            min={(() => {
                              const d = new Date();
                              d.setMonth(d.getMonth() + 6);
                              d.setDate(d.getDate() + 1);
                              return d.toISOString().split("T")[0];
                            })()}
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

                      <div className="mt-3">
                        <label className="text-xs font-semibold text-gray-600 ml-1 mb-1 block">
                          Passport Document *
                        </label>
                        <div className="flex items-center gap-3">
                          <label
                            className={`flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed rounded-lg text-xs transition-colors ${passportFiles[index] || passenger.documentUrl
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                : "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                              }`}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {passportFiles[index]
                              ? passportFiles[index].name
                              : passenger.documentUrl
                                ? "Replace document"
                                : "Upload passport document"}
                            <input
                              type="file"
                              required={!passenger.documentUrl && !passportFiles[index]}
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file)
                                  setPassportFiles((prev) => ({
                                    ...prev,
                                    [index]: file,
                                  }));
                              }}
                            />
                          </label>
                          {(passportFiles[index] || passenger.documentUrl) && (
                            <div className="flex items-center gap-2">
                              {passenger.documentUrl && !passportFiles[index] && (
                                <a
                                  href={passenger.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  <FileCheck className="w-3 h-3" />
                                  View Current
                                </a>
                              )}
                              {passportFiles[index] && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPassportFiles((prev) => {
                                      const next = { ...prev };
                                      delete next[index];
                                      return next;
                                    })
                                  }
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
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

      {mrzModal.open && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={handleCloseMrzModal}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between bg-indigo-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Scan Passport MRZ
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Passenger {(mrzModal.index ?? 0) + 1}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseMrzModal}
                className="p-2 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                <Scan className="w-5 h-5 text-indigo-600 mt-0.5" />
                <p className="text-sm text-indigo-800">
                  Paste the two passport MRZ lines. Multiple passports can be
                  pasted with a blank line between each one.
                </p>
              </div>

              <textarea
                value={mrzInput}
                onChange={(e) => {
                  setMrzInput(e.target.value);
                  setMrzError("");
                }}
                rows={8}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm font-mono"
                placeholder={"P<PAKDOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<\nAA1234567<0PAK8901015M3012319<<<<<<<<<<<<08"}
              />

              {mrzError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {mrzError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseMrzModal}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMrzParse}
                  disabled={!mrzInput.trim()}
                  className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Scan className="w-4 h-4" />
                  Parse MRZ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
