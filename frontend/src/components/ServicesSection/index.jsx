import React from "react";
import { MoveRight } from "lucide-react"; // npm install lucide-react if you haven't

import service1 from "../../assets/images/service1.webp";
import service2 from "../../assets/images/service2.webp";
import service3 from "../../assets/images/service3.webp";
import service4 from "../../assets/images/service4.webp";
import service5 from "../../assets/images/service5.webp";
import service6 from "../../assets/images/service6.webp";

const services = [
  {
    id: 1,
    title: "Air Tickets",
    description:
      "Seamless sky travel. Safe, comfortable air tickets and premium lounge access.",
    image: service1,
    tag: "Flight",
  },
  {
    id: 2,
    title: "Umrah Packages",
    description:
      "Spiritual journeys crafted with care. Affordable deals with top-tier quality.",
    image: service2,
    tag: "Spiritual",
  },
  {
    id: 3,
    title: "Visa Services",
    description:
      "Skip the paperwork. Expert guidance and efficient processing globally.",
    image: service3,
    tag: "Essential",
  },
  {
    id: 4,
    title: "Hotel Packages",
    description:
      "Your home away from home. From boutique gems to 5-star luxury stays.",
    image: service4,
    tag: "Luxury",
  },
  {
    id: 5,
    title: "Travel Consultancy",
    description:
      "Personalized itineraries and insider tips to turn dreams into reality.",
    image: service5,
    tag: "Advice",
  },
  {
    id: 6,
    title: "Meet & Assist",
    description:
      "VIP airport treatment. Effortless transitions from curb to cabin.",
    image: service6,
    tag: "VIP",
  },
];

export default function ServicesSection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-transparent to-transparent -z-10"></div>

      <div className="max-w-7xl mx-auto px-6">
        {/* --- MODERN HEADER --- */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 text-[#0090c5] text-xs font-bold uppercase tracking-widest mb-6">
            World-Class Expertise
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-[#1a417a] mb-6 tracking-tight">
            Elevate Your <span className="text-[#0090c5]">Journey</span>
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed">
            We handle the complexities of global travel so you can focus on the
            moments that matter. Select a service to explore your next
            destination.
          </p>
        </div>

        {/* --- INNOVATIVE SERVICES GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="z-10 group relative bg-white rounded
              -[2rem] p-4 border border-gray-100 hover:border-blue-200 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(26,65,122,0.1)]"
            >
              {/* IMAGE WRAPPER */}
              <div className="relative h-64 w-full rounded-3xl overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#1a417a]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Floating Category Tag */}
                <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter text-[#1a417a]">
                  {service.tag}
                </span>
              </div>

              {/* CONTENT AREA */}
              <div className="pt-6 pb-2 px-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-2xl font-bold text-[#1a417a] group-hover:text-[#0090c5] transition-colors">
                    {service.title}
                  </h3>
                  <span className="text-4xl font-black text-gray-50 opacity-10 group-hover:opacity-100 group-hover:text-blue-100 transition-all">
                    0{service.id}
                  </span>
                </div>

                <p className="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-2">
                  {service.description}
                </p>

                <button className="w-full py-4 rounded-xl bg-gray-50 group-hover:bg-[#1a417a] text-[#1a417a] group-hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300">
                  Explore Service
                  <MoveRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Decorative Element (SVG Path) */}
      <div className="absolute -bottom-20 -left-20 opacity-5 pointer-events-none">
        <svg
          width="600"
          height="600"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#1a417a"
            d="M45,-76.3C58.1,-69.1,68.4,-56.1,76.1,-42.1C83.8,-28.1,88.9,-13.1,87.6,1.4C86.3,15.9,78.6,29.9,69,42.5C59.4,55.1,47.9,66.3,34.4,72.4C20.9,78.5,5.4,79.5,-10.8,77.5C-27,75.5,-43.8,70.5,-57,61C-70.2,51.5,-79.8,37.5,-83.4,22.2C-87,6.9,-84.6,-9.7,-78.3,-24.8C-72,-39.9,-61.8,-53.4,-48.8,-60.7C-35.8,-68,-20,-69.1,-2.9,-64.1C14.2,-59.1,28.3,-48,45,-76.3Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>
    </section>
  );
}
