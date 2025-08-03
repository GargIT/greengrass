import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { LightMode, DarkMode } from "@mui/icons-material";
import { useThemeMode } from "./useThemeMode";

interface ThemeToggleProps {
  size?: "small" | "medium" | "large";
  color?: "inherit" | "primary" | "secondary";
  showTooltip?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = "medium",
  color = "inherit",
  showTooltip = true,
}) => {
  const { mode, toggleMode } = useThemeMode();

  const button = (
    <IconButton
      onClick={toggleMode}
      color={color}
      size={size}
      aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
    >
      {mode === "light" ? <DarkMode /> : <LightMode />}
    </IconButton>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <Tooltip title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}>
      {button}
    </Tooltip>
  );
};

export default ThemeToggle;
