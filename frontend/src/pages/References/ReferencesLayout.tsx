import { Tabs } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const TAB_ITEMS = [
  { key: "/references/organizations", label: "Организации" },
  { key: "/references/projects", label: "Проекты" },
  { key: "/references/asset-types", label: "Типы активов" },
  { key: "/references/currencies", label: "Валюты" },
  { key: "/references/renewal-periods", label: "Периоды продления" },
];

export default function ReferencesLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey =
    TAB_ITEMS.find((t) => location.pathname.startsWith(t.key))?.key ??
    "/references/organizations";

  return (
    <div className="fiori-tabs">
      <Tabs
        activeKey={activeKey}
        items={TAB_ITEMS}
        onChange={(key) => navigate(key)}
        style={{ marginBottom: 16 }}
      />
      <Outlet />
    </div>
  );
}
