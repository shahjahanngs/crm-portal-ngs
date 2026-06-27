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
  LayoutDashboard,
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
        const parsedUser = JSON.parse(storedUser);
        const currentUserId = parsedUser?.zipId || parsedUser?.id || null;
        const [ umrahBookingsRes] = await Promise.allSettled([
          axiosInstance.get("/zip-accounts/get-booking"),
        ]);

        // const regularBookings =
        //   regularBookingsRes.status === "fulfilled" &&
        //   regularBookingsRes.value.data?.success &&
        //   Array.isArray(regularBookingsRes.value.data?.data)
        //     ? regularBookingsRes.value.data.data
        //     : [];

        const allUmrahBookings =
          umrahBookingsRes.status === "fulfilled" &&
          umrahBookingsRes.value.data?.success &&
          Array.isArray(umrahBookingsRes.value.data?.data?.bookings)
            ? umrahBookingsRes.value.data.data.bookings
            : [];

        const umrahBookings = currentUserId
          ? allUmrahBookings.filter((b) => b?.created_by === currentUserId)
          : allUmrahBookings;

        const combinedStatuses = [
          // ...regularBookings.map((b) => b?.status),
          ...umrahBookings.map((b) => b?.overallStatus || b?.status),
        ]
          .filter(Boolean)
          .map((status) => status.toString().toLowerCase().trim());

        setSummary({
          confirmed: combinedStatuses.filter(
            (status) =>
              status === "confirmed" ||
              status === "completed" ||
              status === "paid",
          ).length,
          hold: combinedStatuses.filter(
            (status) =>
              status === "pending" ||
              status === "on hold" ||
              status === "in progress",
          ).length,
          cancelled: combinedStatuses.filter(
            (status) => status === "cancelled" || status === "rejected",
          ).length,
        });
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
          // Only include groups with internalStatus 'Active'
          const activeGroups = (res.data.data || []).filter(
            (group) => group.internalStatus === "Active"
          );
          setGroupTickets(activeGroups.slice(0, 5));
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
          const airlineName = pkg.airline || (pkg.flightLogo?.fileName ? "Airline" : "Unknown Airline");
          const roomTypesRaw = pkg.roomTypes || {};
          const hotelRooms = (pkg.hotels || []).flatMap((h) => h.rooms || []);
          const roomPrices = {};
          for (const [roomTypeId, price] of Object.entries(roomTypesRaw)) {
            const roomDef = hotelRooms.find((r) => r.roomTypeId === roomTypeId);
            const name = roomDef ? roomDef.name.toLowerCase() : roomTypeId;
            roomPrices[name] = price;
          }
          const minPrice = Object.values(roomPrices).filter(Boolean).length
            ? Math.min(...Object.values(roomPrices).filter((p) => p > 0))
            : 0;

          return {
            id: pkg._id,
            _id: pkg._id,
            groupName: pkg.groupName || pkg.airline || "",
            ticketSupplier: pkg.ticketSupplier || "",
            groupTicketingId: pkg.groupTicketingId || "",
            originalVoucher: pkg,
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
            infantPrice: pkg.infantPrice || 0,
            childPrice: pkg.childPrice || 0,
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
      <TopBar
        title={"Agent Dashboard"}
        icon={<LayoutDashboard className="text-white w-6 h-6" />}
      />
      {/* Dynamic News Ticker */}
      <div
        style={{ background: theme.colors.primary }}
        className="w-full text-white py-2.5 overflow-hidden relative shadow-sm"
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

        {/* Summary Stats */}
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
          {/* Main Content Area */}
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

                {/* Fixed Height Scrollable Container */}
                <div className="h-112.5 overflow-y-auto pr-2 custom-scrollbar border-2xl border-gray-400 rounded-2xl shadow-sm p-3">
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
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 italic">
                      No group tickets available
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
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
                              </div>
                            </div>
                            <div className="p-5">
                              <div className="flex items-center justify-between gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-xl font-bold text-gray-800">
                                    {origin}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {flight?.departureTime?.substring(0, 5) ||
                                      "—"}
                                  </div>
                                </div>
                                <div className="flex-1 flex items-center justify-center relative min-w-16">
                                  <div className="h-0.5 w-full bg-blue-200"></div>
                                  <ArrowUpRight className="absolute bg-white text-blue-600 w-4 h-4" />
                                </div>
                                <div className="text-center">
                                  <div className="text-xl font-bold text-gray-800">
                                    {destination}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {flight?.arrivalTime?.substring(0, 5) ||
                                      "—"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase">
                                    Starting From
                                  </p>
                                  <p className="font-bold text-blue-600">
                                    {group.pricing?.sellingCurrencyB2B || "PKR"}{" "}
                                    {group.pricing?.sellingAdultB2B?.toLocaleString()}
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    navigate("/dashboard/booking", {
                                      state: { groupData: group },
                                    })
                                  }
                                  style={{ background: theme.colors.primary }}
                                  className="px-4 py-2 text-white text-xs font-bold rounded-lg"
                                >
                                  Book
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate("/dashboard/all-groups")}
                  className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
                >
                  See More Groups <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Umrah Packages Column */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    Umrah Packages
                  </h2>
                  <div className="h-px flex-1 bg-gray-200 ml-4"></div>
                </div>

                <div className="h-112.5 overflow-y-auto pr-2 custom-scrollbar border-2xl border-gray-400 rounded-2xl shadow-sm p-3">
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
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 italic">
                      No packages available
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
                      {umrahPackages.map((pkg) => (
                        <div
                          key={pkg._id}
                          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300"
                        >
                          <div
                            className="px-4 py-2.5 flex items-center justify-between text-white"
                            style={{ background: theme.colors.primary }}
                          >
                            <h3 className="font-bold text-xs truncate max-w-37.5">
                              {pkg.packageName}
                            </h3>
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">
                              {pkg.packageDuration} Days
                            </span>
                          </div>
                          <div className="p-4">
                            <div className="mb-3 space-y-1">
                              {pkg.hotels?.slice(0, 2).map((hotel, i) => (
                                <div
                                  key={i}
                                  className="text-xs flex items-center gap-2"
                                >
                                  <span className="font-bold text-orange-600 w-8">
                                    {hotel.city?.slice(0, 3)}:
                                  </span>
                                  <span className="text-gray-600 truncate">
                                    {hotel.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                              <span className="text-lg font-bold text-gray-800">
                                PKR {pkg.price?.toLocaleString()}
                              </span>
                              <button
                                onClick={() =>
                                  navigate("/dashboard/pkg-detail", {
                                    state: { group: pkg },
                                  })
                                }
                                style={{ background: theme.colors.primary }}
                                className="px-4 py-2 text-white text-xs font-bold rounded-lg"
                              >
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate("/dashboard/all-groups")}
                  className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
                >
                  See More Packages <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Special Offers Sidebar */}
          <div className="w-full lg:w-96">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-8">
              <div className="flex items-center gap-2 mb-6 text-blue-600">
                <TrendingUp className="w-5 h-5" />
                <h2 className="font-bold text-gray-800">Special Offers</h2>
              </div>

              {loadingCards ? (
                <div className="h-64 flex items-center justify-center text-gray-400 italic">
                  Fetching...
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
                      <h3 className="text-xl font-bold leading-tight">
                        {indexCards[currentIndex]?.title}
                      </h3>
                    </div>
                  </div>

                  {/* Nav Controls */}
                  <div className="flex justify-center gap-2 mt-4">
                    {indexCards.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${i === currentIndex ? "w-6 bg-blue-600" : "w-1.5 bg-gray-200"}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button className="w-full mt-6 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-medium hover:bg-gray-50 transition-all">
                View All Promotional Materials
              </button>
            </div>
          </div>
        </div>
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
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
