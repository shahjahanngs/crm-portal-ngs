import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axiosInstance from "../../../api/axios";
import { groupTypes } from "../../../data/groupTypes";
import TopBar from "../../../components/TopBar/TopBar";
import {
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react"; // I recommend adding lucide-react for icons

import madinaImg from "../../../assets/images/allgroupsbgg.jpg";
import uaeImg from "../../../assets/images/uaebg.jpg";
import jeddahImg from "../../../assets/images/jeddah.webp";
import mascatImg from "../../../assets/images/muscatbg.jpg";
import makkahImg from "../../../assets/images/ummrahbg.png";
import { theme } from "../../../theme/theme";

const groupImages = {
  "All Groups": madinaImg,
  "UAE (United Arab Emirates)": uaeImg,
  "KSA (Saudia Arabia)": jeddahImg,
  "Muscat (Oman)": mascatImg,
  "Umrah (Makkah & Madina)": makkahImg,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    confirmed: 0,
    hold: 0,
    cancelled: 0,
  });
  const [indexCards, setIndexCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [groupTickets, setGroupTickets] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [umrahPackages, setUmrahPackages] = useState([]);
  const [loadingUmrah, setLoadingUmrah] = useState(true);

  useEffect(() => {
    const fetchUserBookings = async () => {
      try {
        const storedUser = localStorage.getItem("frontend_user");
        if (!storedUser) return;
        const user = JSON.parse(storedUser);
        const userId = user?._id || user?.id;
        if (!userId) return;

        const res = await axiosInstance.get("/bookings", {
          params: { userId },
        });
        if (res.data.success && Array.isArray(res.data.data)) {
          const bookings = res.data.data;
          setSummary({
            confirmed: bookings.filter((b) => b.status === "confirmed").length,
            hold: bookings.filter(
              (b) => b.status === "on hold" || b.status === "pending",
            ).length,
            cancelled: bookings.filter((b) => b.status === "cancelled").length,
          });
        }
      } catch (err) {
        setSummary({ confirmed: 0, hold: 0, cancelled: 0 });
      }
    };
    fetchUserBookings();
  }, []);

  useEffect(() => {
    const fetchIndexCards = async () => {
      setLoadingCards(true);
      try {
        const res = await axiosInstance.get("/specialOffer/getSpecialOffers");
        if (res.data.success) setIndexCards(res.data.data);
      } catch (err) {
        setCardsError("Failed to load offers.");
      } finally {
        setLoadingCards(false);
      }
    };
    fetchIndexCards();
  }, []);

  useEffect(() => {
    const fetchGroupTickets = async () => {
      setLoadingGroups(true);
      try {
        const res = await axiosInstance.get("/zip-accounts/group-ticketing");
        if (res.data.success) {
          setGroupTickets(res.data.data.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to load group tickets");
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroupTickets();
  }, []);

  useEffect(() => {
    const fetchUmrahPackages = async () => {
      setLoadingUmrah(true);
      try {
        const res = await axiosInstance.get("/zip-accounts/umrahPackages");
        let fetchedGroups = res.data?.data || [];

        const formattedGroups = fetchedGroups.slice(0, 5).map((pkg) => {
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

        setUmrahPackages(formattedGroups);
      } catch (err) {
        console.error("Failed to load umrah packages");
      } finally {
        setLoadingUmrah(false);
      }
    };
    fetchUmrahPackages();
  }, []);

  useEffect(() => {
    if (indexCards.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((p) => (p === indexCards.length - 1 ? 0 : p + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [indexCards]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <TopBar title={"Agent Dashboard"} />
      {/* Dynamic News Ticker */}
      <div
        style={{ background: theme.colors.primary }}
        className="w-ful text-white py-2.5 overflow-hidden relative shadow-sm"
      >
        <div className="whitespace-nowrap font-medium text-sm animate-marquee">
          <span className="mx-4">
            🌟 Exclusive Umrah Packages now available
          </span>
          <span className="mx-4">
            ✈️ New UAE Flight Routes added for May 2026
          </span>
          <span className="mx-4">⚡ Special Ramadan Early Bird Discounts</span>
        </div>
      </div>

      <div className="max-w-8xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <p className="text-gray-500 mt-2">
            Welcome back! Here's what's happening with your bookings today.
          </p>
        </div>

        {/* Improved Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <StatCard
            label="Confirmed"
            value={summary.confirmed}
            color="emerald"
            icon={<CheckCircle className="w-6 h-6" />}
          />
          <StatCard
            label="On Hold"
            value={summary.hold}
            color="amber"
            icon={<Clock className="w-6 h-6" />}
          />
          <StatCard
            label="Cancelled"
            value={summary.cancelled}
            color="rose"
            icon={<XCircle className="w-6 h-6" />}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Area - Group Tickets and Umrah Packages */}
          <div className="flex-1">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Group Tickets Column */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    Group Tickets
                  </h2>
                  <div className="h-px flex-1 bg-gray-200 ml-4"></div>
                </div>

                {loadingGroups ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-white rounded-2xl p-6 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-20 bg-gray-100 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : groupTickets.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                    No group tickets available at the moment
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {groupTickets.map((group) => {
                        const flight = group.flights?.[0];
                        const sectorParts = group.sector?.split("-") || [];
                        const origin =
                          sectorParts[0] || flight?.sectorFrom || "";
                        const destination =
                          sectorParts[sectorParts.length - 1] ||
                          flight?.sectorTo ||
                          group.sector;

                        return (
                          <div
                            key={group._id || group.groupId}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300"
                          >
                            {/* Header with Airline */}
                            <div className="bg-linear-to-r from-blue-50 via-transparent to-blue-50 flex items-center justify-between px-6 py-3 border-b border-gray-100">
                              <div className="flex items-center gap-3">
                                {group.airlineLogo ? (
                                  <img
                                    src={group.airlineLogo}
                                    alt={group.airline}
                                    className="h-8 object-contain"
                                  />
                                ) : (
                                  <span className="font-semibold text-sm text-gray-700">
                                    {group.airline || "Airline"}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                  {group.sector}
                                </span>
                                {group.groupName && (
                                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                    {group.groupName}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Flight Details */}
                            <div className="p-6">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                {/* Route Info */}
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-800">
                                      {origin}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                      {flight?.departureTime?.substring(0, 5) ||
                                        "—"}
                                    </div>
                                  </div>

                                  <div className="flex-1 flex items-center justify-center relative min-w-24">
                                    <div className="h-0.5 w-full bg-linear-to-r from-blue-600 to-cyan-500"></div>
                                    <ArrowUpRight className="absolute bg-white text-blue-600 w-5 h-5" />
                                  </div>

                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-800">
                                      {destination}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                      {flight?.arrivalTime?.substring(0, 5) ||
                                        "—"}
                                    </div>
                                  </div>
                                </div>

                                {/* Flight Details */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                                  <div className="flex items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-gray-400" />
                                      <span className="font-medium text-gray-600">
                                        {flight?.departureDate
                                          ? new Date(
                                              flight.departureDate,
                                            ).toLocaleDateString("en-GB", {
                                              day: "2-digit",
                                              month: "short",
                                            })
                                          : "—"}
                                      </span>
                                    </div>
                                    {group.showSeats && group.seats != null && (
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="font-semibold text-gray-700">
                                          {group.seats} Seats
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => {
                                      const transformedData = {
                                        id: group._id || group.groupId,
                                        source: "zip-api",
                                        type:
                                          group.groupCategory ||
                                          group.type ||
                                          "Group Ticketing",
                                        airline: {
                                          id: group.airlineId || null,
                                          airline_name: group.airline || "",
                                          logo_url: group.airlineLogo || "",
                                        },
                                        sector: group.sector || "",
                                        pnr: group.pnr || "",
                                        price:
                                          group.pricing?.sellingAdultB2B || 0,
                                        childPrice:
                                          group.pricing?.sellingChildB2B || 0,
                                        infantPrice:
                                          group.pricing?.sellingInfantB2B || 0,
                                        currency:
                                          group.pricing?.sellingCurrencyB2B ||
                                          "PKR",
                                        dept_date:
                                          group.flights?.[0]?.departureDate ||
                                          "",
                                        arv_date:
                                          group.flights?.[
                                            group.flights.length - 1
                                          ]?.arrivalDate || "",
                                        details:
                                          group.flights?.map((f) => ({
                                            flight_no: f.flightNo || "",
                                            flight_date: f.departureDate || "",
                                            dep_date: f.departureDate || "",
                                            dept_time: f.departureTime || "",
                                            origin: f.sectorFrom || "",
                                            destination: f.sectorTo || "",
                                            arv_date: f.arrivalDate || "",
                                            arv_time: f.arrivalTime || "",
                                            baggage: f.baggage || "",
                                            meal: f.meal || "",
                                            flightClass: f.flightClass || "",
                                            fromTerminal: f.fromTerminal || "",
                                            toTerminal: f.toTerminal || "",
                                          })) || [],
                                        available_no_of_pax: group.seats || 0,
                                        showSeats: group.showSeats || false,
                                        noOfDays: group.noOfDays || 0,
                                        originalData: group,
                                      };
                                      navigate("/dashboard/booking", {
                                        state: { groupData: transformedData },
                                      });
                                    }}
                                    style={{ background: theme.colors.primary }}
                                    className="px-6 py-2.5 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 whitespace-nowrap"
                                  >
                                    Book Now
                                  </button>
                                </div>
                              </div>

                              {/* Additional Info */}
                              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                                <div className="text-xs text-gray-500">
                                  Flight:{" "}
                                  <span className="font-semibold text-gray-700">
                                    {flight?.flightNo?.toUpperCase() || "—"}
                                  </span>
                                </div>
                                {group.pricing?.sellingAdultB2B && (
                                  <div className="text-xs text-gray-500">
                                    Starting from:{" "}
                                    <span
                                      className="font-bold text-lg"
                                      style={{ color: theme.colors.primary }}
                                    >
                                      {group.pricing.sellingCurrencyB2B ||
                                        "PKR"}{" "}
                                      {group.pricing.sellingAdultB2B.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* See More Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate("/dashboard/group-ticketing")}
                        className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center gap-2 text-sm"
                      >
                        See More Groups
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {groupTypes.map((group) => (
                <div
                  key={group.value}
                  onClick={() => navigate(`/dashboard/${group.path}`)}
                  className="group relative cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  <div className="h-44 overflow-hidden relative">
                    <img
                      src={groupImages[group.label]}
                      alt={group.label}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-700"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                        Destination
                      </p>
                      <h3 className="font-bold text-gray-800 text-lg">
                        {group.label}
                      </h3>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-full group-hover:bg-blue-50 transition-colors">
                      <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-transform group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div> */}
              </div>

              {/* Umrah Packages Column */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    Umrah Packages
                  </h2>
                  <div className="h-px flex-1 bg-gray-200 ml-4"></div>
                </div>

                {loadingUmrah ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-white rounded-2xl p-6 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-20 bg-gray-100 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : umrahPackages.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                    No umrah packages available at the moment
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {umrahPackages.map((pkg) => {
                        const flight =
                          pkg.details?.[0] || pkg.metadata?.flightDetails || {};
                        const hotels = pkg.hotels || [];
                        const rooms = pkg.rooms || {};
                        const minPrice = pkg.price;

                        return (
                          <div
                            key={pkg._id}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300"
                          >
                            {/* Header */}
                            <div
                              className="px-4 py-2.5 flex items-center justify-between"
                              style={{ background: theme.colors.primary }}
                            >
                              <h3 className="text-white font-bold text-sm">
                                {pkg.packageName}
                              </h3>
                              {pkg.availableRooms > 0 && (
                                <span className="text-white text-xs font-semibold">
                                  {pkg.availableRooms} Seats
                                </span>
                              )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                              {/* Sector & Duration */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-700">
                                    {pkg.sector}
                                  </span>
                                </div>
                                {pkg.packageDuration && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    {pkg.packageDuration} Days
                                  </span>
                                )}
                              </div>

                              {/* Hotels */}
                              {hotels.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-orange-600 mb-1.5">
                                    HOTELS
                                  </p>
                                  <div className="space-y-1">
                                    {hotels.slice(0, 2).map((hotel, i) => {
                                      const city =
                                        hotel.location?.city ||
                                        hotel.city ||
                                        "";
                                      const cityAbbr = city
                                        .toLowerCase()
                                        .includes("mak")
                                        ? "Mak"
                                        : city.toLowerCase().includes("mad")
                                          ? "Med"
                                          : city.slice(0, 3);
                                      const cityColor =
                                        cityAbbr === "Mak"
                                          ? "#228B22"
                                          : "#4169E1";

                                      return (
                                        <div key={i} className="text-xs">
                                          <span
                                            className="font-bold"
                                            style={{ color: cityColor }}
                                          >
                                            {cityAbbr}:
                                          </span>{" "}
                                          <span className="text-gray-700">
                                            {hotel.name || hotel.hotelName}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Price & Button */}
                              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                {minPrice > 0 && (
                                  <div>
                                    <span className="text-xs text-gray-500">
                                      From{" "}
                                    </span>
                                    <span
                                      className="text-lg font-bold"
                                      style={{ color: theme.colors.primary }}
                                    >
                                      PKR {minPrice.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                <button
                                  onClick={() =>
                                    navigate("/dashboard/pkg-detail", {
                                      state: { group: pkg },
                                    })
                                  }
                                  style={{ background: theme.colors.primary }}
                                  className="px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* See More Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate("/dashboard/all-groups")}
                        className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center gap-2 text-sm"
                      >
                        See More Packages
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
              {/* End Umrah Packages Column */}
            </div>
            {/* End Grid */}
          </div>
          {/* End Main Content Area */}

          {/* Special Offers Sidebar */}
          <div className="w-full lg:w-96">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-8">
              <div className="flex items-center gap-2 mb-6 text-blue-600">
                <TrendingUp className="w-5 h-5" />
                <h2 className="font-bold text-gray-800">Special Offers</h2>
              </div>

              {loadingCards ? (
                <div className="h-64 flex items-center justify-center text-gray-400 italic">
                  Fetching latest deals...
                </div>
              ) : (
                <div className="relative group/carousel">
                  <div className="relative rounded-2xl overflow-hidden aspect-4/5 bg-gray-100">
                    <img
                      src={
                        indexCards[currentIndex]?.image ||
                        "https://www.islamiclandmarks.com/wp-content/uploads/2023/05/interesting_facts_about_the_holy_kaaba_house_of_Allah-740x987.jpg"
                      }
                      alt="Offer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/80 to-transparent text-white">
                      <p className="text-blue-300 text-xs font-bold uppercase mb-1">
                        Limited Time
                      </p>
                      <h3 className="text-xl font-bold leading-tight mb-2">
                        {indexCards[currentIndex]?.title}
                      </h3>
                    </div>
                  </div>

                  {/* Navigation Dots */}
                  <div className="flex justify-center gap-2 mt-4">
                    {indexCards.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === currentIndex
                            ? "w-6 bg-blue-600"
                            : "w-1.5 bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentIndex((p) =>
                        p === 0 ? indexCards.length - 1 : p - 1,
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-12 p-2 bg-white/90 backdrop-blur rounded-full shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentIndex((p) =>
                        p === indexCards.length - 1 ? 0 : p + 1,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-12 p-2 bg-white/90 backdrop-blur rounded-full shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              <button className="w-full mt-6 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-medium hover:bg-gray-50 hover:border-blue-200 transition-all">
                View All Promotional Materials
              </button>
            </div>
          </div>
          {/* End Special Offers Sidebar */}
        </div>
        {/* End Flex Container */}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 25s linear infinite;
        }
      `,
        }}
      />
    </div>
  );
};

// Helper Component for Stats
const StatCard = ({ label, value, color, icon }) => {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <div
      className={`p-6 rounded-3xl bg-white border border-gray-100 shadow-sm relative overflow-hidden group`}
    >
      <div
        className={`absolute top-0 left-0 w-1.5 h-full ${color === "emerald" ? "bg-emerald-500" : color === "amber" ? "bg-amber-500" : "bg-rose-500"}`}
      ></div>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-4xl font-black text-gray-800">{value}</p>
        </div>
        <div className={`p-4 rounded-2xl ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

export default Dashboard;
