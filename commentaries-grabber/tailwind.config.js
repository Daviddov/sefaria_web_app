import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    extend: {
      fontFamily: {
        siddur: ["siddur", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
