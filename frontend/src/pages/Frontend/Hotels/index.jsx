import React, { useEffect, useState, useCallback } from "react";
import {
  FaStar,
  FaRegStar,
  FaMapMarkerAlt,
  FaBuilding,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaImages,
  FaSearch,
} from "react-icons/fa";
import { MdHotel, MdFilterList } from "react-icons/md";
import axiosInstance from "../../../api/axios";
import TopBar from "../../../components/TopBar/TopBar";

const CRM_IMAGE_BASE = "https://crm.zipaccounts.com/app2";

function resolveImageUrl(rawPath) {
  if (!rawPath) return null;
  if (rawPath.startsWith("http://") || rawPath.startsWith("https://"))
    return rawPath;
  const cleaned = rawPath.replace(/^(\.\.\/)+/, "/");
  return `${CRM_IMAGE_BASE}${cleaned}`;
}

export default function HotelsPage() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [galleryHotel, setGalleryHotel] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosInstance.get("/zip-accounts/hotels");
      const data = res.data;
      if (data.success) {
        setHotels(data.data);
      } else {
        setError("Failed to load hotels data.");
      }
    } catch (err) {
      setError("Unable to fetch hotels.");
    } finally {
      setLoading(false);
    }
  };

  const cities = ["All", ...new Set(hotels.map((h) => h.city).filter(Boolean))];
  const countries = [
    "All",
    ...new Set(hotels.map((h) => h.country).filter(Boolean)),
  ];

  const filtered = hotels.filter((h) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      h.hotelName?.toLowerCase().includes(q) ||
      h.city?.toLowerCase().includes(q);
    const matchCity = cityFilter === "All" || h.city === cityFilter;
    const matchCountry = countryFilter === "All" || h.country === countryFilter;
    return matchSearch && matchCity && matchCountry;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar title={"Hotels"} />

      <div className="px-4 py-6">
        {/* Header & Search Bar - Compact Layout */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Explore Hotels
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {filtered.length} found
              </span>
            </h1>
            <p className="text-slate-500 text-xs">
              Find and book your preferred stay
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
            <div className="relative flex-1 min-w-50">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-3" />
              <input
                type="text"
                placeholder="Search name or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-transparent outline-none"
              />
            </div>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-600 outline-none px-2 cursor-pointer"
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Countries" : c}
                </option>
              ))}
            </select>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-600 outline-none px-2 cursor-pointer"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Cities" : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 bg-slate-200 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-red-500 font-medium mb-2">{error}</p>
            <button
              onClick={fetchHotels}
              className="text-sm text-blue-600 font-bold hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filtered.map((hotel) => (
              <HotelCard
                key={hotel._id}
                hotel={hotel}
                onClick={() => setGalleryHotel(hotel)}
              />
            ))}
          </div>
        )}
      </div>

      {galleryHotel && (
        <PhotoGalleryModal
          hotel={galleryHotel}
          onClose={() => setGalleryHotel(null)}
        />
      )}
    </div>
  );
}

function StarRating({ count, className }) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[...Array(5)].map((_, i) =>
        i < count ? (
          <FaStar key={i} size={10} className="text-amber-400" />
        ) : (
          <FaStar key={i} size={10} className="text-slate-300" />
        ),
      )}
    </div>
  );
}

function HotelCard({ hotel, onClick }) {
  const { hotelName, city, star, images = [], distance } = hotel;
  const cover = resolveImageUrl(images[0]);

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-400 transition-all duration-300 cursor-pointer"
    >
      <div className="relative aspect-4/3 overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={hotelName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
            <MdHotel size={40} />
          </div>
        )}

        {/* Image Overlays */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-80" />

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hotel.featured && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-tighter">
              Featured
            </span>
          )}
          <span className="bg-black/40 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
            <FaImages size={10} /> {images.length}
          </span>
        </div>

        <div className="absolute bottom-2 left-3 right-3">
          <StarRating count={star} className="mb-1" />
          <h3 className="text-white font-bold text-sm leading-tight truncate drop-shadow-sm">
            {hotelName}
          </h3>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
            <FaMapMarkerAlt className="text-blue-500" />
            <span className="truncate">{city || "Unknown City"}</span>
          </div>
          {distance && (
            <div className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
              {distance}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoGalleryModal({ hotel, onClose }) {
  const images = hotel.images?.map(resolveImageUrl).filter(Boolean) || [];
  const [index, setIndex] = useState(0);

  const move = (dir) =>
    setIndex((i) => (i + dir + images.length) % images.length);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar in Modal */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-linear-to-b from-black/80 to-transparent">
          <div>
            <h2 className="text-white font-bold text-lg">{hotel.hotelName}</h2>
            <p className="text-slate-300 text-xs flex items-center gap-1">
              <FaMapMarkerAlt /> {hotel.city}, {hotel.country}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => move(-1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/40 hover:bg-white/20 text-white rounded-full backdrop-blur-sm"
            >
              <FaChevronLeft size={20} />
            </button>
            <button
              onClick={() => move(1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/40 hover:bg-white/20 text-white rounded-full backdrop-blur-sm"
            >
              <FaChevronRight size={20} />
            </button>
          </>
        )}

        {/* Main Image */}
        <div className="w-full aspect-video flex items-center justify-center bg-black">
          {images.length > 0 ? (
            <img
              src={images[index]}
              className="max-h-full max-w-full object-contain select-none"
              alt="Gallery"
            />
          ) : (
            <div className="text-slate-500">No images available</div>
          )}
        </div>

        {/* Thumbnails Overlay */}
        <div className="bg-black/60 backdrop-blur-md p-4 flex gap-2 overflow-x-auto justify-center">
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              onClick={() => setIndex(i)}
              className={`h-12 w-16 object-cover rounded-md cursor-pointer border-2 transition-all ${i === index ? "border-blue-500 scale-110" : "border-transparent opacity-50"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
