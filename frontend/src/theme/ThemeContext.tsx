import React, { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import {
  lightThemeEnhanced,
  darkThemeEnhanced,
  type ThemeMode,
} from "./theme-simple";
import { ThemeContext, type ThemeContextType } from "./context";

interface ThemeContextProviderProps {
  children: ReactNode;
}

export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({
  children,
}) => {
  // Initialize theme mode from localStorage or system preference
  const getInitialMode = (): ThemeMode => {
    // Check localStorage first
    const savedMode = localStorage.getItem(
      "greengrass-theme-mode"
    ) as ThemeMode;
    if (savedMode && (savedMode === "light" || savedMode === "dark")) {
      return savedMode;
    }

    // Fall back to system preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }

    return "light";
  };

  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);

  // Save theme mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("greengrass-theme-mode", mode);
  }, [mode]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      const savedMode = localStorage.getItem("greengrass-theme-mode");
      if (!savedMode) {
        setModeState(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleMode = () => {
    setModeState((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const theme = mode === "light" ? lightThemeEnhanced : darkThemeEnhanced;

  const value: ThemeContextType = {
    mode,
    toggleMode,
    setMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};
