import { createTheme } from "@mui/material/styles";
import { svSE } from "@mui/material/locale";

// Swedish Green Grass Color Palette
const colors = {
  // Primary greens (inspired by Swedish nature)
  green: {
    50: "#f0f9f3",
    100: "#dcf2e3",
    200: "#bce5ca",
    300: "#8dd4a5",
    400: "#5bb979",
    500: "#37a058", // Main brand green
    600: "#2a8347",
    700: "#236a3b",
    800: "#1f5532",
    900: "#1a462a",
  },
  // Complementary colors
  forest: {
    50: "#f0f7f0",
    100: "#d9edd9",
    200: "#b3d9b3",
    300: "#80c280",
    400: "#4da64d",
    500: "#2d7d2d", // Dark forest green
    600: "#1f5f1f",
    700: "#1a4d1a",
    800: "#143314",
    900: "#0f1f0f",
  },
  // Swedish flag blue (accent)
  blue: {
    50: "#f0f8ff",
    100: "#e0f0ff",
    200: "#bae0ff",
    300: "#7cc8ff",
    400: "#36acff",
    500: "#0c8ce9", // Swedish blue
    600: "#006bb3",
    700: "#005591",
    800: "#004577",
    900: "#003a63",
  },
  // Swedish flag yellow (accent)
  yellow: {
    50: "#fffdf0",
    100: "#fffbe0",
    200: "#fff7c2",
    300: "#ffed7d",
    400: "#ffdc36",
    500: "#ffc107", // Swedish yellow
    600: "#e69500",
    700: "#cc7a00",
    800: "#a65f00",
    900: "#8a4f00",
  },
  // Neutral grays (Swedish minimalism)
  gray: {
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

// Base theme options
const getDesignTokens = (mode: "light" | "dark") => ({
  palette: {
    mode,
    ...(mode === "light"
      ? {
          // Light mode
          primary: {
            main: colors.green[500],
            light: colors.green[300],
            dark: colors.green[700],
            contrastText: "#ffffff",
          },
          secondary: {
            main: colors.forest[500],
            light: colors.forest[300],
            dark: colors.forest[700],
            contrastText: "#ffffff",
          },
          info: {
            main: colors.blue[500],
            light: colors.blue[300],
            dark: colors.blue[700],
          },
          warning: {
            main: colors.yellow[500],
            light: colors.yellow[300],
            dark: colors.yellow[700],
          },
          background: {
            default: "#ffffff",
            paper: "#fafafa",
          },
          text: {
            primary: colors.gray[900],
            secondary: colors.gray[700],
          },
          divider: colors.gray[200],
        }
      : {
          // Dark mode
          primary: {
            main: colors.green[400],
            light: colors.green[200],
            dark: colors.green[600],
            contrastText: "#000000",
          },
          secondary: {
            main: colors.forest[400],
            light: colors.forest[200],
            dark: colors.forest[600],
            contrastText: "#000000",
          },
          info: {
            main: colors.blue[400],
            light: colors.blue[200],
            dark: colors.blue[600],
          },
          warning: {
            main: colors.yellow[400],
            light: colors.yellow[200],
            dark: colors.yellow[600],
          },
          background: {
            default: "#121212",
            paper: "#1e1e1e",
          },
          text: {
            primary: "#ffffff",
            secondary: colors.gray[300],
          },
          divider: colors.gray[800],
        }),
  },
  typography: {
    // Swedish design principles: clean, readable typography
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    h1: {
      fontSize: "2.5rem",
      fontWeight: 300,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 300,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: "1.75rem",
      fontWeight: 400,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 400,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 500,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none", // Swedish design: no all-caps buttons
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8, // Slightly rounded corners (Swedish minimalism)
  },
  spacing: 8, // 8px base spacing unit
});

// Create the light theme
export const lightTheme = createTheme(getDesignTokens("light"), svSE);

// Create the dark theme
export const darkTheme = createTheme(getDesignTokens("dark"), svSE);

// Enhanced themes with component customizations
const createEnhancedTheme = (baseTheme: ReturnType<typeof createTheme>) =>
  createTheme({
    ...baseTheme,
    components: {
      // AppBar customization
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor:
              baseTheme.palette.mode === "light"
                ? colors.green[500]
                : colors.green[700],
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          },
        },
      },

      // Button customizations
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            textTransform: "none",
            padding: "10px 20px",
          },
          contained: {
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            "&:hover": {
              boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
            },
          },
        },
      },

      // Card customizations
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow:
              baseTheme.palette.mode === "light"
                ? "0 2px 8px rgba(0,0,0,0.1)"
                : "0 2px 8px rgba(0,0,0,0.3)",
          },
        },
      },

      // Drawer customizations (Swedish design)
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor:
              baseTheme.palette.mode === "light" ? "#ffffff" : "#1a1a1a",
            borderRight: `1px solid ${baseTheme.palette.divider}`,
          },
        },
      },

      // List item customizations
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: "4px 8px",
            "&.Mui-selected": {
              backgroundColor:
                baseTheme.palette.mode === "light"
                  ? colors.green[50]
                  : colors.green[900],
              "&:hover": {
                backgroundColor:
                  baseTheme.palette.mode === "light"
                    ? colors.green[100]
                    : colors.green[800],
              },
            },
            "&:hover": {
              backgroundColor:
                baseTheme.palette.mode === "light"
                  ? colors.gray[50]
                  : colors.gray[800],
            },
          },
        },
      },

      // TextField customizations
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
        },
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 8,
            },
          },
        },
      },

      // DataGrid customizations
      MuiDataGrid: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${baseTheme.palette.divider}`,
            "& .MuiDataGrid-cell": {
              borderColor: baseTheme.palette.divider,
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor:
                baseTheme.palette.mode === "light"
                  ? colors.green[50]
                  : colors.green[900],
              borderBottom: `2px solid ${baseTheme.palette.divider}`,
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor:
                baseTheme.palette.mode === "light"
                  ? colors.green[50]
                  : colors.green[900],
            },
          },
        },
      },

      // Dialog customizations
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          },
        },
      },

      // Chip customizations (for status badges)
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            fontWeight: 500,
          },
          colorPrimary: {
            backgroundColor: colors.green[500],
            color: "#ffffff",
          },
          colorSecondary: {
            backgroundColor: colors.forest[500],
            color: "#ffffff",
          },
        },
      },

      // Tooltip customizations
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor:
              baseTheme.palette.mode === "light"
                ? colors.gray[800]
                : colors.gray[700],
            fontSize: "0.875rem",
            borderRadius: 8,
          },
        },
      },
    },
  });

// Export enhanced themes
export const lightThemeEnhanced = createEnhancedTheme(lightTheme);
export const darkThemeEnhanced = createEnhancedTheme(darkTheme);

// Export color palette for use in components
export { colors };

// Theme mode context type
export type ThemeMode = "light" | "dark";
