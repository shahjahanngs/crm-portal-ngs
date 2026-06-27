import React from "react";
import { theme } from "../../theme/theme";

export default function TopBar({ title }) {
  return (
    <div
      style={{ background: theme.colors.primary }}
      className="py-4 px-4 text-2xl md:text-3xl lg:text-4xl text-white text-center font-bold my-4 rounded-lg md:rounded-none"
    >
      {title}
    </div>
  );
}
