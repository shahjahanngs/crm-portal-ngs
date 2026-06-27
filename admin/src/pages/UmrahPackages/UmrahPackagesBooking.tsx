import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    getAllBookingsAdmin,
    reviewPayment,
    updateVisaStatus,
    updateHotelStatus,
} from "../../Api/umrahBookingApi";
import {
    BuildingOffice2Icon,
    UserGroupIcon,
    CreditCardIcon,
    DocumentCheckIcon,
    BuildingStorefrontIcon,
    TicketIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PaperClipIcon,
    HashtagIcon,
    BanknotesIcon,
    IdentificationIcon,
} from "@heroicons/react/24/outline";

interface Passenger {
    type: string;
    title: string;
    givenName: string;
    surName: string;
    passport: string;
    dateOfBirth: string;
    nationality: string;
    documentUrl?: string;
}

interface PaymentHistory {
    _id?: string;
    amount: number;
    method: string;
    paymentDate: string;
    receiptNumber?: string;
    receiptFile?: string;
    notes?: string;
    paymentStatus?: "Pending" | "Received" | "Approved" | "Rejected";
    submittedBy?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    approvalProofFile?: string;
}

interface UmrahBooking {
    _id: string;
    bookingNumber: string;
    packageName: string;
    packageSource?: "zip-accounts" | "local-db"; // Track package source
    user: {
        _id: string;
        name: string;
        email: string;
        phone: string;
        role?: string;
        companyName?: string;
        agencyCode?: string;
        consultant?: string;
    };
    passengers: Passenger[];
    passengerCount: { adults: number; children: number; infants: number };
    pricing: { pricePerPerson: number; totalPrice: number };
    paymentStatus: {
        status: "Pending" | "Paid" | "Refunded";
        totalAmount: number;
        paidAmount: number;
        remainingAmount: number;
        rejectionReason?: string;
        paymentHistory: PaymentHistory[];
    };
    visaStatus: {
        status: "Not Applied" | "Applied" | "In Process" | "Approved" | "Rejected";
        applicationNumber?: string;
        approvalDate?: string;
        approvalDocument?: string;
        notes?: string;
    };
    hotelStatus: {
        status: "Not Booked" | "Booked" | "Confirmed" | "Cancelled";
        bookingDate?: string;
        confirmationNumber?: string;
        confirmationDocument?: string;
        notes?: string;
    };
    voucherStatus: {
        status: "Not Generated" | "Generated" | "Sent" | "Printed";
        voucherNumber?: string;
        sentDate?: string;
    };
    overallStatus: string;
    createdAt: string;
}

interface StatusModalData {
    bookingId: string;
    type: "payment" | "visa" | "hotel" | "voucher";
    booking: UmrahBooking;
    paymentId?: string; // For reviewing individual payments
    paymentData?: PaymentHistory; // The payment being reviewed
}

const statusColorMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    Pending: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#F59E0B" },
    Paid: { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0", dot: "#22C55E" },
    Refunded: { bg: "#FFF1F2", text: "#9F1239", border: "#FECDD3", dot: "#F43F5E" },
    Received: { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0", dot: "#22C55E" },
    "Not Applied": { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0", dot: "#94A3B8" },
    Applied: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE", dot: "#3B82F6" },
    "In Process": { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", dot: "#F59E0B" },
    Approved: { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0", dot: "#22C55E" },
    Rejected: { bg: "#FFF1F2", text: "#9F1239", border: "#FECDD3", dot: "#F43F5E" },
    "Not Booked": { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0", dot: "#94A3B8" },
    Booked: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE", dot: "#3B82F6" },
    Confirmed: { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0", dot: "#22C55E" },
    Cancelled: { bg: "#FFF1F2", text: "#9F1239", border: "#FECDD3", dot: "#F43F5E" },
    "Not Generated": { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0", dot: "#94A3B8" },
    Generated: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE", dot: "#3B82F6" },
    Sent: { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0", dot: "#22C55E" },
    Printed: { bg: "#FAF5FF", text: "#6B21A8", border: "#E9D5FF", dot: "#A855F7" },
};

function StatusBadge({ status }: { status: string }) {
    const c = statusColorMap[status] || { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0", dot: "#94A3B8" };
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "3px 9px", borderRadius: "6px", fontSize: "0.72rem",
            fontWeight: 600, backgroundColor: c.bg, color: c.text,
            border: `1px solid ${c.border}`, whiteSpace: "nowrap", letterSpacing: "0.2px",
        }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: c.dot, flexShrink: 0 }} />
            {status}
        </span>
    );
}

const GLOBAL_STYLES = `
    * { box-sizing: border-box; }
    .ub-row:hover td { background: #F0F6FF !important; }
    .ub-btn { transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s; }
    .ub-btn:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,0.12); }
    .ub-btn:active { transform: translateY(0); }
    .ub-input { width: 100%; padding: 8px 12px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 0.855rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; background: white; color: #0F172A; }
    .ub-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .ub-label { display: block; font-size: 0.72rem; font-weight: 700; color: #64748B; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .ub-panel { animation: panelIn 0.22s cubic-bezier(0.22,1,0.36,1); }
    @keyframes panelIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    @keyframes ub-spin { to { transform: rotate(360deg); } }
    @media (max-width: 768px) {
        .ub-stats { grid-template-columns: 1fr 1fr !important; }
        .ub-filters { grid-template-columns: 1fr !important; }
        .ub-detail-grid { grid-template-columns: 1fr !important; }
    }
`;

export default function UmrahPackagesBooking() {
    const [bookings, setBookings] = useState<UmrahBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("");
    const [visaFilter, setVisaFilter] = useState("");
    const [hotelFilter, setHotelFilter] = useState("");
    const [modalData, setModalData] = useState<StatusModalData | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    useEffect(() => { fetchBookings(); }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await getAllBookingsAdmin({ search: searchTerm });
            setBookings(response.data || []);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to fetch bookings");
        } finally {
            setLoading(false);
        }
    };

    const filteredBookings = bookings.filter((b) => {
        const s = searchTerm.toLowerCase();
        const matchSearch =
            b.bookingNumber.toLowerCase().includes(s) ||
            b.packageName.toLowerCase().includes(s);
        const matchStatus = statusFilter ? b.overallStatus === statusFilter : true;
        const matchPayment = paymentFilter ? b.paymentStatus.status === paymentFilter : true;
        const matchVisa = visaFilter ? b.visaStatus.status === visaFilter : true;
        const matchHotel = hotelFilter ? b.hotelStatus.status === hotelFilter : true;
        return matchSearch && matchStatus && matchPayment && matchVisa && matchHotel;
    });

    const openModal = (bookingId: string, type: StatusModalData["type"], booking: UmrahBooking) =>
        setModalData({ bookingId, type, booking });

    const openPaymentReviewModal = async (bookingId: string, payment: PaymentHistory) => {
        try {
            const response = await getAllBookingsAdmin({});
            const freshBookings: UmrahBooking[] = response.data || [];
            setBookings(freshBookings);
            const booking = freshBookings.find((b: UmrahBooking) => b._id === bookingId);
            if (!booking) { toast.error("Booking not found"); return; }
            // Match by _id first, fallback to receiptNumber+amount
            const freshPayment = booking.paymentStatus.paymentHistory.find((p: PaymentHistory) =>
                p._id === payment._id
            ) || booking.paymentStatus.paymentHistory.find((p: PaymentHistory) =>
                p.amount === payment.amount && p.method === payment.method && p.receiptNumber === payment.receiptNumber
            );
            if (!freshPayment?._id) { toast.error("Payment not found. Please refresh."); return; }
            setModalData({ bookingId, type: "payment", booking, paymentId: freshPayment._id, paymentData: freshPayment });
        } catch {
            toast.error("Failed to load payment details");
        }
    };

    const canUpdateVisa = (b: UmrahBooking) => b.paymentStatus.status === "Paid";
    const canUpdateHotel = (b: UmrahBooking) => b.visaStatus.status === "Approved";

    const stats = [
        { label: "Total Bookings", value: bookings.length, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", Icon: BuildingOffice2Icon },
        { label: "Paid", value: bookings.filter(b => b.paymentStatus.status === "Paid").length, color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", Icon: CreditCardIcon },
        { label: "Visa Approved", value: bookings.filter(b => b.visaStatus.status === "Approved").length, color: "#7C3AED", bg: "#FAF5FF", border: "#E9D5FF", Icon: DocumentCheckIcon },
        { label: "Pending", value: bookings.filter(b => b.paymentStatus.status === "Pending").length, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", Icon: ExclamationTriangleIcon },
    ];

    return (
        <div style={{ padding: "24px 28px", minHeight: "100vh" }}>
            <style>{GLOBAL_STYLES}</style>

            <div style={{ maxWidth: "1440px", margin: "0 auto" }}>

                {/* ── Page Header ─────────────────────────────── */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "26px" }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: "12px",
                        background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                        <BuildingOffice2Icon style={{ width: 22, height: 22, color: "white" }} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.3px" }}>
                            Umrah Package Bookings
                        </h1>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748B", marginTop: "2px" }}>
                            Manage bookings and update status stepwise
                        </p>
                    </div>
                </div>

                {/* ── Stats ───────────────────────────────────── */}
                <div className="ub-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "20px" }}>
                    {stats.map(({ label, value, color, bg, border, Icon }) => (
                        <div key={label} style={{
                            background: "white", borderRadius: "12px", padding: "16px 18px",
                            border: `1px solid #E2E8F0`, boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                            display: "flex", alignItems: "center", gap: "14px",
                        }}>
                            <div style={{ width: 40, height: 40, borderRadius: "10px", background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Icon style={{ width: 18, height: 18, color }} />
                            </div>
                            <div>
                                <div style={{ fontSize: "1.6rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                                <div style={{ fontSize: "0.72rem", color: "#94A3B8", fontWeight: 600, marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Filters ─────────────────────────────────── */}
                <div style={{ background: "white", borderRadius: "12px", padding: "16px 20px", marginBottom: "18px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* First Row - Search */}
                        <div>
                            <label className="ub-label">Search</label>
                            <div style={{ position: "relative" }}>
                                <MagnifyingGlassIcon style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94A3B8" }} />
                                <input
                                    type="text"
                                    className="ub-input"
                                    placeholder="Booking number, package name..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: "32px" }}
                                />
                            </div>
                        </div>
                        {/* Second Row - All Filter Dropdowns */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", alignItems: "end" }}>
                            <div>
                                <label className="ub-label">Booking Status</label>
                                <div style={{ position: "relative" }}>
                                    <FunnelIcon style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#94A3B8" }} />
                                    <select
                                        className="ub-input"
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value)}
                                        style={{ paddingLeft: "32px", cursor: "pointer" }}
                                    >
                                        <option value="">All</option>
                                        <option value="Pending">Pending</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Confirmed">Confirmed</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="ub-label">Payment Status</label>
                                <select
                                    className="ub-input"
                                    value={paymentFilter}
                                    onChange={e => setPaymentFilter(e.target.value)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <option value="">All</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Refunded">Refunded</option>
                                </select>
                            </div>
                            <div>
                                <label className="ub-label">Visa Status</label>
                                <select
                                    className="ub-input"
                                    value={visaFilter}
                                    onChange={e => setVisaFilter(e.target.value)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <option value="">All</option>
                                    <option value="Not Applied">Not Applied</option>
                                    <option value="Applied">Applied</option>
                                    <option value="In Process">In Process</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="ub-label">Hotel Status</label>
                                <select
                                    className="ub-input"
                                    value={hotelFilter}
                                    onChange={e => setHotelFilter(e.target.value)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <option value="">All</option>
                                    <option value="Not Booked">Not Booked</option>
                                    <option value="Booked">Booked</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <button
                                onClick={fetchBookings}
                                className="ub-btn"
                                style={{
                                    display: "flex", alignItems: "center", gap: "7px",
                                    padding: "8px 18px", background: "linear-gradient(135deg,#1E3A8A,#2563EB)",
                                    color: "white", border: "none", borderRadius: "8px",
                                    fontWeight: 600, fontSize: "0.855rem", cursor: "pointer", whiteSpace: "nowrap",
                                    justifyContent: "center"
                                }}
                            >
                                <ArrowPathIcon style={{ width: 15, height: 15 }} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Table ───────────────────────────────────── */}
                {loading ? (
                    <div style={{ background: "white", borderRadius: "12px", padding: "60px 20px", textAlign: "center", border: "1px solid #E2E8F0" }}>
                        <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: "#2563EB", borderRadius: "50%", margin: "0 auto 14px", animation: "ub-spin 0.75s linear infinite" }} />
                        <p style={{ color: "#64748B", margin: 0, fontSize: "0.875rem" }}>Loading bookings...</p>
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div style={{ background: "white", borderRadius: "12px", padding: "60px 20px", textAlign: "center", border: "1px solid #E2E8F0" }}>
                        <BuildingStorefrontIcon style={{ width: 40, height: 40, color: "#CBD5E1", margin: "0 auto 12px" }} />
                        <p style={{ color: "#64748B", margin: 0, fontWeight: 500, fontSize: "0.875rem" }}>No bookings found</p>
                    </div>
                ) : (
                    <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
                                <thead>
                                    <tr style={{ background: "linear-gradient(135deg,#1E3A8A 0%,#1D4ED8 100%)" }}>
                                        {[
                                            { label: "Booking Details", align: "left" },
                                            { label: "Agent", align: "left" },
                                            { label: "Payment", align: "center" },
                                            { label: "Visa", align: "center" },
                                            { label: "Hotel", align: "center" },
                                            { label: "Actions", align: "center" },
                                        ].map(h => (
                                            <th key={h.label} style={{
                                                padding: "12px 16px", textAlign: h.align as any,
                                                fontSize: "0.7rem", fontWeight: 700,
                                                color: "rgba(255,255,255,0.85)", textTransform: "uppercase",
                                                letterSpacing: "0.7px", whiteSpace: "nowrap",
                                            }}>{h.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBookings.map((booking, idx) => (
                                        <>
                                            <tr
                                                key={booking._id}
                                                className="ub-row"
                                                style={{ borderBottom: "1px solid #F1F5F9", background: idx % 2 === 0 ? "white" : "#FAFBFD" }}
                                            >
                                                {/* Booking Details */}
                                                <td style={{ padding: "13px 16px" }}>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                                            <HashtagIcon style={{ width: 12, height: 12, color: "#2563EB" }} />
                                                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2563EB" }}>{booking.bookingNumber}</span>
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                                            <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "#0F172A" }}>{booking.packageName}</span>
                                                            {booking.packageSource === "zip-accounts" && (
                                                                <span style={{
                                                                    display: "inline-flex", alignItems: "center", gap: "3px",
                                                                    padding: "2px 6px", borderRadius: "4px", fontSize: "0.65rem",
                                                                    fontWeight: 700, backgroundColor: "#DBEAFE", color: "#1E40AF",
                                                                    border: "1px solid #93C5FD", whiteSpace: "nowrap", letterSpacing: "0.3px",
                                                                }}>
                                                                    <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#3B82F6" }} />
                                                                    ZIP
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                            <UserGroupIcon style={{ width: 11, height: 11, color: "#94A3B8" }} />
                                                            <span style={{ fontSize: "0.73rem", color: "#94A3B8" }}>{booking.passengers.length} Passengers</span>
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                            <BanknotesIcon style={{ width: 11, height: 11, color: "#059669" }} />
                                                            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#059669" }}>PKR {booking.pricing.totalPrice.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Agent */}
                                                <td style={{ padding: "13px 16px" }}>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                            <IdentificationIcon style={{ width: 12, height: 12, color: "#7C3AED" }} />
                                                            <span style={{ fontSize: "0.855rem", fontWeight: 600, color: "#0F172A" }}>{booking.user?.name || "N/A"}</span>
                                                        </div>
                                                        {booking.user?.companyName && (
                                                            <span style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 500 }}>{booking.user.companyName}</span>
                                                        )}
                                                        {booking.user?.agencyCode && (
                                                            <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Code: {booking.user.agencyCode}</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Payment */}
                                                <td style={{ padding: "13px 16px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                                                        <StatusBadge status={booking.paymentStatus.status} />
                                                        {booking.paymentStatus.paymentHistory.length === 0 ? (
                                                            <span style={{ fontSize: "0.68rem", color: "#94A3B8" }}>No payments</span>
                                                        ) : (
                                                            booking.paymentStatus.paymentHistory.map((pay) => {
                                                                const hasPaymentId = pay._id || (pay as any).id;
                                                                return (
                                                                    <button
                                                                        key={pay._id || Math.random()}
                                                                        onClick={() => hasPaymentId ? openPaymentReviewModal(booking._id, pay) : toast.error("Payment ID missing")}
                                                                        className="ub-btn"
                                                                        disabled={!hasPaymentId}
                                                                        style={{
                                                                            fontSize: "0.68rem", fontWeight: 600,
                                                                            padding: "3px 8px", border: "none", borderRadius: "5px",
                                                                            cursor: hasPaymentId ? "pointer" : "not-allowed",
                                                                            opacity: hasPaymentId ? 1 : 0.6,
                                                                            background: pay.paymentStatus === "Pending" ? "#EFF6FF" : (pay.paymentStatus === "Approved" || pay.paymentStatus === "Received") ? "#F0FDF4" : pay.paymentStatus === "Rejected" ? "#FFF1F2" : "#EFF6FF",
                                                                            color: pay.paymentStatus === "Pending" ? "#2563EB" : (pay.paymentStatus === "Approved" || pay.paymentStatus === "Received") ? "#059669" : pay.paymentStatus === "Rejected" ? "#DC2626" : "#2563EB",
                                                                        }}
                                                                    >
                                                                        PKR {pay.amount.toLocaleString()} · {pay.paymentStatus === "Pending" ? "Pending Review" : pay.paymentStatus || "Pending"}
                                                                    </button>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Visa */}
                                                <td style={{ padding: "13px 16px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                                                        <StatusBadge status={booking.visaStatus.status} />
                                                        {!canUpdateVisa(booking) ? (
                                                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                                                <ExclamationTriangleIcon style={{ width: 11, height: 11, color: "#EF4444" }} />
                                                                <span style={{ fontSize: "0.68rem", color: "#EF4444", fontWeight: 500 }}>Payment required</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => openModal(booking._id, "visa", booking)}
                                                                className="ub-btn"
                                                                style={{ fontSize: "0.7rem", color: "white", background: "#7C3AED", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}
                                                            >
                                                                Update
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Hotel */}
                                                <td style={{ padding: "13px 16px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
                                                        <StatusBadge status={booking.hotelStatus.status} />
                                                        {!canUpdateHotel(booking) ? (
                                                            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                                                <ExclamationTriangleIcon style={{ width: 11, height: 11, color: "#EF4444" }} />
                                                                <span style={{ fontSize: "0.68rem", color: "#EF4444", fontWeight: 500 }}>Visa required</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => openModal(booking._id, "hotel", booking)}
                                                                className="ub-btn"
                                                                style={{ fontSize: "0.7rem", color: "white", background: "#059669", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}
                                                            >
                                                                Update
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td style={{ padding: "13px 16px", textAlign: "center" }}>
                                                    <button
                                                        onClick={() => setExpandedRow(expandedRow === booking._id ? null : booking._id)}
                                                        className="ub-btn"
                                                        style={{
                                                            display: "inline-flex", alignItems: "center", gap: "5px",
                                                            padding: "6px 12px", background: expandedRow === booking._id ? "#EFF6FF" : "white",
                                                            color: "#2563EB", border: "1.5px solid #BFDBFE",
                                                            borderRadius: "8px", fontWeight: 600, fontSize: "0.76rem", cursor: "pointer",
                                                        }}
                                                    >
                                                        {expandedRow === booking._id
                                                            ? <><ChevronUpIcon style={{ width: 13, height: 13 }} /> Hide</>
                                                            : <><ChevronDownIcon style={{ width: 13, height: 13 }} /> Details</>
                                                        }
                                                    </button>
                                                </td>
                                            </tr>

                                            {expandedRow === booking._id && (
                                                <tr key={`${booking._id}-exp`}>
                                                    <td colSpan={6} style={{ padding: 0, background: "#F8FAFF", borderBottom: "2px solid #BFDBFE" }}>
                                                        <div style={{ padding: "18px 20px" }}>
                                                            <BookingDetails booking={booking} onReviewPayment={openPaymentReviewModal} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {modalData && (
                <StatusUpdateModal
                    modalData={modalData}
                    onClose={() => setModalData(null)}
                    onSuccess={() => { fetchBookings(); setModalData(null); }}
                />
            )}
        </div>
    );
}

// ── Booking Details ──────────────────────────────────────────────────────────
function BookingDetails({ booking, onReviewPayment }: { booking: UmrahBooking; onReviewPayment: (bookingId: string, payment: PaymentHistory) => void }) {
    return (
        <div className="ub-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            {/* Passengers */}
            <div style={{ background: "white", borderRadius: "10px", padding: "14px 16px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
                    <UserGroupIcon style={{ width: 15, height: 15, color: "#2563EB" }} />
                    <h3 style={{ margin: 0, fontSize: "0.84rem", fontWeight: 700, color: "#0F172A" }}>
                        Passengers ({booking.passengers.length})
                    </h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px", maxHeight: "210px", overflowY: "auto" }}>
                    {booking.passengers.map((p, i) => (
                        <div key={i} style={{ padding: "8px 11px", background: "#F8FAFC", borderRadius: "7px", border: "1px solid #F1F5F9" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0F172A" }}>
                                    {p.title} {p.givenName} {p.surName}
                                </div>
                                {p.documentUrl && (
                                    <a
                                        href={p.documentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            fontSize: "0.7rem",
                                            color: "#2563EB",
                                            textDecoration: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "3px",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            background: "#EFF6FF",
                                            border: "1px solid #BFDBFE",
                                            fontWeight: 600,
                                        }}
                                    >
                                        <PaperClipIcon style={{ width: 10, height: 10 }} />
                                        Passport
                                    </a>
                                )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                                <span style={{ fontSize: "0.7rem", color: "#64748B" }}>{p.type}</span>
                                <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>•</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                    <IdentificationIcon style={{ width: 10, height: 10, color: "#94A3B8" }} />
                                    <span style={{ fontSize: "0.7rem", color: "#64748B" }}>{p.passport}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment History */}
            <div style={{ background: "white", borderRadius: "10px", padding: "14px 16px", border: "1px solid #E2E8F0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
                    <CreditCardIcon style={{ width: 15, height: 15, color: "#2563EB" }} />
                    <h3 style={{ margin: 0, fontSize: "0.84rem", fontWeight: 700, color: "#0F172A" }}>Payment History</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "7px", maxHeight: "210px", overflowY: "auto" }}>
                    {booking.paymentStatus.paymentHistory.length === 0 ? (
                        <p style={{ fontSize: "0.8rem", color: "#94A3B8", margin: 0 }}>No payments submitted yet.</p>
                    ) : (
                        booking.paymentStatus.paymentHistory.map((pay, i) => (
                            <div
                                key={pay._id || i}
                                onClick={() => onReviewPayment(booking._id, pay)}
                                style={{
                                    padding: "8px 11px",
                                    background: "#F8FAFC",
                                    borderRadius: "7px",
                                    border: "1px solid #F1F5F9",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "10px",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#EFF6FF";
                                    e.currentTarget.style.borderColor = "#BFDBFE";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#F8FAFC";
                                    e.currentTarget.style.borderColor = "#F1F5F9";
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <BanknotesIcon style={{ width: 11, height: 11, color: "#059669" }} />
                                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#059669" }}>
                                            PKR {pay.amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: "#64748B", marginTop: "2px" }}>
                                        {pay.method}{pay.receiptNumber ? ` · ${pay.receiptNumber}` : ""}
                                    </div>
                                    <div style={{ fontSize: "0.68rem", color: "#94A3B8", marginTop: "1px" }}>
                                        {new Date(pay.paymentDate).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                    {pay.paymentStatus === "Approved" && (
                                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#059669", background: "#F0FDF4", padding: "2px 8px", borderRadius: "4px", border: "1px solid #BBF7D0" }}>
                                            ✓ Approved
                                        </span>
                                    )}
                                    {pay.paymentStatus === "Pending" && (
                                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: "4px", border: "1px solid #BFDBFE" }}>
                                            ⏳ Pending Review
                                        </span>
                                    )}
                                    {pay.paymentStatus === "Received" && (
                                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#059669", background: "#F0FDF4", padding: "2px 8px", borderRadius: "4px", border: "1px solid #BBF7D0" }}>
                                            ✓ Received
                                        </span>
                                    )}
                                    {pay.paymentStatus === "Rejected" && (
                                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#DC2626", background: "#FFF1F2", padding: "2px 8px", borderRadius: "4px", border: "1px solid #FECDD3" }}>
                                            ✗ Rejected
                                        </span>
                                    )}
                                    {pay.receiptFile && (
                                        <a href={pay.receiptFile} target="_blank" rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "0.7rem", color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>
                                            <PaperClipIcon style={{ width: 11, height: 11 }} />
                                            View
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Status Update Modal (Side Panel) ────────────────────────────────────────
function StatusUpdateModal({ modalData, onClose, onSuccess }: {
    modalData: StatusModalData;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState<any>({});
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const typeConfig = {
        payment: { label: "Payment", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", Icon: CreditCardIcon },
        visa: { label: "Visa", color: "#7C3AED", bg: "#FAF5FF", border: "#E9D5FF", Icon: DocumentCheckIcon },
        hotel: { label: "Hotel", color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", Icon: BuildingStorefrontIcon },
        voucher: { label: "Voucher", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", Icon: TicketIcon },
    };
    const cfg = typeConfig[modalData.type];
    const { Icon: PanelIcon } = cfg;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            if (modalData.type === "payment") {
                if (!modalData.paymentId) {
                    toast.error("Payment ID is missing. Please close and try again.");
                    return;
                }
                data.append("paymentStatus", formData.paymentStatus);
                if (formData.paymentStatus === "Rejected") data.append("rejectionReason", formData.rejectionReason || "");
                if (file && formData.paymentStatus === "Approved") data.append("approvalProofFile", file);
                await reviewPayment(modalData.paymentId, data);
            } else if (modalData.type === "visa") {
                data.append("status", formData.status);
                data.append("applicationNumber", formData.applicationNumber || "");
                data.append("notes", formData.notes || "");
                if (formData.approvalDate) data.append("approvalDate", formData.approvalDate);
                if (file) data.append("approvalDocument", file);
                await updateVisaStatus(modalData.bookingId, data);
            } else if (modalData.type === "hotel") {
                data.append("status", formData.status);
                data.append("confirmationNumber", formData.confirmationNumber || "");
                data.append("notes", formData.notes || "");
                if (formData.bookingDate) data.append("bookingDate", formData.bookingDate);
                if (file) data.append("confirmationDocument", file);
                await updateHotelStatus(modalData.bookingId, data);
            }
            toast.success("Status updated successfully!");
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0,
                    background: "rgba(15,23,42,0.25)",
                    backdropFilter: "blur(3px)",
                    WebkitBackdropFilter: "blur(3px)",
                    zIndex: 999,
                }}
            />

            {/* Side Panel */}
            <div
                className="ub-panel"
                style={{
                    position: "fixed", top: 0, right: 0, bottom: 0,
                    width: "min(460px, 100vw)",
                    background: "white", zIndex: 1000,
                    display: "flex", flexDirection: "column",
                    boxShadow: "-12px 0 40px rgba(0,0,0,0.1)",
                }}
            >
                {/* Panel Header */}
                <div style={{
                    padding: "18px 22px",
                    borderBottom: "1px solid #F1F5F9",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: cfg.bg,
                    borderLeft: `4px solid ${cfg.color}`,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: "10px", background: cfg.color,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                            <PanelIcon style={{ width: 19, height: 19, color: "white" }} />
                        </div>
                        <div>
                            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A" }}>
                                Update {cfg.label} Status
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                                <HashtagIcon style={{ width: 11, height: 11, color: "#64748B" }} />
                                <span style={{ fontSize: "0.73rem", color: "#64748B", fontWeight: 500 }}>
                                    {modalData.booking.bookingNumber}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: "8px",
                            border: "1.5px solid #E2E8F0", background: "white",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#64748B", transition: "background 0.15s",
                        }}
                    >
                        <XMarkIcon style={{ width: 16, height: 16 }} />
                    </button>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}
                >
                    {modalData.type === "payment" && (
                        <PaymentForm formData={formData} setFormData={setFormData} file={file} setFile={setFile} booking={modalData.booking} modalData={modalData} />
                    )}
                    {modalData.type === "visa" && (
                        <VisaForm formData={formData} setFormData={setFormData} file={file} setFile={setFile} booking={modalData.booking} />
                    )}
                    {modalData.type === "hotel" && (
                        <HotelForm formData={formData} setFormData={setFormData} file={file} setFile={setFile} booking={modalData.booking} />
                    )}

                    {/* Footer */}
                    <div style={{ display: "flex", gap: "10px", paddingTop: "14px", borderTop: "1px solid #F1F5F9", marginTop: "auto" }}>
                        <button
                            type="button" onClick={onClose}
                            style={{
                                flex: 1, padding: "9px", background: "white",
                                color: "#374151", border: "1.5px solid #E2E8F0",
                                borderRadius: "9px", fontWeight: 600, fontSize: "0.855rem", cursor: "pointer",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit" disabled={loading}
                            style={{
                                flex: 2, padding: "9px",
                                background: loading ? "#94A3B8" : cfg.color,
                                color: "white", border: "none", borderRadius: "9px",
                                fontWeight: 700, fontSize: "0.855rem",
                                cursor: loading ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                            }}
                        >
                            {loading
                                ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "ub-spin 0.7s linear infinite" }} /> Updating...</>
                                : <><CheckCircleIcon style={{ width: 15, height: 15 }} /> Update {cfg.label}</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

// ── Form Field Wrapper ───────────────────────────────────────────────────────
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="ub-label">{label}</label>
            {children}
        </div>
    );
}

// ── Payment Form ─────────────────────────────────────────────────────────────
function PaymentForm({ formData, setFormData, file, setFile, modalData }: any) {
    const payment = modalData?.paymentData;

    if (!payment) {
        return (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748B" }}>
                <p>No payment selected for review.</p>
            </div>
        );
    }

    return (
        <>
            {/* Payment Details */}
            <div style={{ background: "#F0FDF4", borderRadius: "9px", padding: "13px 15px", border: "1px solid #BBF7D0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                    <BanknotesIcon style={{ width: 14, height: 14, color: "#059669" }} />
                    <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px" }}>Payment Details</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem", marginBottom: "12px" }}>
                    <div style={{ color: "#374151" }}>Amount: <strong>PKR {payment.amount.toLocaleString()}</strong></div>
                    <div style={{ color: "#374151" }}>Method: <strong>{payment.method}</strong></div>
                    <div style={{ color: "#374151" }}>Date: <strong>{new Date(payment.paymentDate).toLocaleDateString()}</strong></div>
                    {payment.receiptNumber && (
                        <div style={{ color: "#374151" }}>Receipt: <strong>{payment.receiptNumber}</strong></div>
                    )}
                </div>
                {payment.receiptFile && (
                    <div style={{ marginTop: "8px" }}>
                        <a
                            href={payment.receiptFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                fontSize: "0.75rem",
                                color: "#2563EB",
                                fontWeight: 600,
                                textDecoration: "none",
                                padding: "6px 12px",
                                background: "white",
                                border: "1px solid #BFDBFE",
                                borderRadius: "6px"
                            }}
                        >
                            <PaperClipIcon style={{ width: 14, height: 14 }} />
                            View Submitted Receipt
                        </a>
                    </div>
                )}
                {payment.notes && (
                    <div style={{ marginTop: "10px", padding: "8px", background: "white", borderRadius: "6px", fontSize: "0.75rem", color: "#64748B" }}>
                        <strong>Notes:</strong> {payment.notes}
                    </div>
                )}
            </div>

            {/* Current Status */}
            <div style={{ background: "#EFF6FF", borderRadius: "9px", padding: "13px 15px", border: "1px solid #BFDBFE" }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#1E40AF", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "6px" }}>
                    Current Status
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>
                    {payment.paymentStatus || "Pending"}
                </div>
                {payment.rejectionReason && (
                    <div style={{ marginTop: "8px", padding: "8px", background: "#FFF1F2", borderRadius: "6px", fontSize: "0.75rem", color: "#DC2626", border: "1px solid #FECDD3" }}>
                        <strong>Rejection Reason:</strong> {payment.rejectionReason}
                    </div>
                )}
            </div>

            {/* Review Form */}
            <FormField label="Update Payment Status *">
                <select
                    required
                    className="ub-input"
                    value={formData.paymentStatus || payment.paymentStatus || "Pending"}
                    onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
                >
                    <option value="Pending">Pending</option>
                    <option value="Received">Received (Add to paid amount)</option>
                    <option value="Approved">Approved (Add to paid amount)</option>
                    <option value="Rejected">Rejected</option>
                </select>
            </FormField>

            {formData.paymentStatus === "Rejected" && (
                <FormField label="Rejection Reason *">
                    <textarea
                        required
                        className="ub-input"
                        value={formData.rejectionReason || ""}
                        onChange={e => setFormData({ ...formData, rejectionReason: e.target.value })}
                        rows={4}
                        placeholder="Please provide a reason for rejecting this payment..."
                        style={{ resize: "vertical" }}
                    />
                </FormField>
            )}

            {(formData.paymentStatus === "Approved" || formData.paymentStatus === "Received") && (
                <FormField label="Upload Approval Proof (Optional)">
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="ub-input"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                    {file && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "5px" }}>
                            <PaperClipIcon style={{ width: 11, height: 11, color: "#64748B" }} />
                            <span style={{ fontSize: "0.7rem", color: "#64748B" }}>{file.name}</span>
                        </div>
                    )}
                    <p style={{ fontSize: "0.7rem", color: "#94A3B8", marginTop: "5px", marginBottom: 0 }}>
                        Upload a screenshot or document as proof of approval
                    </p>
                </FormField>
            )}


        </>
    );
}

// ── Visa Form ────────────────────────────────────────────────────────────────
function VisaForm({ formData, setFormData, file, setFile, booking }: any) {
    const visa = booking?.visaStatus;
    const hasExistingData = visa && (visa.applicationNumber || visa.approvalDate || visa.approvalDocument || visa.notes);

    return (
        <>
            {/* Existing Visa Details */}
            {hasExistingData && (
                <div style={{ background: "#FAF5FF", borderRadius: "9px", padding: "13px 15px", border: "1px solid #E9D5FF" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                        <DocumentCheckIcon style={{ width: 14, height: 14, color: "#7C3AED" }} />
                        <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#6B21A8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Current Visa Details</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem" }}>
                        <div style={{ color: "#374151" }}>Current Status: <strong>{visa.status}</strong></div>
                        {visa.applicationNumber && (
                            <div style={{ color: "#374151" }}>Application Number: <strong>{visa.applicationNumber}</strong></div>
                        )}
                        {visa.approvalDate && (
                            <div style={{ color: "#374151" }}>Approval Date: <strong>{new Date(visa.approvalDate).toLocaleDateString()}</strong></div>
                        )}
                        {visa.approvalDocument && (
                            <div style={{ marginTop: "4px" }}>
                                <a
                                    href={visa.approvalDocument}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        fontSize: "0.75rem",
                                        color: "#2563EB",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                        padding: "6px 12px",
                                        background: "white",
                                        border: "1px solid #BFDBFE",
                                        borderRadius: "6px"
                                    }}
                                >
                                    <PaperClipIcon style={{ width: 14, height: 14 }} />
                                    View Current Document
                                </a>
                            </div>
                        )}
                        {visa.notes && (
                            <div style={{ marginTop: "6px", padding: "8px", background: "white", borderRadius: "6px", fontSize: "0.75rem", color: "#64748B" }}>
                                <strong>Notes:</strong> {visa.notes}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <FormField label="Visa Status *">
                <select required className="ub-input" value={formData.status || visa?.status || ""} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="">Select status</option>
                    <option value="Not Applied">Not Applied</option>
                    <option value="Applied">Applied</option>
                    <option value="In Process">In Process</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                </select>
            </FormField>

            {/* Additional fields only show when status is "Approved" */}
            {(formData.status || visa?.status) === "Approved" && (
                <>
                    <FormField label="Application Number">
                        <input type="text" className="ub-input" value={formData.applicationNumber || ""} onChange={e => setFormData({ ...formData, applicationNumber: e.target.value })} placeholder="Enter application number" />
                    </FormField>
                    <FormField label="Approval Date">
                        <input type="date" className="ub-input" value={formData.approvalDate || ""} onChange={e => setFormData({ ...formData, approvalDate: e.target.value })} />
                    </FormField>
                    <FormField label="Upload Approval Document (PDF / Image)">
                        <input type="file" accept="image/*,application/pdf" className="ub-input" onChange={e => setFile(e.target.files?.[0] || null)} />
                        {file && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "5px" }}>
                                <PaperClipIcon style={{ width: 11, height: 11, color: "#64748B" }} />
                                <span style={{ fontSize: "0.7rem", color: "#64748B" }}>{file.name}</span>
                            </div>
                        )}
                    </FormField>
                    <FormField label="Notes">
                        <textarea className="ub-input" value={formData.notes || ""} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Additional notes..." style={{ resize: "vertical" }} />
                    </FormField>
                </>
            )}
        </>
    );
}

// ── Hotel Form ───────────────────────────────────────────────────────────────
function HotelForm({ formData, setFormData, file, setFile, booking }: any) {
    const hotel = booking?.hotelStatus;
    const hasExistingData = hotel && (hotel.confirmationNumber || hotel.bookingDate || hotel.confirmationDocument || hotel.notes);
    const selectedStatus = formData.status || hotel?.status || "";
    const showAdditionalFields = selectedStatus === "Confirmed";

    return (
        <>
            {/* Existing Hotel Details */}
            {hasExistingData && (
                <div style={{ background: "#F0FDF4", borderRadius: "9px", padding: "13px 15px", border: "1px solid #BBF7D0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                        <BuildingStorefrontIcon style={{ width: 14, height: 14, color: "#059669" }} />
                        <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.4px" }}>Current Hotel Details</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem" }}>
                        <div style={{ color: "#374151" }}>Current Status: <strong>{hotel.status}</strong></div>
                        {hotel.confirmationNumber && (
                            <div style={{ color: "#374151" }}>Confirmation Number: <strong>{hotel.confirmationNumber}</strong></div>
                        )}
                        {hotel.bookingDate && (
                            <div style={{ color: "#374151" }}>Booking Date: <strong>{new Date(hotel.bookingDate).toLocaleDateString()}</strong></div>
                        )}
                        {hotel.confirmationDocument && (
                            <div style={{ marginTop: "4px" }}>
                                <a
                                    href={hotel.confirmationDocument}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        fontSize: "0.75rem",
                                        color: "#2563EB",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                        padding: "6px 12px",
                                        background: "white",
                                        border: "1px solid #BFDBFE",
                                        borderRadius: "6px"
                                    }}
                                >
                                    <PaperClipIcon style={{ width: 14, height: 14 }} />
                                    View Current Document
                                </a>
                            </div>
                        )}
                        {hotel.notes && (
                            <div style={{ marginTop: "6px", padding: "8px", background: "white", borderRadius: "6px", fontSize: "0.75rem", color: "#64748B" }}>
                                <strong>Notes:</strong> {hotel.notes}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <FormField label="Hotel Status *">
                <select required className="ub-input" value={selectedStatus} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="">Select status</option>
                    <option value="Not Booked">Not Booked</option>
                    <option value="Booked">Booked</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </FormField>

            {/* Additional fields only show when status is "Confirmed" */}
            {showAdditionalFields && (
                <>
                    <FormField label="Confirmation Number">
                        <input type="text" className="ub-input" value={formData.confirmationNumber || ""} onChange={e => setFormData({ ...formData, confirmationNumber: e.target.value })} placeholder="Enter confirmation number" />
                    </FormField>
                    <FormField label="Booking Date">
                        <input type="date" className="ub-input" value={formData.bookingDate || ""} onChange={e => setFormData({ ...formData, bookingDate: e.target.value })} />
                    </FormField>
                    <FormField label="Upload Confirmation Document (PDF / Image)">
                        <input type="file" accept="image/*,application/pdf" className="ub-input" onChange={e => setFile(e.target.files?.[0] || null)} />
                        {file && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "5px" }}>
                                <PaperClipIcon style={{ width: 11, height: 11, color: "#64748B" }} />
                                <span style={{ fontSize: "0.7rem", color: "#64748B" }}>{file.name}</span>
                            </div>
                        )}
                    </FormField>
                    <FormField label="Notes">
                        <textarea className="ub-input" value={formData.notes || ""} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Additional notes..." style={{ resize: "vertical" }} />
                    </FormField>
                </>
            )}
        </>
    );
}