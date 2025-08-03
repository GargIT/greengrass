import { createTheme } from "@mui/material/styles";
import { svSE } from "@mui/material/locale";
import type { CSSProperties } from "react";

// Extend MUI theme to include DataGrid component types
declare module "@mui/material/styles" {
  interface Components {
    MuiDataGrid?: {
      styleOverrides?: {
        root?: CSSProperties & {
          [key: string]: CSSProperties | string | number;
        };
      };
    };
  }
}

// Define theme mode type
export type ThemeMode = "light" | "dark";

// Swedish Green Grass Color Palette
export const colors = {
  // Primary greens (inspired by Swedish nature)
  green: {
    50: "#f0f9f3",
    100: "#dcf2e3",
    200: "#bce5ca",
    300: "#8dd3a6",
    400: "#5cbb7e",
    500: "#2e7d32", // Main green
    600: "#1b5e20",
    700: "#2d5016",
    800: "#1a3e12",
    900: "#0f2a0a",
  },
  // Supporting colors
  blue: {
    500: "#1976d2",
    600: "#1565c0",
  },
  orange: {
    500: "#f57c00",
    600: "#ef6c00",
  },
  grey: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#eeeeee",
    300: "#e0e0e0",
    400: "#bdbdbd",
    500: "#9e9e9e",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
  },
};

// Light theme
export const lightTheme = createTheme(
  {
    palette: {
      mode: "light",
      primary: {
        main: colors.green[500],
        light: colors.green[300],
        dark: colors.green[700],
      },
      secondary: {
        main: colors.blue[500],
        light: colors.blue[600],
        dark: colors.blue[600],
      },
      background: {
        default: "#fafafa",
        paper: "#ffffff",
      },
      text: {
        primary: colors.grey[900],
        secondary: colors.grey[600],
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: "2.5rem",
        fontWeight: 600,
      },
      h2: {
        fontSize: "2rem",
        fontWeight: 600,
      },
      h3: {
        fontSize: "1.75rem",
        fontWeight: 600,
      },
      h4: {
        fontSize: "1.5rem",
        fontWeight: 600,
      },
      h5: {
        fontSize: "1.25rem",
        fontWeight: 600,
      },
      h6: {
        fontSize: "1rem",
        fontWeight: 600,
      },
      body1: {
        fontSize: "1rem",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.6,
      },
      button: {
        textTransform: "none" as const,
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: "none",
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.green[600],
          },
        },
      },
    },
  },
  svSE
);

// Dark theme
export const darkTheme = createTheme(
  {
    palette: {
      mode: "dark",
      primary: {
        main: colors.green[400],
        light: colors.green[300],
        dark: colors.green[600],
      },
      secondary: {
        main: colors.blue[500],
        light: colors.blue[600],
        dark: colors.blue[600],
      },
      background: {
        default: "#0a0a0a",
        paper: "#1a1a1a",
      },
      text: {
        primary: "#ffffff",
        secondary: "rgba(255, 255, 255, 0.7)",
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: "2.5rem",
        fontWeight: 600,
      },
      h2: {
        fontSize: "2rem",
        fontWeight: 600,
      },
      h3: {
        fontSize: "1.75rem",
        fontWeight: 600,
      },
      h4: {
        fontSize: "1.5rem",
        fontWeight: 600,
      },
      h5: {
        fontSize: "1.25rem",
        fontWeight: 600,
      },
      h6: {
        fontSize: "1rem",
        fontWeight: 600,
      },
      body1: {
        fontSize: "1rem",
        lineHeight: 1.6,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.6,
      },
      button: {
        textTransform: "none" as const,
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: "#0a0a0a",
            color: "#ffffff",
          },
          "#root": {
            backgroundColor: "#0a0a0a",
            minHeight: "100vh",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: "none",
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: "#1a1a1a",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: "#1a1a1a",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.green[700],
          },
        },
      },
    },
  },
  svSE
);

// Enhanced versions with better DataGrid styling
export const lightThemeEnhanced = createTheme({
  ...lightTheme,
  components: {
    ...lightTheme.components,
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "none",
          "& .MuiDataGrid-cell": {
            borderColor: colors.grey[200],
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.green[50],
            borderBottom: `2px solid ${colors.green[200]}`,
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: `1px solid ${colors.grey[200]}`,
          },
        },
      },
    },
  },
});

export const darkThemeEnhanced = createTheme({
  ...darkTheme,
  components: {
    ...darkTheme.components,
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "none",
          "& .MuiDataGrid-cell": {
            borderColor: "rgba(255, 255, 255, 0.12)",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "rgba(46, 125, 50, 0.1)",
            borderBottom: "2px solid rgba(46, 125, 50, 0.3)",
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          },
        },
      },
    },
  },
});
