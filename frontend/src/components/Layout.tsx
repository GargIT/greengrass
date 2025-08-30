import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "../theme";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Home as HouseholdIcon,
  Water as UtilityIcon,
  Speed as MeterIcon,
  Receipt as BillingIcon,
  Assessment as ReportsIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

const drawerWidth = 240;
const collapsedDrawerWidth = 60;

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
  fullWidth?: boolean; // Allow pages to use full width - collapses drawer to icons only
}

const menuItems = [
  {
    text: "Översikt",
    icon: <DashboardIcon />,
    path: "/",
    roles: ["ADMIN", "MEMBER"],
  },
  {
    text: "Användare",
    icon: <PeopleIcon />,
    path: "/users",
    roles: ["ADMIN"],
  },
  {
    text: "Hushåll",
    icon: <HouseholdIcon />,
    path: "/households",
    roles: ["ADMIN"],
  },
  {
    text: "Tjänster",
    icon: <UtilityIcon />,
    path: "/utility-services",
    roles: ["ADMIN"],
  },
  {
    text: "Mätaravläsningar",
    icon: <MeterIcon />,
    path: "/meter-readings",
    roles: ["ADMIN", "MEMBER"],
  },
  {
    text: "Fakturering",
    icon: <BillingIcon />,
    path: "/billing",
    roles: ["ADMIN", "MEMBER"],
  },
  {
    text: "Rapporter",
    icon: <ReportsIcon />,
    path: "/reports",
    roles: ["ADMIN", "MEMBER"],
  },
  {
    text: "Systemadmin",
    icon: <SettingsIcon />,
    path: "/system-admin",
    roles: ["ADMIN"],
  },
];

const Layout: React.FC<LayoutProps> = ({
  children,
  onLogout,
  fullWidth = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(fullWidth);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Get user from localStorage
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  // Update drawer collapsed state when fullWidth prop changes
  useEffect(() => {
    setDrawerCollapsed(fullWidth);
  }, [fullWidth]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerCollapse = () => {
    setDrawerCollapsed(!drawerCollapsed);
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    if (onLogout) {
      onLogout();
    }
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" color="primary">
          {drawerCollapsed ? "GG" : "Gröngräset"}
        </Typography>
      </Toolbar>
      <List>
        {menuItems
          .filter((item) => !user || item.roles.includes(user.role))
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <Tooltip
                title={drawerCollapsed ? item.text : ""}
                placement="right"
                arrow
              >
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleMenuClick(item.path)}
                  sx={{
                    minHeight: 48,
                    justifyContent: drawerCollapsed ? "center" : "initial",
                    px: 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color:
                        location.pathname === item.path
                          ? "primary.main"
                          : "inherit",
                      minWidth: 0,
                      mr: drawerCollapsed ? 0 : 3,
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!drawerCollapsed && <ListItemText primary={item.text} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: {
            sm: `calc(100% - ${
              drawerCollapsed ? collapsedDrawerWidth : drawerWidth
            }px)`,
          },
          ml: {
            sm: `${drawerCollapsed ? collapsedDrawerWidth : drawerWidth}px`,
          },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Samfällighetsförening Gröngräset - Förvaltningssystem
          </Typography>

          {/* User Menu */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Theme Toggle */}
            <ThemeToggle color="inherit" size="medium" />

            {user && (
              <Chip
                label={user.role}
                size="small"
                color={user.role === "ADMIN" ? "secondary" : "default"}
                sx={{ color: "white", borderColor: "white" }}
              />
            )}
            <IconButton
              color="inherit"
              onClick={handleUserMenuOpen}
              aria-label="user menu"
            >
              <AccountIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              {user && (
                <MenuItem disabled>
                  <Box>
                    <Typography variant="body2">
                      {user.firstName} {user.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logga ut
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          width: { sm: drawerCollapsed ? collapsedDrawerWidth : drawerWidth },
          flexShrink: { sm: 0 },
        }}
        aria-label="navigation menu"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerCollapsed ? collapsedDrawerWidth : drawerWidth,
              transition: (theme) =>
                theme.transitions.create("width", {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Floating drawer toggle button positioned on border between drawer and header */}
      {!isMobile && (
        <IconButton
          onClick={handleDrawerCollapse}
          sx={{
            position: "fixed",
            left: drawerCollapsed
              ? collapsedDrawerWidth - 16
              : drawerWidth - 16,
            top: 16, // Position in the middle of the AppBar (64px height, so 16px from top)
            backgroundColor: "primary.main",
            color: "white",
            border: "2px solid white",
            boxShadow: 3,
            width: 32,
            height: 32,
            zIndex: 1300, // High z-index to ensure visibility
            transition: (theme) =>
              theme.transitions.create("left", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            "&:hover": {
              backgroundColor: "primary.dark",
              boxShadow: 6,
            },
          }}
        >
          {drawerCollapsed ? (
            <ChevronRightIcon fontSize="small" />
          ) : (
            <ChevronLeftIcon fontSize="small" />
          )}
        </IconButton>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0, // Remove all padding to allow full width usage
          width: {
            sm: `calc(100vw - ${
              drawerCollapsed ? collapsedDrawerWidth : drawerWidth
            }px)`,
          },
          minHeight: "100vh",
          height: "100vh", // Full viewport height
          backgroundColor: "background.default",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden", // Prevent content overflow
          transition: (theme) =>
            theme.transitions.create(["margin", "width"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        <Toolbar />
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "auto", // Allow content to scroll if needed
            width: "100%",
            p: 0, // Remove all padding to allow pages to handle their own spacing
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
