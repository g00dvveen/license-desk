import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  InboxOutlined,
  DownloadOutlined,
  UndoOutlined,
  BellOutlined,
} from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig, SorterResult } from "antd/es/table/interface";
import dayjs from "dayjs";
import "dayjs/locale/ru";
dayjs.locale("ru");

import { getAssets, archiveAsset, restoreAsset } from "@/api/assets";
import {
  getOrganizations,
  getProjects,
  getAssetTypes,
  getCurrencies,
} from "@/api/references";
import { exportAssets } from "@/api/exportApi";
import type {
  AssetRead,
  OrganizationRead,
  ProjectRead,
  AssetTypeRead,
  CurrencyRead,
} from "@/api/types";
import AssetFormModal from "./AssetFormModal";

function getPaymentBadgeClass(dateStr: string): string {
  const now = dayjs();
  const target = dayjs(dateStr);
  const diff = target.diff(now, "day");
  if (diff <= 7) return "status-badge status-badge--error";
  if (diff <= 30) return "status-badge status-badge--warning";
  return "status-badge status-badge--success";
}

export default function AssetListPage({ archived = false }: { archived?: boolean }) {
  const navigate = useNavigate();

  const [assets, setAssets] = useState<AssetRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterTypeId, setFilterTypeId] = useState<number | undefined>();
  const [filterOrgId, setFilterOrgId] = useState<number | undefined>();
  const [filterProjectId, setFilterProjectId] = useState<number | undefined>();
  const [filterCurrencyId, setFilterCurrencyId] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<string | undefined>();

  const [organizations, setOrganizations] = useState<OrganizationRead[]>([]);
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeRead[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRead[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRead | null>(null);
  const [exporting, setExporting] = useState(false);

  // Build lookup maps
  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const typeMap = new Map(assetTypes.map((t) => [t.id, t.name]));
  const currencyMap = new Map(currencies.map((c) => [c.id, c.symbol]));

  // Load references on mount
  useEffect(() => {
    Promise.all([
      getOrganizations({ size: 100 }),
      getProjects({ size: 100 }),
      getAssetTypes({ size: 100 }),
      getCurrencies({ size: 100 }),
    ])
      .then(([orgs, prjs, types, curs]) => {
        setOrganizations(orgs.items);
        setProjects(prjs.items);
        setAssetTypes(types.items);
        setCurrencies(curs.items);
      })
      .catch(() => message.error("Не удалось загрузить справочники"));
  }, []);

  const fetchAssets = useCallback(() => {
    setLoading(true);
    getAssets({
      page,
      size,
      search: search || undefined,
      type_id: filterTypeId,
      organization_id: filterOrgId,
      project_id: filterProjectId,
      currency_id: filterCurrencyId,
      is_archived: archived,
      sort_by: sortBy,
      sort_order: sortOrder,
    })
      .then((res) => {
        setAssets(res.items);
        setTotal(res.total);
      })
      .catch(() => message.error("Не удалось загрузить активы"))
      .finally(() => setLoading(false));
  }, [page, size, search, filterTypeId, filterOrgId, filterProjectId, filterCurrencyId, archived, sortBy, sortOrder]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // KPI calculations
  const kpis = useMemo(() => {
    const uniqueOrgs = new Set(assets.map((a) => a.organization_id));
    const uniqueTypes = new Set(assets.map((a) => a.type_id));

    const upcomingPayments = assets
      .filter((a) => a.next_payment_date)
      .map((a) => dayjs(a.next_payment_date!))
      .filter((d) => d.isAfter(dayjs()))
      .sort((a, b) => a.unix() - b.unix());

    const nearest = upcomingPayments.length > 0 ? upcomingPayments[0] : null;

    const monthStart = dayjs().startOf("month");
    const monthEnd = dayjs().endOf("month");
    const paymentsThisMonth = assets.filter(
      (a) => a.next_payment_date && dayjs(a.next_payment_date).isAfter(monthStart.subtract(1, "day")) && dayjs(a.next_payment_date).isBefore(monthEnd.add(1, "day"))
    ).length;

    return {
      totalAssets: total,
      orgCount: uniqueOrgs.size,
      typeCount: uniqueTypes.size,
      nearestPayment: nearest,
      paymentsThisMonth,
    };
  }, [assets, total]);

  function handleTableChange(
    pagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<AssetRead> | SorterResult<AssetRead>[],
  ) {
    setPage(pagination.current ?? 1);
    setSize(pagination.pageSize ?? 20);
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s?.order) {
      setSortBy(s.columnKey as string);
      setSortOrder(s.order === "descend" ? "desc" : "asc");
    } else {
      setSortBy(undefined);
      setSortOrder(undefined);
    }
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function handleSearch(value: string) {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  }

  function handleArchive(id: number) {
    archiveAsset(id)
      .then(() => {
        message.success("Актив перемещён в архив");
        fetchAssets();
      })
      .catch(() => message.error("Не удалось архивировать актив"));
  }

  function handleRestore(id: number) {
    restoreAsset(id)
      .then(() => {
        message.success("Актив восстановлен");
        fetchAssets();
      })
      .catch(() => message.error("Не удалось восстановить актив"));
  }

  function openCreate() {
    setEditingAsset(null);
    setModalOpen(true);
  }

  function openEdit(asset: AssetRead) {
    setEditingAsset(asset);
    setModalOpen(true);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportAssets({
        type_id: filterTypeId ?? null,
        organization_id: filterOrgId ?? null,
        project_id: filterProjectId ?? null,
        currency_id: filterCurrencyId ?? null,
        search: search || null,
        is_archived: archived,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `assets_${dayjs().format("YYYY-MM-DD")}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error("Не удалось экспортировать данные");
    } finally {
      setExporting(false);
    }
  }

  const columns: ColumnsType<AssetRead> = [
    {
      title: "Наименование",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      sorter: true,
      render: (name: string, record: AssetRead) => (
        <span>
          {name}
          {!archived && !record.notifications_enabled && (
            <sup><BellOutlined style={{ color: "var(--error)", fontSize: 11 }} title="Уведомления отключены" /></sup>
          )}
        </span>
      ),
    },
    {
      title: "Тип",
      dataIndex: "type_id",
      key: "type_id",
      sorter: true,
      render: (id: number) => typeMap.get(id) ?? id,
    },
    {
      title: "Организация",
      dataIndex: "organization_id",
      key: "organization_id",
      sorter: true,
      render: (id: number) => orgMap.get(id) ?? id,
    },
    {
      title: "Проект",
      dataIndex: "project_id",
      key: "project_id",
      ellipsis: true,
      sorter: true,
      render: (id: number | null) => (id ? projectMap.get(id) ?? id : "\u2014"),
    },
    {
      title: "Стоимость",
      dataIndex: "cost",
      key: "cost",
      align: "right",
      sorter: true,
      render: (_val: number, record: AssetRead) => {
        const symbol = currencyMap.get(record.currency_id) ?? "";
        return `${_val.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ${symbol}`;
      },
    },
    {
      title: "Дата покупки",
      dataIndex: "purchase_date",
      key: "purchase_date",
      sorter: true,
      render: (d: string) => dayjs(d).format("DD.MM.YYYY"),
    },
    {
      title: "Следующий платёж",
      dataIndex: "next_payment_date",
      key: "next_payment_date",
      sorter: true,
      render: (d: string | null) =>
        d ? (
          <span className={archived ? "status-badge status-badge--neutral" : getPaymentBadgeClass(d)}>
            {dayjs(d).format("DD.MM.YYYY")}
          </span>
        ) : (
          "\u2014"
        ),
    },
    {
      title: "Действия",
      key: "actions",
      width: 120,
      render: (_: unknown, record: AssetRead) => (
        <Space size="small">
          {!archived && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openEdit(record);
              }}
            />
          )}
          {archived ? (
            <Popconfirm
              title="Восстановить актив?"
              onConfirm={(e) => {
                e?.stopPropagation();
                handleRestore(record.id);
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="Восстановить"
              cancelText="Отмена"
            >
              <Button
                type="text"
                icon={<UndoOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Архивировать актив?"
              onConfirm={(e) => {
                e?.stopPropagation();
                handleArchive(record.id);
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="Архивировать"
              cancelText="Отмена"
            >
              <Button
                type="text"
                danger
                icon={<InboxOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">{archived ? "Архивные активы" : "Текущие активы"}</h1>
          <span className="page-header__subtitle">Всего: {total}</span>
        </div>
        {!archived && (
          <div className="page-header__actions">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
            >
              Экспорт
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Добавить актив
            </Button>
          </div>
        )}
      </div>

      {/* KPI Tiles */}
      {!archived && <div className="kpi-grid">
        <div className="kpi-tile">
          <span className="kpi-tile__label">Всего активов</span>
          <span className="kpi-tile__value">{kpis.totalAssets}</span>
          <span className="kpi-tile__footer">На текущий момент</span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-tile__label">Платежей в этом месяце</span>
          <span className="kpi-tile__value">{kpis.paymentsThisMonth}</span>
          <span className="kpi-tile__footer">{dayjs().format("MMMM YYYY").replace(/^./, (c) => c.toUpperCase())}</span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-tile__label">Ближайший платёж</span>
          <span className="kpi-tile__value">
            {kpis.nearestPayment
              ? kpis.nearestPayment.format("DD.MM.YYYY")
              : "\u2014"}
          </span>
          <span className="kpi-tile__footer">
            {kpis.nearestPayment
              ? `Через ${kpis.nearestPayment.diff(dayjs(), "day")} дн.`
              : "Нет предстоящих"}
          </span>
        </div>
      </div>}

      {/* Table Card */}
      <div className="card">
        <div className="card__body--flush">
          {/* Toolbar */}
          <div className="toolbar">
            <Input
              placeholder="Поиск по наименованию или комментарию"
              allowClear
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 260 }}
            />
            <Select
              placeholder="Тип актива"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 180 }}
              value={filterTypeId}
              onChange={(v) => {
                setFilterTypeId(v);
                setPage(1);
              }}
              options={assetTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
            <Select
              placeholder="Организация"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 180 }}
              value={filterOrgId}
              onChange={(v) => {
                setFilterOrgId(v);
                setPage(1);
              }}
              options={organizations.map((o) => ({ value: o.id, label: o.name }))}
            />
            <Select
              placeholder="Проект"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 180 }}
              value={filterProjectId}
              onChange={(v) => {
                setFilterProjectId(v);
                setPage(1);
              }}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
            <Select
              placeholder="Валюта"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 180 }}
              value={filterCurrencyId}
              onChange={(v) => {
                setFilterCurrencyId(v);
                setPage(1);
              }}
              options={currencies.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.symbol})`,
              }))}
            />
          </div>

          <Table<AssetRead>
            rowKey="id"
            columns={columns}
            dataSource={assets}
            loading={loading}
            pagination={{
              current: page,
              pageSize: size,
              total,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (t) => `Всего: ${t}`,
            }}
            onChange={handleTableChange}
            onRow={(record) => ({
              onClick: () => navigate(archived ? `/archived-assets/${record.id}` : `/assets/${record.id}`),
              style: { cursor: "pointer" },
            })}
          />
        </div>
      </div>

      <AssetFormModal
        open={modalOpen}
        asset={editingAsset}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchAssets}
      />
    </div>
  );
}
