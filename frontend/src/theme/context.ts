import { createContext } from "react";
import type { ThemeMode } from "./theme-simple";

export interface ThemeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);
