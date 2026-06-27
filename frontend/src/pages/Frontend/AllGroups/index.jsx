import React, { useEffect, useState, useContext } from "react";
import { DashboardUIContext } from "../../../components/Dashboard/DashboardLayout";
import { Menu, X } from "lucide-react";
import { FaPlaneDeparture, FaPlaneArrival, FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import MaskedDatePicker from "../../../components/MaskedDatePicker";
import { theme } from "../../../theme/theme";
import TopBar from "../../../components/TopBar/TopBar";

export default function AllGroups({ headerType, header, searchParams, user }) {
  const dashboardUI = useContext(DashboardUIContext);
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    sectors: [],
    airlines: [],
    searchKeyword: "",
    departDate: null,
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [airlines, setAirlines] = useState([]);
  const [sectors, setSectors] = useState([]);
  useEffect(() => {
    if (dashboardUI) setShowAdvancedSearch(true);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchGroups();
  }, [searchParams]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/zip-accounts/umrahPackages");
      let fetchedGroups = res.data?.data || [];

      console.log(fetchedGroups);
      if (fetchedGroups.length === 0) {
        toast.info("No Umrah packages available at the moment");
        setAirlines([]);
        setSectors([]);
        setGroups([]);
        return;
      }

      const formattedGroups = fetchedGroups.map((pkg) => {
        const sectorParts = pkg.sector?.split("-") || [];
        const origin = sectorParts[0] || "";
        const destination = sectorParts[sectorParts.length - 1] || "";
        const airlineName = pkg.flightLogo?.fileName
          ? "Airline"
          : "Unknown Airline";
        const roomPrices = pkg.roomTypes || {};
        const minPrice = Math.min(
          roomPrices.sharing || Infinity,
          roomPrices.quint || Infinity,
          roomPrices.quad || Infinity,
          roomPrices.triple || Infinity,
          roomPrices.double || Infinity,
        );

        return {
          id: pkg._id,
          _id: pkg._id,
          voucher_id: pkg.flightNumber || pkg.documentNumber,
          type: "umrahPackage",
          packageSource: "zip-accounts",
          zipPackageId: pkg._id,
          sector: pkg.sector || "",
          airline: {
            airline_name: airlineName,
            logo_url: pkg.flightLogo?.fileName
              ? `/api/files/${pkg.flightLogo.fileName}`
              : null,
          },
          airlineName: airlineName,
          dept_date: pkg.departureDate || pkg.createdAt,
          flight_date: pkg.departureDate || pkg.createdAt,
          flights: pkg.flights || [],
          transports: pkg.transports || [],
          details: [
            {
              flight_no: pkg.flightNumber || "",
              origin,
              destination,
              dep_date: pkg.departureDate || pkg.createdAt,
              flight_date: pkg.departureDate || pkg.createdAt,
              dep_time: pkg.departureDate
                ? new Date(pkg.departureDate).toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
              arv_time: pkg.arrivalDate
                ? new Date(pkg.arrivalDate).toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
            },
          ],
          returnDate: pkg.arrivalDate || "",
          returnFlight: pkg.flightNumber || "",
          hotels: (pkg.hotels || []).map((h) => ({
            _id: h.hotelId,
            name: h.hotelName,
            city: h.city,
            location: {
              city: h.city,
              distance: h.distance?.toString() || "0",
              shuttleType: "Shuttle",
            },
            rating: h.rating,
            googleMapsUrl: h.googleMapsUrl,
          })),
          rooms: roomPrices,
          availableRooms: pkg.availableSeats || 0,
          price: minPrice !== Infinity ? minPrice : 0,
          packageName: pkg.packageName || "Umrah Package",
          refNumber: pkg.documentNumber || "",
          packageDuration: pkg.packageDuration,
          totalRooms: pkg.totalRooms,
          publish: pkg.publish,
          featured: pkg.featured,
          img: pkg.logo?.fileName
            ? `/api/files/${pkg.logo.fileName}`
            : "https://matchlesstravels.com/ht/images/7abe905adf02c849f94a5bab1953a92f.jpg",
          metadata: {
            packageName: pkg.packageName,
            flightNumber: pkg.flightNumber,
            departureDate: pkg.departureDate,
            arrivalDate: pkg.arrivalDate,
            packageDuration: pkg.packageDuration,
            totalPrice: minPrice !== Infinity ? minPrice : 0,
            availableRooms: pkg.availableSeats,
            roomPrices: roomPrices,
            hotels: pkg.hotels,
            flights: pkg.flights || [],
            transports: pkg.transports || [],
            flightDetails: {
              origin,
              destination,
              departureTime: pkg.departureDate
                ? new Date(pkg.departureDate).toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
              arrivalTime: pkg.arrivalDate
                ? new Date(pkg.arrivalDate).toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
            },
          },
        };
      });

      setAirlines(
        [
          ...new Set(
            formattedGroups.map((g) => g.airline?.airline_name).filter(Boolean),
          ),
        ].sort(),
      );
      setSectors(
        [
          ...new Set(
            formattedGroups
              .map((g) => (g.sector || "").toUpperCase().trim())
              .filter(Boolean),
          ),
        ].sort(),
      );
      setGroups(formattedGroups);
    } catch (err) {
      console.error("Error fetching groups:", err);
      toast.error("Failed to load Umrah packages. Please try again.");
      setAirlines([]);
      setSectors([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === "sector") {
      setFilters((prev) => ({
        ...prev,
        sectors: prev.sectors.includes(value)
          ? prev.sectors.filter((s) => s !== value)
          : [...prev.sectors, value],
      }));
    } else if (filterType === "airline") {
      setFilters((prev) => ({
        ...prev,
        airlines: prev.airlines.includes(value)
          ? prev.airlines.filter((a) => a !== value)
          : [...prev.airlines, value],
      }));
    } else {
      setFilters((prev) => ({ ...prev, [filterType]: value }));
    }
  };

  const filteredGroups = groups.filter((g) => {
    const airlineName = g.airline?.airline_name || g.airlineName || "";
    const sector = (g.sector || "").toUpperCase().trim();
    const keyword = filters.searchKeyword.toLowerCase();
    if (filters.airlines.length && !filters.airlines.includes(airlineName))
      return false;
    if (filters.sectors.length && !filters.sectors.includes(sector))
      return false;
    if (
      keyword &&
      !`${airlineName} ${sector} ${g.voucher_id || ""} ${g.packageName || ""}`
        .toLowerCase()
        .includes(keyword)
    )
      return false;
    if (filters.departDate) {
      const depDate = new Date(g.dept_date || g.metadata?.departureDate || "");
      const filterDate = new Date(filters.departDate);
      if (
        depDate.getFullYear() !== filterDate.getFullYear() ||
        depDate.getMonth() !== filterDate.getMonth() ||
        depDate.getDate() !== filterDate.getDate()
      )
        return false;
    }
    return true;
  });

  const FilterContent = () => (
    <>
      <h3 className="font-bold text-base mb-4 text-gray-900">Airlines</h3>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
        {airlines.map((airline) => (
          <label
            key={airline}
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-3 py-2.5 rounded-xl transition-colors group"
          >
            <input
              type="checkbox"
              checked={filters.airlines.includes(airline)}
              onChange={() => handleFilterChange("airline", airline)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">
              {airline}
            </span>
          </label>
        ))}
      </div>
      <div className="h-px bg-gray-200 my-6" />
      <h3 className="font-bold text-base mb-4 text-gray-900">Sectors</h3>
      <div className="space-y-1 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
        {sectors.map((sector) => (
          <label
            key={sector}
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-3 py-2.5 rounded-xl transition-colors group"
          >
            <input
              type="checkbox"
              checked={filters.sectors.includes(sector)}
              onChange={() => handleFilterChange("sector", sector)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">
              {sector}
            </span>
          </label>
        ))}
      </div>
    </>
  );

  const UmrahPackageCard = ({ group }) => {
    const flight = group.details?.[0] || group.metadata?.flightDetails || {};
    const metadata = group.metadata || {};
    const hotels = group.hotels || group.metadata?.hotels || [];
    const rooms = group.rooms || group.metadata?.roomPrices || {};
    const availableRooms =
      group.availableRooms || group.metadata?.availableRooms || "";
    const depRaw = flight.dep_date || group.dept_date || metadata.departureDate;
    const depDate = depRaw ? new Date(depRaw) : null;
    const depStr =
      depDate && !isNaN(depDate)
        ? depDate.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";
    const depTime =
      flight.dep_time ||
      (metadata.flightDetails?.departureTime || "").slice(0, 5) ||
      "";
    const retRaw = group.returnDate || metadata.returnDate || "";
    const retDate = retRaw ? new Date(retRaw) : null;
    const retStr =
      retDate && !isNaN(retDate)
        ? retDate.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";
    const retTime =
      group.returnTime ||
      flight.arv_time ||
      (metadata.flightDetails?.arrivalTime || "").slice(0, 5) ||
      "";
    const flightNo =
      flight.flight_no || metadata.flightNumber || group.voucher_id || "";
    const logoUrl = group.airline?.logo_url || null;
    const airlineName = group.airline?.airline_name || group.airlineName || "";
    const sectorLabel =
      group.sector ||
      (flight.origin && flight.destination
        ? `${flight.origin}-${flight.destination}`
        : "") ||
      "";
    const packageLabel =
      group.packageName || metadata.packageName || "Umrah Package";
    const refNo = group.refNumber || metadata.refNumber || "";

    const getRoomTypeLabel = (type) =>
      ({
        sharing: "Sharing",
        quad: "Quad",
        triple: "Triple",
        double: "Double",
      })[type] || type.charAt(0).toUpperCase() + type.slice(1);
    const formatPrice = (price) =>
      !price ? "—" : `PKR ${Number(price).toLocaleString()}`;

    return (
      <div
        className="group bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] transition-all duration-300 hover:-translate-y-1"
        style={{
          boxShadow:
            "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.boxShadow =
            "0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -2px rgba(0, 0, 0, 0.04)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.boxShadow =
            "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.03)")
        }
      >
        {/* Header */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{
            background: theme.colors.primary,
          }}
        >
          <div>
            <h2 className="text-white font-bold text-sm tracking-tight leading-tight">
              {packageLabel}
            </h2>
            {refNo && (
              <p className="text-white/80 text-xs mt-0.5 font-medium">
                Ref: {refNo}
              </p>
            )}
          </div>
          {availableRooms !== "" && (
            <div className="text-right">
              <p className="text-white/80 text-xs font-medium">
                Available Seats
              </p>
              <p className="text-white font-bold text-lg">{availableRooms}</p>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Flight Details - 4 columns */}
            <div className="lg:col-span-4">
              <div className="flex items-start gap-3">
                {/* Airline Logo */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-14 h-14 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                    <img
                      src={
                        logoUrl ||
                        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=200&h=200&fit=crop"
                      }
                      alt={airlineName || "Airline"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src =
                          "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=200&h=200&fit=crop";
                      }}
                    />
                  </div>
                  {flightNo && (
                    <div className="bg-gray-100 w-10 text-center p-1 mt-4 rounded-xl">
                      <span className="mt-3 font-small font-mono">
                        {flightNo}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className="font-bold text-base mb-0.5 leading-tight"
                    style={{ color: "#D2691E" }}
                  >
                    {sectorLabel || "Flight Details"}
                  </h3>
                  {airlineName && (
                    <p
                      className="text-xs mb-3 font-medium"
                      style={{ color: "#696969" }}
                    >
                      {airlineName}
                    </p>
                  )}

                  {/* Departure */}
                  {depStr && (
                    <div className="flex items-start gap-2 mb-2">
                      <FaPlaneDeparture
                        className="shrink-0 mt-0.5"
                        style={{ color: "#1e90ff" }}
                        size={14}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug">
                          <span style={{ color: "#4682B4" }}>{depStr}</span>
                          {depTime && (
                            <span className="text-black ml-1">{depTime}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Return */}
                  {retStr && (
                    <div className="flex items-start gap-2">
                      <FaPlaneArrival
                        className="shrink-0 mt-0.5"
                        style={{ color: "#1e90ff" }}
                        size={14}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug">
                          <span style={{ color: "#4682B4" }}>{retStr}</span>
                          {retTime && (
                            <span className="text-black ml-1">{retTime}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hotels - 4 columns */}
            <div className="lg:col-span-4">
              <h4
                className="text-sm font-bold uppercase tracking-wide mb-2"
                style={{ color: "#FF8C42" }}
              >
                HOTELS
              </h4>
              {hotels.length > 0 ? (
                <div className="space-y-1">
                  {hotels.map((hotel, i) => {
                    const city = hotel.location?.city || hotel.city || "";
                    const cityAbbr =
                      city.toLowerCase().includes("mak") ||
                      city.toLowerCase().includes("mec") ||
                      city.toLowerCase().includes("makkah")
                        ? "Mak"
                        : city.toLowerCase().includes("mad") ||
                            city.toLowerCase().includes("med") ||
                            city.toLowerCase().includes("madinah")
                          ? "Med"
                          : city.slice(0, 3);

                    const hotelName = hotel.name || hotel.hotelName || "";
                    const shuttle =
                      hotel.location?.shuttleType || hotel.shuttle || "";

                    // Different colors for Makkah and Madinah
                    const cityColor =
                      cityAbbr === "Mak"
                        ? "#228B22"
                        : cityAbbr === "Med"
                          ? "#4169E1"
                          : "#666";
                    const hotelColor =
                      cityAbbr === "Mak"
                        ? "#2F4F2F"
                        : cityAbbr === "Med"
                          ? "#1E3A8A"
                          : "#444";

                    return (
                      <div key={hotel._id || i} className="text-xs">
                        <span
                          className="font-bold"
                          style={{ color: cityColor }}
                        >
                          {cityAbbr}:
                        </span>{" "}
                        <span
                          style={{ color: hotelColor }}
                          className="font-medium"
                        >
                          {hotelName}
                        </span>
                        {shuttle && (
                          <span className="text-gray-600"> ({shuttle})</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No hotels listed</p>
              )}
            </div>

            {/* Room Pricing - 4 columns */}
            <div className="lg:col-span-4">
              {/* <h4
                className="text-sm font-bold uppercase tracking-wide mb-2"
                style={{ color: "#FF8C42" }}
              >
                Room Pricing
              </h4> */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {["sharing", "quint", "quad", "triple", "double"].map(
                  (type) => {
                    const price = rooms?.[type];
                    const isAvailable = price && price !== "" && price > 0;

                    const bgColors = {
                      sharing: isAvailable
                        ? "linear-gradient(135deg, #E3F2FD 0%, #E1F5FE 100%)"
                        : "#F5F5F5",
                      quint: isAvailable
                        ? "linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)"
                        : "#F5F5F5",
                      quad: isAvailable
                        ? "linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%)"
                        : "#F5F5F5",
                      triple: isAvailable
                        ? "linear-gradient(135deg, #F3E5F5 0%, #FCE4EC 100%)"
                        : "#F5F5F5",
                      double: isAvailable
                        ? "linear-gradient(135deg, #FFF3E0 0%, #FFF8E1 100%)"
                        : "#F5F5F5",
                    };

                    return (
                      <div
                        key={type}
                        className="text-center py-2 px-1.5 rounded-lg border transition-all"
                        style={{
                          background: bgColors[type],
                          borderColor: isAvailable ? "#E0E0E0" : "#F0F0F0",
                          boxShadow: isAvailable
                            ? "0 1px 3px rgba(0,0,0,0.05)"
                            : "none",
                        }}
                      >
                        <p className="text-[10px] font-semibold text-gray-600 uppercase mb-0.5 leading-tight">
                          {getRoomTypeLabel(type)}
                        </p>
                        <p
                          className={`text-[11px] font-bold ${
                            isAvailable ? "text-gray-900" : "text-gray-300"
                          }`}
                        >
                          {isAvailable ? formatPrice(price) : "—"}
                        </p>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>

          {/* View Details Button */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() =>
                navigate("/dashboard/pkg-detail", { state: { group } })
              }
              className="ms-auto px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: theme.colors.primary,
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)",
              }}
              onMouseEnter={(e) =>
                (e.target.style.boxShadow =
                  "0 4px 12px rgba(59, 130, 246, 0.35)")
              }
              onMouseLeave={(e) =>
                (e.target.style.boxShadow =
                  "0 2px 8px rgba(59, 130, 246, 0.25)")
              }
            >
              View Details & Book
            </button>
          </div>
        </div>
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-5 border border-gray-100"
          style={{ boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)" }}
        >
          <div className="animate-pulse">
            <div className="h-4 bg-linear-to-r from-gray-200 to-gray-100 rounded-lg mb-4 w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-4">
                <div className="h-3 bg-linear-to-r from-gray-200 to-gray-100 rounded mb-2 w-3/4" />
                <div className="h-3 bg-linear-to-r from-gray-100 to-gray-50 rounded mb-2 w-1/2" />
                <div className="h-3 bg-linear-to-r from-gray-100 to-gray-50 rounded w-2/3" />
              </div>
              <div className="lg:col-span-4">
                <div className="h-3 bg-linear-to-r from-gray-200 to-gray-100 rounded mb-2 w-2/3" />
                <div className="h-3 bg-linear-to-r from-gray-100 to-gray-50 rounded mb-2 w-3/4" />
                <div className="h-3 bg-linear-to-r from-gray-100 to-gray-50 rounded w-1/2" />
              </div>
              <div className="lg:col-span-4">
                <div className="h-8 bg-linear-to-r from-gray-100 to-gray-50 rounded-lg mb-3" />
                <div className="h-10 bg-linear-to-r from-blue-100 to-blue-50 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <TopBar title={"Umrah Packages"} />
      <div
        className="w-full min-h-screen"
        style={{
          background: "#F9FAFB",
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 py-2 ${headerType === "dashboard" ? "rounded-t-2xl" : ""}`}
        >
          <div className="w-full xl:w-auto">{header}</div>
          <div className="flex flex-col lg:flex-row items-center gap-2 w-full xl:w-auto">
            <div className="flex items-center justify-between w-full lg:w-auto gap-3">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showAdvancedSearch}
                    onChange={(e) => setShowAdvancedSearch(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-9 h-5 rounded-full transition-all"
                    style={{
                      background: showAdvancedSearch
                        ? theme.colors.ublGradient
                        : "#d1d5db",
                    }}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${showAdvancedSearch ? "translate-x-4" : ""}`}
                    />
                  </div>
                </div>
                <span className="ml-2 text-xs font-medium text-gray-700 whitespace-nowrap">
                  Advanced Search
                </span>
              </label>
              {showAdvancedSearch && (
                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden p-1.5 rounded-lg bg-gray-100 text-gray-700"
                >
                  <Menu size={16} />
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="w-full sm:w-48">
                <MaskedDatePicker
                  value={filters.departDate}
                  onChange={(date) => handleFilterChange("departDate", date)}
                  placeholderText="Departure Date"
                  minDate={new Date()}
                  size="small"
                />
              </div>
              <div className="flex-1 lg:w-52 relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={filters.searchKeyword}
                  onChange={(e) =>
                    handleFilterChange("searchKeyword", e.target.value)
                  }
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 text-xs"
                />
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
            </div>
          </div>
        </div>
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-80 bg-white p-6 shadow-xl animate-in slide-in-from-right">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Filters</h2>
                <button onClick={() => setIsMobileFilterOpen(false)}>
                  <X />
                </button>
              </div>
              <FilterContent />
            </div>
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-4 pt-3 pb-6">
          {showAdvancedSearch && (
            <div className="hidden lg:block w-64 shrink-0">
              <div
                className="bg-white rounded-2xl p-6 sticky top-6 border border-gray-100"
                style={{ boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)" }}
              >
                <FilterContent />
              </div>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="bg-white rounded-3xl shadow-sm p-8">
                <LoadingSkeleton />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div
                className="bg-white rounded-2xl p-12 text-center border border-gray-100"
                style={{ boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)" }}
              >
                <div className="text-6xl mb-4">✈️</div>
                <p className="text-gray-400 text-base">
                  No packages available at the moment
                </p>
                <p className="text-gray-300 text-sm mt-2">
                  Please check back later or adjust your filters
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map((group, idx) => (
                  <UmrahPackageCard
                    theme={theme}
                    key={group.id || group._id || idx}
                    group={group}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
