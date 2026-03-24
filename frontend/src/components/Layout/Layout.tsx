import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Dropdown, type MenuProps } from "antd";
import {
  AppstoreOutlined,
  InboxOutlined,
  BookOutlined,
  SettingOutlined,
  LogoutOutlined,
  TeamOutlined,
  AuditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../auth/AuthContext";
import NotificationBell from "../NotificationBell";

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  group: string;
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems: NavItem[] = [
    { key: "/assets", icon: <AppstoreOutlined />, label: "Текущие активы", group: "main" },
    { key: "/archived-assets", icon: <InboxOutlined />, label: "Архивные активы", group: "main" },
    { key: "/references", icon: <BookOutlined />, label: "Справочники", group: "main" },
    ...(user?.is_superuser || user?.role === "manager"
      ? [
          { key: "/users", icon: <TeamOutlined />, label: "Пользователи", group: "admin" },
          { key: "/audit", icon: <AuditOutlined />, label: "Аудит", group: "admin" },
        ]
      : []),
    ...(user?.is_superuser
      ? [
          { key: "/settings", icon: <SettingOutlined />, label: "Настройки", group: "admin" },
        ]
      : []),
  ];

  const activeKey = "/" + location.pathname.split("/")[1];

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const userMenuItems: MenuProps["items"] = [
    {
      key: "user-info",
      label: (
        <div style={{ padding: "4px 0" }}>
          <div style={{ fontWeight: 600 }}>{user?.full_name}</div>
          <div style={{ fontSize: 12, color: "#6a6d70" }}>{user?.email}</div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "profile",
      icon: <TeamOutlined />,
      label: "Профиль",
      onClick: () => navigate("/profile"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Выйти",
      danger: true,
      onClick: logout,
    },
  ];

  const groups = user?.is_superuser || user?.role === "manager" ? ["main", "admin"] : ["main"];
  const groupLabels: Record<string, string> = {
    admin: "Администрирование",
  };

  return (
    <div className="app-layout">
      {/* Shell Bar */}
      <div className="shell-bar">
        <div className="shell-bar__logo">
          <div className="shell-bar__logo-icon">L</div>
          {!collapsed && "LicenseDesk"}
        </div>
        <div className="shell-bar__spacer" />
        <div className="shell-bar__actions">
          <NotificationBell />
          <Dropdown menu={{ items: userMenuItems }} trigger={["click"]} placement="bottomRight">
            <div className="shell-bar__user">
              {user?.avatar_url ? (
                <img src={user.avatar_url} className="shell-bar__avatar" alt="" />
              ) : (
                <div className="shell-bar__avatar">{initials}</div>
              )}
              {user?.full_name || user?.email}
            </div>
          </Dropdown>
        </div>
      </div>

      {/* Body */}
      <div className="app-body">
        {/* Sidebar */}
        <nav className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
          <div className="sidebar__nav">
            {groups.map((group) => (
              <div key={group}>
                {!collapsed && groupLabels[group] && (
                  <div className="sidebar__group-label">{groupLabels[group]}</div>
                )}
                {navItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <button
                      key={item.key}
                      className={`sidebar__item ${activeKey === item.key ? "sidebar__item--active" : ""}`}
                      onClick={() => navigate(item.key)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="sidebar__item-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
          <button className="sidebar__toggle" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </nav>

        {/* Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
