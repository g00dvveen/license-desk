import { useState, useEffect, useCallback } from "react";
import { Button, List, Spin, message } from "antd";
import type { NotificationRead } from "@/api/types";
import { getNotifications, markAsRead, markAllAsRead } from "@/api/notifications";
import dayjs from "dayjs";

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ page, size: pageSize });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error("Ошибка загрузки уведомлений");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id);
      fetchData();
    } catch {
      message.error("Ошибка отметки уведомления");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      message.success("Все уведомления отмечены как прочитанные");
      fetchData();
    } catch {
      message.error("Ошибка отметки уведомлений");
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Уведомления</h1>
        </div>
        <div className="page-header__actions">
          <Button onClick={handleMarkAllAsRead}>
            Прочитать все
          </Button>
        </div>
      </div>

      <div className="card">
        <div className="card__body card__body--flush">
          <Spin spinning={loading}>
            <List
              dataSource={data}
              split
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                onChange: (p, s) => {
                  setPage(p);
                  setPageSize(s);
                },
                style: { padding: "12px 16px", margin: 0 },
              }}
              renderItem={(item: NotificationRead) => (
                <List.Item
                  style={{
                    padding: "12px 16px",
                    cursor: item.is_read ? "default" : "pointer",
                    alignItems: "flex-start",
                  }}
                  onClick={() => {
                    if (!item.is_read) handleMarkAsRead(item.id);
                  }}
                >
                  <div style={{ display: "flex", gap: 12, width: "100%" }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: item.is_read ? "#d9d9d9" : "#1677ff",
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: item.is_read ? 400 : 600,
                          marginBottom: 2,
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ color: "#666", fontSize: 13 }}>
                        {item.message}
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#999",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {dayjs(item.created_at).format("DD.MM.YYYY HH:mm")}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Spin>
        </div>
      </div>
    </>
  );
}
