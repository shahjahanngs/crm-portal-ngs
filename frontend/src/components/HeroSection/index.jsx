import React from "react";
import { Link } from "react-router-dom";
import { HiPencil } from "react-icons/hi"; // Using pencil icon as requested
import heroVid from "../../assets/videos/herovid2.mp4";
import makkahImg from "../../assets/images/ummrahbg.png";
import mascatImg from "../../assets/images/muscatbg.jpg";
import uaeImg from "../../assets/images/uaebg.jpg";
import jeddahImg from "../../assets/images/jeddah.webp";
import madinaImg from "../../assets/images/allgroupsbgg.jpg";
import { groupTypes } from "../../data/groupTypes";

const groupImages = {
  "All Groups": madinaImg,
  "UAE (United Arab Emirates)": uaeImg,
  "KSA (Saudia Arabia)": jeddahImg,
  "Muscat (Oman)": mascatImg,
  "Umrah (Makkah & Madina)": makkahImg,
  "Group Ticketing": madinaImg,
};

export default function HeroSection() {
  return (
    <section
      id="hero-section"
      className="relative min-h-screen flex flex-col justify-center pt-28 pb-20 overflow-hidden bg-[#020617]"
    >
      {/* 1. BACKGROUND LAYER: Video & Textures */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
      >
        <source src={heroVid} type="video/mp4" />
      </video>

      {/* Dotted Grid Overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      ></div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-linear-to-b from-[#020617]/90 via-[#020617]/40 to-[#020617]"></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
        {/* 2. HEADER: Bold & Technical */}
        <div className="text-center mb-20 space-y-2 mt-3">
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
            CRM{" "}
            <span className="text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              PORTAL
            </span>
          </h1>
          <div className="flex items-center justify-center gap-6">
            <div className="h-px w-24 bg-linear-to-r from-transparent to-cyan-500/50"></div>
            <p className="text-sm md:text-base text-cyan-100/60 font-bold tracking-[0.6em] uppercase">
              Global Travel Management
            </p>
            <div className="h-px w-24 bg-linear-to-l from-transparent to-cyan-500/50"></div>
          </div>
        </div>

        {/* 3. THE GRID: High-Fidelity Glass Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {groupTypes.map((group) => (
            <Link
              key={group.value} 
              to={`/${group.path}`}
              className="group relative block"
            >
              {/* Main Card Container */}
              <div className="relative h-105 w-full rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-500 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)]">
                {/* Image Component */}
                <img
                  style={{
                    height: "100%",
                  }}
                  src={groupImages[group.label]}
                  alt={group.label}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 scale-105 group-hover:scale-100"
                />

                {/* Image Overlay Darkener */}
                <div className="absolute inset-0 bg-linear-to-t from-[#020617] via-transparent to-transparent opacity-80" />

                {/* Top Action Button: Minimal Glass Circle */}
                <div className="absolute top-5 right-5 z-20">
                  <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all duration-300 group-hover:bg-cyan-500 group-hover:text-black">
                    <HiPencil className="text-lg" />
                  </div>
                </div>

                {/* Bottom Glass Panel */}
                <div className="absolute bottom-4 left-4 right-4 p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 transition-all duration-500 group-hover:-translate-y-1.25 group-hover:bg-black/60">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-400 uppercase">
                      Destination Group
                    </span>
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {group.label}
                      </h3>
                      <div className="text-white/40 group-hover:text-cyan-400 transition-colors">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outer Hover Glow Element */}
              <div className="absolute -inset-1 bg-cyan-500/20 rounded-[28px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
            </Link>
          ))}
        </div>

        {/* 4. FOOTER: Technical Specs */}
        <div className="mt-24 pt-8 border-t border-white/5 flex flex-wrap justify-center gap-x-16 gap-y-6">
          {[
            { label: "Uptime", val: "99.9%" },
            { label: "Security", val: "SSL+AES" },
            { label: "Sync", val: "Real-time" },
            { label: "Support", val: "Enterprise" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <span className="text-[10px] font-black text-cyan-500 uppercase tracking-tighter">
                {stat.label}
              </span>
              <span className="text-xs font-medium text-white/40 uppercase tracking-[0.3em]">
                {stat.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
