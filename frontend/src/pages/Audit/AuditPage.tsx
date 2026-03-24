import { useState, useEffect, useCallback } from "react";
import { Table, Select, Tag, DatePicker, message } from "antd";
import type { Dayjs } from "dayjs";
import type { AuditLogRead, UserRead } from "@/api/types";
import { getAuditLogs } from "@/api/audit";
import { getUsers } from "@/api/users";
import dayjs from "dayjs";

const ACTION_COLORS: Record<string, string> = {
  create: "green",
  update: "blue",
  delete: "red",
  archive: "orange",
  restore: "cyan",
  payment: "purple",
  update_payment: "blue",
  delete_payment: "red",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  asset: "Актив",
  user: "Пользователь",
  organization: "Организация",
  project: "Проект",
  currency: "Валюта",
  asset_type: "Тип актива",
  permission: "Право доступа",
  setting: "Настройка",
};

const ENTITY_TYPE_OPTIONS = Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const ACTION_OPTIONS = [
  { value: "create", label: "Создание" },
  { value: "update", label: "Изменение" },
  { value: "delete", label: "Удаление" },
  { value: "archive", label: "Архивирование" },
  { value: "restore", label: "Восстановление" },
  { value: "payment", label: "Платёж" },
  { value: "update_payment", label: "Изменение платежа" },
  { value: "delete_payment", label: "Удаление платежа" },
];

const ACTION_LABELS: Record<string, string> = {
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
  archive: "Архивирование",
  restore: "Восстановление",
  payment: "Платёж",
  update_payment: "Изменение платежа",
  delete_payment: "Удаление платежа",
};

export default function AuditPage() {
  const [data, setData] = useState<AuditLogRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRead[]>([]);

  // Filters
  const [entityType, setEntityType] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [filterUserId, setFilterUserId] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  useEffect(() => {
    getUsers({ size: 100 })
      .then((res) => setUsers(res.items))
      .catch(() => {});
  }, []);

  const userMap = new Map(users.map((u) => [u.id, u.email]));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        page,
        size: pageSize,
        entity_type: entityType || undefined,
        action: action || undefined,
        user_id: filterUserId,
        date_from: dateFrom,
        date_to: dateTo,
      });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error("Ошибка загрузки журнала аудита");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entityType, action, filterUserId, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [entityType, action, filterUserId, dateFrom, dateTo]);

  const columns = [
    {
      title: "Дата",
      dataIndex: "created_at",
      width: 160,
      render: (v: string) => dayjs(v).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Пользователь",
      dataIndex: "user_id",
      width: 200,
      render: (id: number) => userMap.get(id) ?? id,
    },
    {
      title: "Действие",
      dataIndex: "action",
      width: 160,
      render: (v: string) => (
        <Tag color={ACTION_COLORS[v] ?? "default"}>{ACTION_LABELS[v] ?? v}</Tag>
      ),
    },
    {
      title: "Тип объекта",
      dataIndex: "entity_type",
      width: 150,
      render: (v: string) => ENTITY_TYPE_LABELS[v] ?? v,
    },
    { title: "ID объекта", dataIndex: "entity_id", width: 110 },
  ];

  const expandedRowRender = (record: AuditLogRead) => {
    if (!record.old_values && !record.new_values) {
      return <span style={{ color: "#999" }}>Нет данных об изменениях</span>;
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <strong style={{ display: "block", marginBottom: 4 }}>Было</strong>
          <pre
            style={{
              background: "#f5f5f5",
              padding: 12,
              borderRadius: 6,
              maxHeight: 200,
              overflow: "auto",
              margin: 0,
              fontSize: 13,
            }}
          >
            {record.old_values
              ? JSON.stringify(record.old_values, null, 2)
              : "—"}
          </pre>
        </div>
        <div>
          <strong style={{ display: "block", marginBottom: 4 }}>Стало</strong>
          <pre
            style={{
              background: "#f5f5f5",
              padding: 12,
              borderRadius: 6,
              maxHeight: 200,
              overflow: "auto",
              margin: 0,
              fontSize: 13,
            }}
          >
            {record.new_values
              ? JSON.stringify(record.new_values, null, 2)
              : "—"}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Журнал аудита</h1>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <Select
            placeholder="Тип объекта"
            allowClear
            style={{ width: 200 }}
            value={entityType}
            onChange={(v) => setEntityType(v ?? undefined)}
            options={ENTITY_TYPE_OPTIONS}
          />
          <Select
            placeholder="Действие"
            allowClear
            style={{ width: 200 }}
            value={action}
            onChange={(v) => setAction(v ?? undefined)}
            options={ACTION_OPTIONS}
          />
          <Select
            placeholder="Пользователь"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 240 }}
            value={filterUserId}
            onChange={(v) => setFilterUserId(v ?? undefined)}
            options={users.map((u) => ({ value: u.id, label: u.email }))}
          />
          <DatePicker
            placeholder="Дата с"
            format="DD.MM.YYYY"
            allowClear
            onChange={(d: Dayjs | null) => setDateFrom(d ? d.format("YYYY-MM-DD") : undefined)}
            style={{ width: 150 }}
          />
          <DatePicker
            placeholder="Дата по"
            format="DD.MM.YYYY"
            allowClear
            onChange={(d: Dayjs | null) => setDateTo(d ? d.format("YYYY-MM-DD") : undefined)}
            style={{ width: 150 }}
          />
        </div>
        <div className="card__body card__body--flush">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            expandable={{ expandedRowRender }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              onChange: (p, s) => {
                setPage(p);
                setPageSize(s);
              },
            }}
          />
        </div>
      </div>
    </>
  );
}
