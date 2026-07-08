import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: "#ECB034",
        stone: "#C5B9AC",
        stonelight: "#EFEBE4",
        greymid: "#A7A8AA",
        greydark: "#63666A",
        ink: "#000000"
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
export default config;
