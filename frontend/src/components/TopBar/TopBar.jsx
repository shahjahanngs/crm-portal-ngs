import React from "react";
import { theme } from "../../theme/theme";
import { Sparkles } from "lucide-react";

export default function TopBar({ title, icon }) {
  return (
    <div className="relative my-5 overflow-hidden">
      {/* Outer Glow */}
      <div
        className="absolute inset-0 opacity-20 blur-3xl scale-105"
        style={{
          background: theme.colors.ublGradient,
        }}
      />

      {/* Main Container */}
      <div
        className="
          relative
          overflow-hidden
          rounded-2xl
          px-5
          py-5
          md:px-8
          md:py-6
          border
          backdrop-blur-xl
        "
        style={{
          background: theme.colors.ublGradient,
          borderColor: "rgba(255,255,255,0.12)",
          boxShadow: theme.shadows.xl,
          transition: theme.transitions.smooth,
        }}
      >
        {/* Decorative Blur Orbs */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -right-10 w-52 h-52 bg-cyan-300/10 rounded-full blur-3xl" />

        {/* Shine Overlay */}
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent translate-x-[-120%] hover:translate-x-[120%] transition-transform duration-1000 skew-x-12" />

        {/* Content */}
        <div className="relative flex items-center justify-center gap-4">
          {/* Icon Box */}
          <div
            className="
              flex
              items-center
              justify-center
              rounded-2xl
              border
              backdrop-blur-md
              shrink-0
            "
            style={{
              width: 52,
              height: 52,
              background: "rgba(255,255,255,0.12)",
              borderColor: "rgba(255,255,255,0.15)",
              boxShadow: theme.shadows.md,
            }}
          >
            {icon || <Sparkles className="text-white w-6 h-6" />}
          </div>

          {/* Title */}
          <div className="text-center">
            <h1
              className="
                text-white
                text-2xl
                sm:text-3xl
                md:text-4xl
                font-black
                tracking-wide
                leading-tight
              "
              style={{
                textShadow: "0 4px 14px rgba(0,0,0,0.25)",
              }}
            >
              {title}
            </h1>

            {/* Underline Accent */}
            <div className="flex justify-center mt-2">
              <div
                className="h-1 rounded-full"
                style={{
                  width: "70%",
                  background: "rgba(255,255,255,0.35)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
