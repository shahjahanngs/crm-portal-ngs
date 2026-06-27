import React, { useEffect, useState, useContext } from "react";
import { DashboardUIContext } from "../../../components/Dashboard/DashboardLayout";
import { Menu, X, Package } from "lucide-react";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import MaskedDatePicker from "../../../components/MaskedDatePicker";
import { theme } from "../../../theme/theme";
import TopBar from "../../../components/TopBar/TopBar";
import airlineData from "../../../data/Airlines";

const staticAirlineCodeMap = {};
airlineData.forEach((a) => {
  if (a.airline && a.shortcode) {
    staticAirlineCodeMap[a.airline.toLowerCase().trim()] = a.shortcode;
  }
});

const airlineLogoOverrides = {
  "air sial": "https://www.airsial.com/front/images/logo.png",
};

const MONTHS_TITLE = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

const ROOM_CAPACITY = {
  sharing: 1,
  double: 2,
  triple: 3,
  quad: 4,
  quint: 5,
  hexa: 6,
};

const isRoomRateAvailable = (roomKey, roomsMap = {}, availableSeats) => {
  const rate = Number(roomsMap[roomKey]);
  if (!Number.isFinite(rate) || rate <= 0) return false;

  if (
    availableSeats === null ||
    availableSeats === undefined ||
    availableSeats === ""
  ) {
    return true;
  }

  const seats = Number(availableSeats);
  if (!Number.isFinite(seats)) return true;

  return seats >= (ROOM_CAPACITY[roomKey] || 1);
};

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
    duration: "all",
    months: [],
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [airlines, setAirlines] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [durations, setDurations] = useState([]);
  const [months, setMonths] = useState([]);

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
      const [res, seatsRes, groupTicketingRes, airlinesRes] = await Promise.all([
        axiosInstance.get("/zip-accounts/umrahPackages"),
        axiosInstance.get("/zip-accounts/umrahPackages/remaining-seats").catch(() => ({ data: { data: [] } })),
        axiosInstance.get("/zip-accounts/group-ticketing").catch(() => ({ data: { data: [] } })),
        axiosInstance.get("/airlines").catch(() => ({ data: { data: [] } })),
      ]);
      let fetchedGroups = res.data?.data || [];
      const packageRemainingSeatsMap = buildRemainingSeatsMap(seatsRes.data?.data || []);
      const groupTicketingRemainingSeatsMap = buildRemainingSeatsMap(groupTicketingRes.data?.data || []);
      const airlineLogoMap = {};
      const airlineCodeMap = {};
      (airlinesRes.data?.data || []).forEach((a) => {
        const key = (a.airlineName || "").toLowerCase().trim();
        if (key && a.logo) airlineLogoMap[key] = a.logo;
        if (key && a.shortCode) airlineCodeMap[key] = a.shortCode;
      });

      if (fetchedGroups.length === 0) {
        toast.info("No Umrah packages available at the moment");
        setAirlines([]);
        setSectors([]);
        setGroups([]);
        return;
      }

      const formattedGroups = fetchedGroups.map((pkg) => {
        // Extract flights - handle both cases
        let flights = pkg.flights || [];

        // If flights array is empty but we have flightNumber and sector at root
        if (flights.length === 0 && pkg.flightNumber && pkg.sector) {
          flights = [
            {
              flightNumber: pkg.flightNumber,
              sector: pkg.sector,
              departureDate: pkg.departureDate,
              arrivalDate: pkg.arrivalDate,
              fromTerminal: pkg.fromTerminal || "",
              toTerminal: pkg.toTerminal || "",
              flightClass: pkg.flightClass || "",
              baggage: pkg.baggage || "",
              meal: pkg.meal || "",
            },
          ];
        }

        const firstFlight = flights[0] || {};
        const lastFlight = flights[flights.length - 1] || {};

        // Build full sector path from all flights (e.g. ISB-JED-ISB)
        const sectorPoints = [];
        (flights || []).forEach((flight) => {
          const rawSector = (flight?.sector || "").trim();
          if (!rawSector) return;

          const [fromRaw, toRaw] = rawSector.split("-");
          const from = (fromRaw || "").trim().toUpperCase();
          const to = (toRaw || "").trim().toUpperCase();

          if (from && sectorPoints[sectorPoints.length - 1] !== from) {
            sectorPoints.push(from);
          }
          if (to && sectorPoints[sectorPoints.length - 1] !== to) {
            sectorPoints.push(to);
          }
        });

        const fallbackSector = (firstFlight.sector || pkg.sector || "")
          .split("-")
          .map((part) => part.trim().toUpperCase())
          .filter(Boolean)
          .join("-");

        const sector =
          sectorPoints.length > 1 ? sectorPoints.join("-") : fallbackSector;
        const sectorParts = sector.split("-");
        const origin = sectorParts[0] || "";
        const destination = sectorParts[sectorParts.length - 1] || "";

        // Airline name
        const airlineName = pkg.airline || "Unknown Airline";

        // Dates
        const departureDateRaw =
          pkg.packageDepartureDate ||
          firstFlight.departureDate ||
          pkg.departureDate ||
          "";
        const arrivalDateRaw =
          pkg.packageArrivalDate ||
          lastFlight.arrivalDate ||
          pkg.arrivalDate ||
          "";

        // Format time from date string
        const extractTime = (dateStr) => {
          if (!dateStr) return "";
          if (dateStr.includes(" ")) {
            const timePart = dateStr.split(" ")[1];
            return timePart ? timePart.slice(0, 5) : "";
          }
          return "";
        };

        const depTime = extractTime(firstFlight.departureDate);
        const arvTime = extractTime(lastFlight.arrivalDate);
        const flightNumber =
          firstFlight.flightNumber ||
          pkg.flightNumber ||
          pkg.documentNumber ||
          "";

        // Get room prices - from roomTypes object
        // Helper to get price from roomTypes or from hotel rooms
        // Build a lookup: roomTypeId -> price from roomTypes object
        const roomTypePrices = pkg.roomTypes || {};

        // Build a lookup: roomTypeId -> room metadata from ALL hotels' rooms arrays
        const idToRoomInfo = {};
        (pkg.hotels || []).forEach((hotel) => {
          (hotel.rooms || []).forEach((room) => {
            if (room.roomTypeId && room.name) {
              idToRoomInfo[room.roomTypeId] = {
                name: room.name.toLowerCase().trim(),
                available: room.available,
              };
            }
          });
        });

        // Now map: normalized available room name -> selling price
        const roomNameToPrice = {};
        Object.entries(roomTypePrices).forEach(([id, price]) => {
          const roomInfo = idToRoomInfo[id];
          if (roomInfo?.name && roomInfo.available !== false && price > 0) {
            roomNameToPrice[roomInfo.name] = price;
          }
        });

        const rooms = {
          sharing: roomNameToPrice["sharing"] || 0,
          quint: roomNameToPrice["quint"] || 0,
          quad: roomNameToPrice["quad"] || 0,
          triple: roomNameToPrice["triple"] || 0,
          double: roomNameToPrice["double"] || 0,
          hexa: roomNameToPrice["hexa"] || 0,
          childWithoutPackage: pkg.childPrice,
          InfantWithoutPackage: pkg.infantPrice,
        };

        // Hotels data - identify Makkah and Madinah
        const hotels = (pkg.hotels || []).map((h) => ({
          _id: h.hotelId,
          name: h.hotelName,
          city: h.city || "",
          location: {
            city: h.city || "",
            distance: h.distance?.toString() || "0",
            shuttleType: "Shuttle",
          },
          distance: h.distance,
          nightCount: h.nights || 0,
          rating: h.rating,
          googleMapsUrl: h.googleMapsUrl,
          rooms: h.rooms || [],
        }));

        // Find Makkah and Madinah hotels
        const makkahHotel = hotels.find(
          (h) =>
            /mak|mec|makkah/i.test(h.city || "") ||
            h.city?.toLowerCase() === "makkah",
        );
        const madinahHotel = hotels.find(
          (h) =>
            /mad|med|madinah|medina/i.test(h.city || "") ||
            h.city?.toLowerCase() === "madina",
        );

        // Calculate min price for display
        const roomValues = Object.values(rooms).filter((v) => v > 0);
        const minPrice = roomValues.length > 0 ? Math.min(...roomValues) : 0;

        // Logo URL
        const logoUrl = pkg.flightLogo?.fileName
          ? `/api/files/${pkg.flightLogo.fileName}`
          : pkg.logo?.fileName
            ? `/api/files/${pkg.logo.fileName}`
            : airlineLogoMap[airlineName.toLowerCase().trim()] || null;
        const packageId = normalizeSeatId(pkg._id);
        const groupTicketingId = normalizeSeatId(pkg.groupTicketingId);
        const linkedGroupRemainingSeats = groupTicketingId
          ? groupTicketingRemainingSeatsMap[groupTicketingId]
          : undefined;
        const availableSeats =
          linkedGroupRemainingSeats ??
          packageRemainingSeatsMap[packageId] ??
          packageRemainingSeatsMap[groupTicketingId] ??
          pkg.availableSeats ??
          null;

        return {
          id: pkg._id,
          _id: pkg._id,
          specialInstructions: pkg.specialInstructions || "",
          groupName: pkg.groupName || pkg.airline || "",
          ticketSupplier: pkg.ticketSupplier || "",
          groupTicketingId,
          originalVoucher: pkg,
          voucher_id: pkg.documentNumber || flightNumber,
          type: "umrahPackage",
          packageSource: "zip-accounts",
          zipPackageId: pkg._id,
          sector,
          airline: {
            airline_name: airlineName,
            logo_url: logoUrl,
          },
          airlineName,
          airlineCode: airlineCodeMap[airlineName.toLowerCase().trim()] || staticAirlineCodeMap[airlineName.toLowerCase().trim()] || pkg.airlineCode || "",
          dept_date: departureDateRaw,
          flight_date: departureDateRaw,
          flights: flights.map((f) => ({
            ...f,
            flightNo: f.flightNumber,
            depDate: f.departureDate,
            arrDate: f.arrivalDate,
            depTime: extractTime(f.departureDate),
            arrTime: extractTime(f.arrivalDate),
            sectorFrom: f.sector?.split("-")[0] || "",
            sectorTo: f.sector?.split("-")[1] || "",
            baggage: f.baggage,
            meal: f.meal,
          })),
          details: [
            {
              flight_no: flightNumber,
              origin,
              destination,
              dep_date: departureDateRaw,
              flight_date: departureDateRaw,
              dep_time: depTime,
              arv_time: arvTime,
            },
          ],
          returnDate: arrivalDateRaw,
          returnFlight: flightNumber,
          hotels,
          makkahHotel,
          madinahHotel,
          rooms,
          availableRooms: availableSeats,
          remainingSeats: availableSeats,
          price: minPrice,
          packageName: pkg.packageName || "Umrah Package",
          refNumber: pkg.documentNumber || "",
          packageDuration: pkg.packageDuration,
          totalRooms: pkg.totalRooms,
          infantPrice: pkg.infantPrice || 0,
          childPrice: pkg.childPrice || 0,
          publish: pkg.publish,
          featured: pkg.featured,
          img:
            logoUrl ||
            "https://matchlesstravels.com/ht/images/7abe905adf02c849f94a5bab1953a92f.jpg",
        };
      });

      // Filter out packages with no valid rooms/prices? Keep all for now
      const validGroups = formattedGroups.filter((g) => g.packageName);

      // Extract unique airlines and sectors for filters
      const uniqueAirlines = [
        ...new Set(validGroups.map((g) => g.airlineName).filter(Boolean)),
      ].sort();
      const uniqueSectors = [
        ...new Set(validGroups.map((g) => g.sector).filter(Boolean)),
      ].sort();
      const uniqueDurations = [
        ...new Set(
          validGroups
            .map((g) => Number(g.packageDuration))
            .filter((value) => Number.isFinite(value)),
        ),
      ].sort((a, b) => a - b);

    
      setAirlines(uniqueAirlines);
      setSectors(uniqueSectors);
      setDurations(uniqueDurations);
      setGroups(validGroups);
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
    } else if (filterType === "months") {
      setFilters((prev) => ({
        ...prev,
        months: prev.months.includes(value)
          ? prev.months.filter((m) => m !== value)
          : [...prev.months, value],
      }));
    } else {
      setFilters((prev) => ({ ...prev, [filterType]: value }));
    }
  };

  const filteredGroups = groups.filter((g) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Hide sold-out packages entirely; keep null/undefined as unknown availability.
    if (
      g.availableRooms !== null &&
      g.availableRooms !== undefined &&
      Number(g.availableRooms) <= 0
    ) {
      return false;
    }

    // Hide packages whose departure date has already passed.
    if (g.dept_date) {
      const departureDate = new Date(g.dept_date);
      if (!Number.isNaN(departureDate.getTime())) {
        departureDate.setHours(0, 0, 0, 0);
        if (departureDate < today) return false;
      }
    }

    const airlineName = g.airlineName || "";
    const sector = (g.sector || "").toUpperCase().trim();
    const keyword = filters.searchKeyword.toLowerCase();
    if (filters.airlines.length && !filters.airlines.includes(airlineName))
      return false;
    if (filters.sectors.length && !filters.sectors.includes(sector))
      return false;
    if (
      filters.duration &&
      filters.duration !== "all" &&
      String(g.packageDuration) !== String(filters.duration)
    )
      return false;
    if (filters.months.length && g.dept_date) {
      const d = new Date(g.dept_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!filters.months.includes(key)) return false;
    }
    if (
      keyword &&
      !`${airlineName} ${sector} ${g.voucher_id || ""} ${g.packageName || ""}`
        .toLowerCase()
        .includes(keyword)
    )
      return false;
    if (filters.departDate && g.dept_date) {
      const depDate = new Date(g.dept_date);
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
      <h3 className="font-bold text-sm mb-3 text-gray-800">Airlines</h3>
      <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
        {airlines.map((airline) => (
          <label
            key={airline}
            className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors group"
          >
            <input
              type="checkbox"
              checked={filters.airlines.includes(airline)}
              onChange={() => handleFilterChange("airline", airline)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600 group-hover:text-gray-900 font-medium">
              {airline}
            </span>
          </label>
        ))}
      </div>
      <div className="h-px bg-gray-100 my-4" />
      <h3 className="font-bold text-sm mb-3 text-gray-800">Sectors</h3>
      <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
        {sectors.map((sector) => (
          <label
            key={sector}
            className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors group"
          >
            <input
              type="checkbox"
              checked={filters.sectors.includes(sector)}
              onChange={() => handleFilterChange("sector", sector)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600 group-hover:text-gray-900 font-medium">
              {sector}
            </span>
          </label>
        ))}
      </div>
      {months.length > 0 && (
        <>
          <div className="h-px bg-gray-100 my-4" />
          <h3 className="font-bold text-sm mb-3 text-gray-800">Month Wise View</h3>
          <div className="flex flex-col gap-1">
            {months.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleFilterChange("months", value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  filters.months.includes(value)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200"
                }`}
              >
                📅 {label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );

  const UmrahPackageCard = ({ packages, index }) => {
    const sortedPackages = [...packages].sort((a, b) => {
      const da = a.dept_date ? new Date(a.dept_date) : new Date(9999, 0);
      const db = b.dept_date ? new Date(b.dept_date) : new Date(9999, 0);
      return da - db;
    });
    const [selectedIdx, setSelectedIdx] = useState(0);
    const group = sortedPackages[selectedIdx];
    // console.log(group,8552);
    
    const allFlights = group.flights || [];
    const rooms = group.rooms || {};
    const primary = theme.colors.primary;
    const makkahHotel = group.makkahHotel;
    const madinahHotel = group.madinahHotel;

    const getPackageDropdownLabel = (pkg) => {
      const dep = pkg.dept_date ? new Date(pkg.dept_date) : null;
      const arr = pkg.returnDate ? new Date(pkg.returnDate) : null;
      const depStr = dep
        ? `${String(dep.getDate()).padStart(2, "0")} ${MONTHS_TITLE[dep.getMonth()]} ${dep.getFullYear()}`
        : null;
      const arrStr = arr
        ? `${String(arr.getDate()).padStart(2, "0")} ${MONTHS_TITLE[arr.getMonth()]} ${arr.getFullYear()}`
        : null;
      const name = pkg.packageName || pkg.groupName || "";
      const dateRange = depStr && arrStr ? `${depStr}  ➜  ${arrStr}` : depStr || "";
      if (name && dateRange) return `${dateRange}`;
      if (dateRange) return dateRange;
      return name;
    };

    const roomOrder = ["sharing", "quint", "quad", "triple", "double", "hexa"];
    const roomColors = {
      sharing: { bg: "#e8f4fd", text: "#1565c0", border: "#90caf9" },
      quad: { bg: "#f3e5f5", text: "#6a1b9a", border: "#ce93d8" },
      triple: { bg: "#e8f5e9", text: "#2e7d32", border: "#a5d6a7" },
      double: { bg: "#fff8e1", text: "#e65100", border: "#ffcc80" },
      quint: { bg: "#fce4ec", text: "#880e4f", border: "#f48fb1" },
      hexa: { bg: "#eef2ff", text: "#3730a3", border: "#a5b4fc" },
    };

    const availableRoomTypes = roomOrder
      .filter((key) => isRoomRateAvailable(key, rooms, group.availableRooms))
      .map((key) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }));

    const isSoldOut =
      group.availableRooms !== null &&
      group.availableRooms !== undefined &&
      Number(group.availableRooms) <= 0;
    const canBookPackage = !isSoldOut && availableRoomTypes.length > 0;

    const handleBooking = (roomTypeKey = null) => {
      navigate("/dashboard/pkg-detail", {
        state: { group, selectedRoomType: roomTypeKey },
      });
    };

    const fmt = (n) => Number(n).toLocaleString();

    const flightRowText = (fl) => {
      const depD = fl.depDate ? new Date(fl.depDate) : null;
      const dateStr = depD
        ? `${String(depD.getDate()).padStart(2, "0")} ${MONTHS_TITLE[depD.getMonth()]}`
        : "";
      const sector =
        fl.sectorFrom && fl.sectorTo
          ? `${fl.sectorFrom}-${fl.sectorTo}`
          : fl.sector || "";
      const times = [fl.depTime, fl.arrTime].filter(Boolean).join("–");
      const baggage = fl.baggage ? fl.baggage : "";
      const parts = [];
      if (dateStr) parts.push(dateStr);
      if (sector) parts.push(sector);
      if (fl.flightNo) parts.push(fl.flightNo);
      if (times) parts.push(times);
      if (baggage) parts.push(baggage);
      return parts.join(" • ");
    };

    const HotelInfo = ({ hotel, icon }) => {
      if (!hotel) return null;
      return (
        <div
          className="flex flex-col items-center justify-center gap-0.5"
          style={{
            minWidth: "clamp(80px, 15vw, 110px)",
            maxWidth: "clamp(100px, 20vw, 150px)",
          }}
        >
          <img
            className="h-8 md:h-10 lg:h-12"
            style={{ height: 60 }}
            src={icon}
            alt={hotel.name}
          />
          <div className="text-[9px] md:text-[10px] lg:text-[11px] font-bold text-gray-900 leading-tight text-center w-full overflow-hidden whitespace-nowrap text-ellipsis px-1">
            {(hotel.name || "").toUpperCase()}
          </div>
          <div className="text-[8px] md:text-[9px] lg:text-[10px] text-gray-500 text-center">
            {hotel.city} | {hotel.nightCount} Nights
          </div>
          {hotel.distance && hotel.distance !== "0" && (
            <div className="text-[8px] md:text-[9px] lg:text-[10px] text-red-400 text-center font-bold bg-amber-50 px-2 rounded-2xl">
              {hotel.distance} Mtr from Haram
            </div>
          )}
          {hotel.nightCount > 0 && (
            <div className="text-[8px] md:text-[9px] lg:text-[10px] text-gray-400 text-center"></div>
          )}
        </div>
      );
    };

    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 mb-3 bg-white shadow-sm">
        {/* Header Bar */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center p-3 sm:p-4 gap-2 sm:gap-3"
          style={{ background: primary }}
        >
          <div className="flex flex-col shrink-0">
            <div className="text-xs sm:text-sm font-bold text-white">
              {index !== undefined ? `${index + 1} ` : ""}
              <span style={{ color: "#f59e0b" }}>★</span> {group.packageName}
            </div>
            <div className="text-[9px] sm:text-[10px] text-white/70 font-medium">
              {group.airlineName}
            </div>
          </div>
          {sortedPackages.length > 1 ? (
            <div className="shrink-0">
              <select
                value={selectedIdx}
                onChange={(e) => setSelectedIdx(Number(e.target.value))}
                className="bg-white/20 border border-white/40 text-white text-[10px] sm:text-xs rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                style={{ colorScheme: "dark" }}
              >
                {sortedPackages.map((pkg, i) => (
                  <option key={i} value={i} className="text-gray-800 bg-white">
                    {getPackageDropdownLabel(pkg)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="flex-1 flex flex-col items-start sm:items-center gap-1 w-full sm:w-auto">
            {allFlights.map((fl, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-white text-[10px] sm:text-xs  font-bold flex-wrap"
              >
                <span className="text-xs opacity-90 text-[13px]">✈</span>
                <span className="break-all text-[13px]">{flightRowText(fl)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {group.packageDuration && (
              <div className="bg-white/20 border border-white/40 rounded-full px-2 sm:px-3 py-1 text-white text-[10px] sm:text-xs font-bold whitespace-nowrap">
                📦 {group.packageDuration} DAYS
              </div>
            )}
            {group.availableRooms !== "" &&
              group.availableRooms !== undefined &&
              group.availableRooms > 0 && (
                <div className="bg-white/20 border border-white/40 rounded-full px-2 sm:px-3 py-1 text-white text-[10px] sm:text-xs font-bold whitespace-nowrap">
                  👥 Seats Left: {group.availableRooms}
                </div>
              )}
          </div>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-3">
            {/* Airline Logo */}
            <div className="bg-white rounded-md my-auto flex items-center justify-center p-1" style={{ width: 72, height: 48 }}>
              <img
                src={
                  airlineLogoOverrides[group.airlineName?.toLowerCase().trim()]
                    ? airlineLogoOverrides[group.airlineName.toLowerCase().trim()]
                    : group.airlineCode
                    ? `https://img.wway.io/pics/root/${group.airlineCode}@png?exar=1&rs=fit:80:40`
                    : group.airline?.logo_url ||
                      "https://static.vecteezy.com/system/resources/thumbnails/017/164/521/small/commercial-jet-plane-airliner-flying-png.png"
                }
                alt={group.airlineName}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.target.src =
                    group.airline?.logo_url ||
                    "https://static.vecteezy.com/system/resources/thumbnails/017/164/521/small/commercial-jet-plane-airliner-flying-png.png";
                }}
              />
            </div>

            {/* Makkah Hotel */}
            <div className="shrink-0 flex items-center justify-center w-full sm:w-auto">
              {makkahHotel ? (
                <HotelInfo
                  hotel={makkahHotel}
                  icon="https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png"
                />
              ) : (
                <div className="min-w-20 text-[10px] text-gray-400 italic text-center">
                  No Makkah hotel
                </div>
              )}
            </div>

            {/* Room Types */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {availableRoomTypes.length > 0 ? (
                  availableRoomTypes.map(({ key, label }) => {
                    const c = roomColors[key] || {
                      bg: "#f3f4f6",
                      text: "#374151",
                      border: "#d1d5db",
                    };
                    return (
                      <button
                        key={key}
                        onClick={() => handleBooking(key)}
                        className="flex flex-col items-center gap-1 px-4 py-1.5 md:py-2 rounded-lg border transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-sm active:scale-95"
                        style={{ background: c.bg, borderColor: c.border }}
                      >
                        <span
                          className="text-[8px] md:text-[9px] font-bold uppercase tracking-wide"
                          style={{ color: c.text }}
                        >
                          {label}
                        </span>
                        <span
                          className="text-[10px] md:text-xs font-bold whitespace-nowrap"
                          style={{ color: c.text }}
                        >
                          RS {fmt(rooms[key])}/-
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    No available room rate
                  </span>
                )}
                <div className="border border-amber-200 bg-amber-100 w-2xl text-center rounded-2xl py-1">
                  {group.specialInstructions || "No Special Instructions"}
                </div>
              </div>
            </div>

            {/* Madinah Hotel */}
            <div className="shrink-0 flex items-center justify-center w-full sm:w-auto">
              {madinahHotel ? (
                <HotelInfo
                  hotel={madinahHotel}
                  icon="https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png"
                />
              ) : (
                <div className="min-w-20 text-[10px] text-gray-400 italic text-center">
                  No Madinah hotel
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() =>
                  canBookPackage &&
                  navigate("/dashboard/pkg-detail", { state: { group } })
                }
                disabled={!canBookPackage}
                className={`px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-white text-[11px] md:text-xs font-bold whitespace-nowrap transition-opacity ${!canBookPackage ? "cursor-not-allowed opacity-60" : "hover:opacity-90"}`}
                style={{ background: !canBookPackage ? "#9ca3af" : primary }}
              >
                {isSoldOut ? "Sold Out" : canBookPackage ? "Book Now" : "Unavailable"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl overflow-hidden border border-gray-200 animate-pulse"
        >
          <div className="h-12 bg-gray-200" />
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex-1 flex flex-col gap-2">
                <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <TopBar
        title={"Umrah Packages"}
        icon={<Package className="text-white w-5 h-5 sm:w-6 sm:h-6" />}
      />
      <div className="w-full min-h-screen bg-gray-50">
        {/* Toolbar */}
        <div
          className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 py-3 ${headerType === "dashboard" ? "rounded-t-2xl" : ""}`}
        >
          <div className="w-full xl:w-auto">{header}</div>
          <div className="flex flex-col lg:flex-row items-center gap-3 w-full xl:w-auto">
            {durations.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-7 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => handleFilterChange("duration", "all")}
                    className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border transition-all text-left ${String(filters.duration) === "all"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                  >
                    All
                  </button>
                  {durations.map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => handleFilterChange("duration", duration)}
                      className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border transition-all text-left ${String(filters.duration) === String(duration)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                    >
                      {duration} Days
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex items-center justify-between w-full lg:w-auto gap-4">
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
                        ? theme.colors.primary
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
                  className="lg:hidden p-2 rounded-lg bg-gray-100 text-gray-700"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 text-sm"
                />
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile filter drawer */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-80 bg-white p-6 shadow-xl overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Filters</h2>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <FilterContent />
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-5 pt-4 pb-8">
          {showAdvancedSearch && (
            <div className="hidden lg:block w-64 shrink-0">
              <div className="bg-white rounded-xl p-5 sticky top-6 border border-gray-100 shadow-sm">
                <FilterContent />
              </div>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <LoadingSkeleton />
            ) : filteredGroups.length === 0 ? (
              <div className="bg-white rounded-xl p-8 sm:p-12 text-center border border-gray-100">
                <div className="text-4xl sm:text-5xl mb-4">✈️</div>
                <p className="text-gray-400 text-sm sm:text-base">
                  No packages available at the moment
                </p>
                <p className="text-gray-300 text-xs sm:text-sm mt-2">
                  Please check back later or adjust your filters
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const byPackage = {};
                  filteredGroups.forEach((g) => {
                    const key = `${g.airlineName || "Unknown"}||${g.packageName || "Unknown"}`;
                    if (!byPackage[key]) byPackage[key] = [];
                    byPackage[key].push(g);
                  });

                  const parseDate = (value) => {
                    if (!value) return null;
                    const d = new Date(value);
                    return Number.isNaN(d.getTime()) ? null : d;
                  };

                  return Object.entries(byPackage)
                    .sort(([, pkgsA], [, pkgsB]) => {
                      const minA = pkgsA
                        .map((p) => parseDate(p.dept_date))
                        .filter(Boolean)
                        .sort((a, b) => a - b)[0];
                      const minB = pkgsB
                        .map((p) => parseDate(p.dept_date))
                        .filter(Boolean)
                        .sort((a, b) => a - b)[0];

                      if (!minA && !minB) return 0;
                      if (!minA) return 1;
                      if (!minB) return -1;
                      return minA - minB;
                    })
                    .map(([key, pkgs], idx) => (
                      <UmrahPackageCard
                        key={key}
                        packages={pkgs}
                        index={idx}
                      />
                    ));
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
