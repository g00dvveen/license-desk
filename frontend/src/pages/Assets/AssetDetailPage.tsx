import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Tabs,
  Descriptions,
  Table,
  Space,
  Popconfirm,
  Spin,
  message,
  Modal,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Tag,
  Switch,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  InboxOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import {
  getAsset,
  updateAsset,
  archiveAsset,
  deleteAsset,
  updatePayment,
  deletePayment,
  uploadInvoice,
  deleteInvoice,
  getStorageInfo,
  getCostHistory,
  getPayments,
  createPayment,
  getNotificationSettings,
  updateNotificationSettings,
} from "@/api/assets";
import {
  getOrganizations,
  getProjects,
  getAssetTypes,
  getCurrencies,
  getRenewalPeriods,
} from "@/api/references";
import { getUsers } from "@/api/users";
import type {
  AssetRead,
  CostHistoryRead,
  PaymentRead,
  AssetNotificationSettingRead,
  OrganizationRead,
  ProjectRead,
  AssetTypeRead,
  CurrencyRead,
  RenewalPeriodRead,
  UserRead,
  AssetTypeFieldRead,
} from "@/api/types";
import AssetFormModal from "./AssetFormModal";

export default function AssetDetailPage({ archived = false }: { archived?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetId = Number(id);

  const [asset, setAsset] = useState<AssetRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // References
  const [organizations, setOrganizations] = useState<OrganizationRead[]>([]);
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeRead[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRead[]>([]);
  const [renewalPeriods, setRenewalPeriods] = useState<RenewalPeriodRead[]>([]);
  const [users, setUsers] = useState<UserRead[]>([]);
  const [typeFields, setTypeFields] = useState<AssetTypeFieldRead[]>([]);

  // Tabs data
  const [costHistory, setCostHistory] = useState<CostHistoryRead[]>([]);
  const [costLoading, setCostLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentRead[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [notifications, setNotifications] = useState<AssetNotificationSettingRead[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRead | null>(null);
  const [paymentForm] = Form.useForm();

  const [s3Enabled, setS3Enabled] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const [invoiceUploadingId, setInvoiceUploadingId] = useState<number | null>(null);
  const [newInvoiceFile, setNewInvoiceFile] = useState<File | null>(null);
  const newInvoiceInputRef = useRef<HTMLInputElement>(null);

  // Notification form
  const [notifForm] = Form.useForm();
  const [notifSaving, setNotifSaving] = useState(false);

  // Lookup maps
  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const typeMap = new Map(assetTypes.map((t) => [t.id, t.name]));
  const currencyMap = new Map(currencies.map((c) => [c.id, `${c.name} (${c.symbol})`]));
  const currencySymbolMap = new Map(currencies.map((c) => [c.id, c.symbol]));
  const renewalMap = new Map(renewalPeriods.map((r) => [r.id, r.name]));
  const userMap = new Map(users.map((u) => [u.id, u.full_name]));

  const loadAsset = useCallback(() => {
    setLoading(true);
    getAsset(assetId)
      .then((data) => {
        setAsset(data);
        loadCostHistory();
      })
      .catch(() => message.error("Не удалось загрузить актив"))
      .finally(() => setLoading(false));
  }, [assetId]);

  useEffect(() => {
    Promise.all([
      getOrganizations({ size: 100 }),
      getProjects({ size: 100 }),
      getAssetTypes({ size: 100 }),
      getCurrencies({ size: 100 }),
      getRenewalPeriods({ size: 100 }),
      getUsers({ size: 100 }),
    ])
      .then(([orgs, prjs, types, curs, rps, usrs]) => {
        setOrganizations(orgs.items);
        setProjects(prjs.items);
        setAssetTypes(types.items);
        setCurrencies(curs.items);
        setRenewalPeriods(rps.items);
        setUsers(usrs.items);
      })
      .catch(() => message.error("Не удалось загрузить справочники"));
    getStorageInfo().then((info) => setS3Enabled(info.s3_enabled)).catch(() => {});
    loadAsset();
  }, [loadAsset]);

  // Load type fields when asset is loaded
  useEffect(() => {
    if (!asset) return;
    const at = assetTypes.find((t) => t.id === asset.type_id);
    if (at) {
      setTypeFields(at.fields.filter((f) => !f.is_hidden));
    }
  }, [asset, assetTypes]);

  function handleArchive() {
    archiveAsset(assetId)
      .then(() => {
        message.success("Актив перемещён в архив");
        navigate("/assets");
      })
      .catch(() => message.error("Не удалось архивировать актив"));
  }

  function handleDelete() {
    deleteAsset(assetId)
      .then(() => {
        message.success("Актив удалён");
        navigate("/archived-assets");
      })
      .catch(() => message.error("Не удалось удалить актив"));
  }

  // -- Cost History --
  function loadCostHistory() {
    setCostLoading(true);
    getCostHistory(assetId)
      .then(setCostHistory)
      .catch(() => message.error("Не удалось загрузить историю стоимости"))
      .finally(() => setCostLoading(false));
  }

  const costColumns: ColumnsType<CostHistoryRead> = [
    {
      title: "Дата",
      dataIndex: "changed_at",
      key: "changed_at",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Старое значение",
      dataIndex: "old_value",
      key: "old_value",
      align: "right",
      render: (v: number, record: CostHistoryRead) => {
        const cid = record.old_currency_id ?? record.currency_id;
        const symbol = currencySymbolMap.get(cid) ?? "";
        return `${v.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ${symbol}`;
      },
    },
    {
      title: "Новое значение",
      dataIndex: "new_value",
      key: "new_value",
      align: "right",
      render: (v: number, record: CostHistoryRead) => {
        const symbol = currencySymbolMap.get(record.currency_id) ?? "";
        const currencyChanged = !!record.old_currency_id;
        const color = !currencyChanged
          ? v > record.old_value ? "#e74c3c" : v < record.old_value ? "#27ae60" : undefined
          : undefined;
        return (
          <span style={color ? { color, fontWeight: 500 } : undefined}>
            {v.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} {symbol}
          </span>
        );
      },
    },
    {
      title: "Изменение",
      key: "diff",
      align: "right",
      render: (_: unknown, record: CostHistoryRead) => {
        if (record.old_currency_id) return "Смена валюты";
        const diff = record.new_value - record.old_value;
        const symbol = currencySymbolMap.get(record.currency_id) ?? "";
        if (diff === 0) return "\u2014";
        const color = diff > 0 ? "#e74c3c" : "#27ae60";
        const prefix = diff > 0 ? "+" : "";
        return (
          <span style={{ color, fontWeight: 500 }}>
            {prefix}{diff.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} {symbol}
          </span>
        );
      },
    },
    {
      title: "Кем изменено",
      dataIndex: "changed_by",
      key: "changed_by",
      render: (id: number) => userMap.get(id) ?? id,
    },
  ];

  // -- Payments --
  function loadPayments() {
    setPaymentsLoading(true);
    getPayments(assetId)
      .then(setPayments)
      .catch(() => message.error("Не удалось загрузить платежи"))
      .finally(() => setPaymentsLoading(false));
  }

  async function handlePaymentSubmit() {
    try {
      const values = await paymentForm.validateFields();
      setPaymentSubmitting(true);
      if (editingPayment) {
        await updatePayment(editingPayment.id, {
          date: (values.date as dayjs.Dayjs).format("YYYY-MM-DD"),
          amount: values.amount,
          currency_id: values.currency_id,
          comment: values.comment || null,
        });
      } else {
        const created = await createPayment(assetId, {
          date: (values.date as dayjs.Dayjs).format("YYYY-MM-DD"),
          amount: values.amount,
          currency_id: values.currency_id,
          comment: values.comment || null,
          next_payment_date: values.next_payment_date
            ? (values.next_payment_date as dayjs.Dayjs).format("YYYY-MM-DD")
            : null,
        });
        if (newInvoiceFile && s3Enabled) {
          try {
            await uploadInvoice(created.id, newInvoiceFile);
          } catch {
            message.warning("Платёж создан, но инвойс не удалось загрузить");
          }
        }
      }
      message.success(editingPayment ? "Платёж обновлён" : "Платёж добавлен");
      setPaymentModalOpen(false);
      setEditingPayment(null);
      setNewInvoiceFile(null);
      paymentForm.resetFields();
      loadPayments();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      message.error("Не удалось сохранить платёж");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function handleInvoiceUpload(paymentId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setInvoiceUploadingId(paymentId);
    try {
      const updated = await uploadInvoice(paymentId, file);
      message.success("Инвойс загружен");
      loadPayments();
      if (editingPayment?.id === paymentId) {
        setEditingPayment(updated);
      }
    } catch {
      message.error("Не удалось загрузить инвойс");
    } finally {
      setInvoiceUploadingId(null);
      if (invoiceInputRef.current) invoiceInputRef.current.value = "";
    }
  }

  async function handleDeleteInvoice(paymentId: number) {
    try {
      await deleteInvoice(paymentId);
      message.success("Инвойс удалён");
      loadPayments();
    } catch {
      message.error("Не удалось удалить инвойс");
    }
  }

  function openEditPayment(record: PaymentRead) {
    setEditingPayment(record);
    paymentForm.setFieldsValue({
      date: dayjs(record.date),
      amount: record.amount,
      currency_id: record.currency_id,
      comment: record.comment,
    });
    setPaymentModalOpen(true);
  }

  async function handleDeletePayment(paymentId: number) {
    try {
      await deletePayment(paymentId);
      message.success("Платёж удалён");
      loadPayments();
    } catch {
      message.error("Не удалось удалить платёж");
    }
  }

  const paymentColumns: ColumnsType<PaymentRead> = [
    {
      title: "Дата",
      dataIndex: "date",
      key: "date",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY"),
    },
    {
      title: "Сумма",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (v: number, record: PaymentRead) => {
        const symbol = currencySymbolMap.get(record.currency_id) ?? "";
        return `${v.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ${symbol}`;
      },
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      key: "comment",
      render: (v: string | null) => v ?? "\u2014",
    },
    {
      title: "Кем создано",
      dataIndex: "created_by",
      key: "created_by",
      render: (id: number) => userMap.get(id) ?? id,
    },
    {
      title: "Дата создания",
      dataIndex: "created_at",
      key: "created_at",
      render: (d: string) => dayjs(d).format("DD.MM.YYYY HH:mm"),
    },
    ...(s3Enabled ? [{
      title: "Инвойс",
      key: "invoice",
      width: 70,
      align: "center" as const,
      render: (_: unknown, record: PaymentRead) => record.invoice_url ? (
        <Button
          type="link"
          size="small"
          icon={<FileTextOutlined />}
          href={`/api/assets/payments/${record.id}/invoice?inline=true`}
          target="_blank"
          title={record.invoice_filename || "Инвойс"}
        />
      ) : (
        <span style={{ color: "var(--text-tertiary)" }}>—</span>
      ),
    }] : []),
    {
      title: "Действия",
      key: "actions",
      width: 100,
      render: (_: unknown, record: PaymentRead) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditPayment(record)}
          />
          <Popconfirm
            title="Удалить платёж?"
            onConfirm={() => handleDeletePayment(record.id)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // -- Notifications --
  function loadNotifications() {
    setNotifLoading(true);
    getNotificationSettings(assetId)
      .then((data) => {
        setNotifications(data);
        notifForm.setFieldsValue({
          days: data.map((n) => n.days_before),
        });
      })
      .catch(() => message.error("Не удалось загрузить настройки уведомлений"))
      .finally(() => setNotifLoading(false));
  }

  async function handleNotifSave() {
    try {
      const values = await notifForm.validateFields();
      const daysList: number[] = (values.days ?? []).filter(
        (d: number | undefined) => d !== undefined && d !== null,
      );
      setNotifSaving(true);
      const updated = await updateNotificationSettings(assetId, {
        days_before: daysList,
      });
      setNotifications(updated);
      message.success("Настройки уведомлений сохранены");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      message.error("Не удалось сохранить настройки");
    } finally {
      setNotifSaving(false);
    }
  }

  function handleTabChange(key: string) {
    switch (key) {
      case "cost":
        loadCostHistory();
        break;
      case "payments":
        loadPayments();
        break;
      case "notifications":
        loadNotifications();
        break;
    }
  }

  function renderFieldValue(field: AssetTypeFieldRead, value: unknown): string {
    if (value === null || value === undefined) return "\u2014";
    switch (field.data_type) {
      case "date":
        return dayjs(String(value)).format("DD.MM.YYYY");
      case "boolean":
        return value ? "Да" : "Нет";
      default:
        return String(value);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div style={{ textAlign: "center", padding: 64 }}>
        <span style={{ color: "#8c8c8c" }}>Актив не найден</span>
      </div>
    );
  }

  const tabItems = [
    {
      key: "cost",
      label: "История стоимости",
      children: (
        <div className="card">
          <div className="card__body--flush">
            <Table<CostHistoryRead>
              rowKey="id"
              columns={costColumns}
              dataSource={costHistory}
              loading={costLoading}
              pagination={false}
            />
          </div>
        </div>
      ),
    },
    {
      key: "payments",
      label: "Платежи",
      children: (
        <div className="card">
          <div className="card__body--flush">
            <div className="toolbar">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => { setEditingPayment(null); setNewInvoiceFile(null); paymentForm.resetFields(); setPaymentModalOpen(true); }}
              >
                Добавить платёж
              </Button>
            </div>
            <Table<PaymentRead>
              rowKey="id"
              columns={paymentColumns}
              dataSource={payments}
              loading={paymentsLoading}
              pagination={false}
            />
          </div>
        </div>
      ),
    },
    {
      key: "notifications",
      label: "Настройки уведомлений",
      children: (
        <div className="card">
          <div className="card__body">
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#555" }}>Отправка уведомлений:</span>
              <Switch
                checked={asset?.notifications_enabled}
                onChange={async (checked) => {
                  try {
                    await updateAsset(assetId, { notifications_enabled: checked });
                    setAsset((prev) => prev ? { ...prev, notifications_enabled: checked } : prev);
                    message.success(checked ? "Уведомления включены" : "Уведомления отключены");
                  } catch {
                    message.error("Не удалось изменить настройку");
                  }
                }}
                checkedChildren="Вкл"
                unCheckedChildren="Выкл"
              />
            </div>
            <Spin spinning={notifLoading}>
              {notifications.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <span style={{ marginRight: 8, color: "#555" }}>
                    Текущие настройки:
                  </span>
                  {notifications.map((n) => (
                    <Tag key={n.id} color="blue">
                      за {n.days_before} {n.days_before === 1 ? "день" : "дней"}
                    </Tag>
                  ))}
                </div>
              )}

              <Form form={notifForm} layout="vertical">
                <Form.List name="days">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field) => (
                        <Space key={field.key} align="baseline" style={{ marginBottom: 8 }}>
                          <Form.Item
                            {...field}
                            label="Дней до платежа"
                            rules={[
                              {
                                required: true,
                                message: "Укажите количество дней",
                              },
                            ]}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber min={1} max={365} style={{ width: 160 }} />
                          </Form.Item>
                          <MinusCircleOutlined
                            onClick={() => remove(field.name)}
                            style={{ color: "#e74c3c", fontSize: 16 }}
                          />
                        </Space>
                      ))}
                      <Form.Item>
                        <Button
                          type="dashed"
                          onClick={() => add()}
                          icon={<PlusOutlined />}
                        >
                          Добавить уведомление
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
                <Form.Item>
                  <Button
                    type="primary"
                    onClick={handleNotifSave}
                    loading={notifSaving}
                  >
                    Сохранить настройки
                  </Button>
                </Form.Item>
              </Form>
            </Spin>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__left">
          <Button
            className="page-header__back"
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(archived ? "/archived-assets" : "/assets")}
          />
          <div>
            <h1 className="page-header__title">{asset.name}</h1>
            <span className="page-header__subtitle">
              {typeMap.get(asset.type_id) ?? "Актив"}
            </span>
          </div>
        </div>
        <div className="page-header__actions">
          {!archived && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setEditModalOpen(true)}
            >
              Редактировать
            </Button>
          )}
          {archived ? (
            <Popconfirm
              title="Удалить актив навсегда?"
              description="Это действие нельзя отменить"
              onConfirm={handleDelete}
              okText="Удалить"
              cancelText="Отмена"
            >
              <Button danger icon={<DeleteOutlined />}>
                Удалить
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Архивировать актив?"
              onConfirm={handleArchive}
              okText="Архивировать"
              cancelText="Отмена"
            >
              <Button danger icon={<InboxOutlined />}>
                В архив
              </Button>
            </Popconfirm>
          )}
        </div>
      </div>

      {/* Main Info Card */}
      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Основная информация</h3>
        </div>
        <div className="card__body">
          <Descriptions
            className="fiori-descriptions"
            column={2}
            bordered
          >
            <Descriptions.Item label="Наименование">{asset.name}</Descriptions.Item>
            <Descriptions.Item label="Тип">
              {typeMap.get(asset.type_id) ?? asset.type_id}
            </Descriptions.Item>
            <Descriptions.Item label="Организация">
              {orgMap.get(asset.organization_id) ?? asset.organization_id}
            </Descriptions.Item>
            <Descriptions.Item label="Проект">
              {asset.project_id
                ? projectMap.get(asset.project_id) ?? asset.project_id
                : "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label="Стоимость">
              {asset.cost.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}{" "}
              {currencySymbolMap.get(asset.currency_id) ?? ""}
            </Descriptions.Item>
            <Descriptions.Item label="Валюта">
              {currencyMap.get(asset.currency_id) ?? asset.currency_id}
            </Descriptions.Item>
            <Descriptions.Item label="Дата покупки">
              {dayjs(asset.purchase_date).format("DD.MM.YYYY")}
            </Descriptions.Item>
            <Descriptions.Item label="Следующий платёж">
              {asset.next_payment_date
                ? dayjs(asset.next_payment_date).format("DD.MM.YYYY")
                : "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label="Тип продления">
              {asset.renewal_type === "manual" ? "Плавающий (вручную)" : "Фиксированный"}
            </Descriptions.Item>
            <Descriptions.Item label="Период продления">
              {asset.renewal_type === "fixed" && asset.renewal_period_id
                ? renewalMap.get(asset.renewal_period_id) ?? asset.renewal_period_id
                : "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label="Админ. учётная запись">
              {asset.admin_account ?? "\u2014"}
            </Descriptions.Item>
            <Descriptions.Item label="Комментарий" span={2}>
              {asset.comment ?? "\u2014"}
            </Descriptions.Item>
          </Descriptions>

          {/* Custom fields */}
          {typeFields.length > 0 && asset.field_values.length > 0 && (
            <Descriptions
              className="fiori-descriptions"
              column={2}
              bordered
              title="Дополнительные поля"
              style={{ marginTop: 24 }}
            >
              {typeFields.map((field) => {
                const fv = asset.field_values.find((v) => v.field_id === field.id);
                return (
                  <Descriptions.Item key={field.id} label={field.name}>
                    {fv ? renderFieldValue(field, fv.value) : "\u2014"}
                  </Descriptions.Item>
                );
              })}
            </Descriptions>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        className="fiori-tabs"
        defaultActiveKey="cost"
        onChange={handleTabChange}
        items={tabItems}
      />

      {/* Edit modal */}
      <AssetFormModal
        open={editModalOpen}
        asset={asset}
        onClose={() => setEditModalOpen(false)}
        onSuccess={loadAsset}
      />

      {/* Payment modal */}
      <Modal
        title={editingPayment ? "Редактировать платёж" : "Добавить платёж"}
        open={paymentModalOpen}
        onOk={handlePaymentSubmit}
        onCancel={() => {
          setPaymentModalOpen(false);
          setEditingPayment(null);
          paymentForm.resetFields();
        }}
        confirmLoading={paymentSubmitting}
        okText="Сохранить"
        cancelText="Отмена"
        width={480}
        destroyOnClose
      >
        <Form form={paymentForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="date"
            label="Дата"
            rules={[{ required: true, message: "Выберите дату" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Сумма"
            rules={[{ required: true, message: "Введите сумму" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} precision={2} />
          </Form.Item>
          <Form.Item
            name="currency_id"
            label="Валюта"
            rules={[{ required: true, message: "Выберите валюту" }]}
            initialValue={asset?.currency_id}
          >
            <Select
              options={currencies.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.symbol})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="comment" label="Комментарий">
            <Input.TextArea rows={2} />
          </Form.Item>
          {asset?.renewal_type === "manual" && (
            <Form.Item name="next_payment_date" label="Дата следующего платежа">
              <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
            </Form.Item>
          )}
          {s3Enabled && !editingPayment && (
            <div style={{ marginTop: 16, padding: 16, background: "#f5f6f7", borderRadius: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: "var(--text-secondary)" }}>Инвойс</div>
              <input
                type="file"
                ref={newInvoiceInputRef}
                style={{ display: "none" }}
                accept=".pdf,.png,.jpg,.jpeg,.bmp,.webp,.svg,.doc,.docx,.xls,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setNewInvoiceFile(file);
                }}
              />
              {newInvoiceFile ? (
                <Space>
                  <FileTextOutlined />
                  <span style={{ fontSize: 13 }}>{newInvoiceFile.name}</span>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setNewInvoiceFile(null);
                      if (newInvoiceInputRef.current) newInvoiceInputRef.current.value = "";
                    }}
                  />
                </Space>
              ) : (
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => newInvoiceInputRef.current?.click()}
                >
                  Приложить инвойс
                </Button>
              )}
            </div>
          )}
          {s3Enabled && editingPayment && (
            <div style={{ marginTop: 16, padding: 16, background: "#f5f6f7", borderRadius: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: "var(--text-secondary)" }}>Инвойс</div>
              {editingPayment.invoice_url ? (
                <Space wrap>
                  <Button
                    type="link"
                    icon={<FileTextOutlined />}
                    href={`/api/assets/payments/${editingPayment.id}/invoice?inline=true`}
                    target="_blank"
                  >
                    {editingPayment.invoice_filename || "Просмотр"}
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    icon={<DownloadOutlined />}
                    href={`/api/assets/payments/${editingPayment.id}/invoice`}
                  >
                    Скачать
                  </Button>
                  <Popconfirm
                    title="Удалить инвойс?"
                    onConfirm={async () => {
                      await handleDeleteInvoice(editingPayment.id);
                      setEditingPayment({ ...editingPayment, invoice_url: null, invoice_filename: null });
                    }}
                    okText="Удалить"
                    cancelText="Отмена"
                  >
                    <Button danger size="small" icon={<DeleteOutlined />}>
                      Удалить
                    </Button>
                  </Popconfirm>
                </Space>
              ) : (
                <>
                  <input
                    type="file"
                    ref={invoiceInputRef}
                    style={{ display: "none" }}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      handleInvoiceUpload(editingPayment.id, e).then(() => {
                        // Refresh editing payment data
                        loadPayments();
                      });
                    }}
                  />
                  <Button
                    icon={<UploadOutlined />}
                    loading={invoiceUploadingId === editingPayment.id}
                    onClick={() => {
                      setInvoiceUploadingId(editingPayment.id);
                      invoiceInputRef.current?.click();
                    }}
                  >
                    Загрузить инвойс
                  </Button>
                </>
              )}
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}
