import { useState, useEffect, useCallback } from "react";
import { Badge, Popover, List, Button, Empty } from "antd";
import { BellOutlined, CheckOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/api/notifications";
import type { NotificationRead } from "@/api/types";
import dayjs from "dayjs";

export default function NotificationBell() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationRead[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setCount(data.count);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const fetchRecent = async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ page: 1, size: 5 });
      setItems(data.items);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (visible: boolean) => {
    setOpen(visible);
    if (visible) fetchRecent();
  };

  const handleMarkRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setCount(0);
  };

  const content = (
    <div style={{ width: 360 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid #e4e4e4",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>Уведомления</span>
        {count > 0 && (
          <Button type="link" size="small" onClick={handleMarkAll}>
            Прочитать все
          </Button>
        )}
      </div>
      <List
        loading={loading}
        dataSource={items}
        locale={{ emptyText: <Empty description="Нет уведомлений" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        renderItem={(item) => (
          <div
            style={{
              padding: "10px 12px",
              cursor: "pointer",
              background: item.is_read ? "transparent" : "#f0f7ff",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: item.is_read ? 400 : 600, fontSize: 13 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#6a6d70", marginTop: 2 }}>
                {dayjs(item.created_at).format("DD.MM.YYYY HH:mm")}
              </div>
            </div>
            {!item.is_read && (
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={(e) => handleMarkRead(item.id, e)}
                style={{ color: "#0a6ed1" }}
              />
            )}
          </div>
        )}
      />
      <div style={{ textAlign: "center", padding: 8, borderTop: "1px solid #e4e4e4" }}>
        <Button
          type="link"
          size="small"
          onClick={() => {
            setOpen(false);
            navigate("/notifications");
          }}
        >
          Все уведомления
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      arrow={false}
      overlayInnerStyle={{ padding: 0, borderRadius: 8, overflow: "hidden" }}
    >
      <button className="shell-bar__action">
        <Badge count={count} size="small" offset={[2, -2]}>
          <BellOutlined style={{ fontSize: 18, color: "rgba(255,255,255,0.85)" }} />
        </Badge>
      </button>
    </Popover>
  );
}
