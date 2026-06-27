import React from "react";
import aboutImg from "../../assets/images/ABOUTUSIMAGE.webp";

export default function AboutSection() {
  return (
    <section className="py-20 bg-gray-50 font-sans overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* --- SECTION HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1 w-8 bg-[#0090c5] rounded-full"></span>
              <span className="text-[#0090c5] font-bold uppercase tracking-[0.2em] text-sm">
                About CRM Portal
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#1a417a] leading-tight">
              Go Travel. Discover the Best, <br />
              <span className="text-[#0090c5]">Remember the Experience.</span>
            </h2>
          </div>
          <p className="text-gray-500 font-medium max-w-sm border-l-4 border-gray-200 pl-4">
            Redefining the art of travel by curating exceptional journeys
            tailored to your expectations.
          </p>
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* LEFT: IMAGE WITH ACCENTS */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl z-10">
              <img
                src={aboutImg}
                alt="Travel Destinations"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
            {/* Decorative element behind image */}
            <div className="absolute -bottom-6 -left-6 w-64 h-64 bg-[#0090c5]/10 rounded-full blur-3xl z-0"></div>

            {/* Floating Badge */}
            <div className="absolute -bottom-4 -right-4 bg-white p-6 rounded-2xl shadow-xl z-20 hidden md:block">
              <div className="text-center">
                <p className="text-3xl font-black text-[#1a417a]">15+</p>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">
                  Years of Trust
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: TEXT CONTENT */}
          <div className="lg:col-span-7 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-xl font-bold text-[#1a417a]">
                  Our Commitment
                </h4>
                <p className="text-gray-600 leading-relaxed text-sm">
                  We specialize in a wide range of services, including Flight
                  Reservations, Hotel Bookings, and Visa Assistance. We take
                  pride in competitive rates without compromising quality.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-xl font-bold text-[#1a417a]">
                  Personalized Touch
                </h4>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Our advanced filters allow you to refine your journey by
                  selecting preferred airlines and travel options—ensuring every
                  detail aligns with your vision.
                </p>
              </div>
            </div>

            <div className="bg-[#1a417a] p-8 rounded-3xl text-white relative overflow-hidden">
              {/* Decorative Curve */}
              <div className="absolute top-0 right-0 opacity-10">
                <svg width="150" height="150" viewBox="0 0 100 100" fill="none">
                  <circle cx="100" cy="0" r="100" fill="white" />
                </svg>
              </div>

              <p className="relative z-10 text-lg leading-relaxed opacity-90 italic">
                "What truly sets us apart is our dedication to impeccable
                after-sales service—because your experience matters long after
                your booking is complete."
              </p>

              <div className="mt-6 flex flex-wrap gap-4">
                <span className="px-4 py-2 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
                  Umrah & Hajj
                </span>
                <span className="px-4 py-2 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
                  Global Tickets
                </span>
                <span className="px-4 py-2 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
                  Luxury Hotels
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
