import type { Config } from "tailwindcss";
import preset from "@dentalos/config/tailwind";

const config: Config = {
  presets: [preset as Config],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};

export default config;
