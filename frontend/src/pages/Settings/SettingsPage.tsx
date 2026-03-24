import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Tag,
  Space,
  Alert,
  message,
} from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { SettingRead } from "@/api/types";
import { getSettings, updateSetting } from "@/api/settings";

const SETTING_LABELS: Record<string, { label: string; description: string }> = {
  notification_days_before_payment: {
    label: "Уведомления о платежах (дни)",
    description:
      "За сколько дней до даты платежа отправлять уведомления. Можно указать несколько значений — уведомления будут отправлены за каждое указанное количество дней. При создании нового актива эти значения устанавливаются как настройки по умолчанию.",
  },
};

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === "number");
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SettingRead | null>(null);
  const [form] = Form.useForm();

  // State for number array editor
  const [arrayValues, setArrayValues] = useState<number[]>([]);
  const [newDayValue, setNewDayValue] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getSettings();
      setData(res);
    } catch {
      message.error("Ошибка загрузки настроек");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEdit = (record: SettingRead) => {
    setEditing(record);
    if (isNumberArray(record.value)) {
      setArrayValues([...record.value].sort((a, b) => b - a));
      setNewDayValue(null);
    } else {
      form.setFieldsValue({ value: record.value });
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!editing) return;
    try {
      let value: unknown;
      if (isNumberArray(editing.value)) {
        if (arrayValues.length === 0) {
          message.warning("Укажите хотя бы одно значение");
          return;
        }
        value = arrayValues.sort((a, b) => b - a);
      } else {
        const formValues = await form.validateFields();
        value = formValues.value;
      }
      await updateSetting(editing.key, { value });
      message.success("Настройка сохранена");
      setModalOpen(false);
      fetchData();
    } catch {
      message.error("Ошибка сохранения настройки");
    }
  };

  const addDayValue = () => {
    if (newDayValue === null || newDayValue <= 0) return;
    if (arrayValues.includes(newDayValue)) {
      message.warning("Такое значение уже добавлено");
      return;
    }
    setArrayValues([...arrayValues, newDayValue].sort((a, b) => b - a));
    setNewDayValue(null);
  };

  const removeDayValue = (val: number) => {
    setArrayValues(arrayValues.filter((v) => v !== val));
  };

  const renderValueEditor = () => {
    if (!editing) return <Input />;
    const currentValue = editing.value;

    if (isNumberArray(currentValue)) {
      const meta = SETTING_LABELS[editing.key];
      return (
        <div>
          {meta && (
            <Alert
              message={meta.description}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <div style={{ marginBottom: 12 }}>
            {arrayValues.length > 0 ? (
              <Space wrap>
                {arrayValues.map((v) => (
                  <Tag
                    key={v}
                    closable
                    onClose={() => removeDayValue(v)}
                    color="blue"
                    style={{ fontSize: 14, padding: "4px 10px" }}
                  >
                    {v} {v === 1 ? "день" : v < 5 ? "дня" : "дней"}
                  </Tag>
                ))}
              </Space>
            ) : (
              <span style={{ color: "var(--text-tertiary)" }}>
                Нет значений — уведомления не будут отправляться
              </span>
            )}
          </div>
          <Space>
            <InputNumber
              min={1}
              max={365}
              placeholder="Кол-во дней"
              value={newDayValue}
              onChange={(v) => setNewDayValue(v)}
              onPressEnter={addDayValue}
              style={{ width: 140 }}
            />
            <Button
              icon={<PlusOutlined />}
              onClick={addDayValue}
              disabled={!newDayValue || newDayValue <= 0}
            >
              Добавить
            </Button>
          </Space>
        </div>
      );
    }

    if (typeof currentValue === "boolean") {
      return <Switch />;
    }
    if (typeof currentValue === "number") {
      return <InputNumber style={{ width: "100%" }} />;
    }
    return <Input />;
  };

  const columns = [
    {
      title: "Параметр",
      dataIndex: "key",
      render: (key: string) => {
        const meta = SETTING_LABELS[key];
        return meta ? meta.label : key;
      },
    },
    {
      title: "Значение",
      dataIndex: "value",
      render: (v: unknown) => {
        if (typeof v === "boolean") return v ? "Да" : "Нет";
        if (isNumberArray(v)) {
          return (
            <Space>
              {v.sort((a, b) => b - a).map((d) => (
                <Tag key={d} color="blue">
                  {d} {d === 1 ? "день" : d < 5 ? "дня" : "дней"}
                </Tag>
              ))}
            </Space>
          );
        }
        return String(v);
      },
    },
    {
      title: "Действия",
      width: 80,
      render: (_: unknown, record: SettingRead) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => openEdit(record)}
        />
      ),
    },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Настройки системы</h1>
        </div>
      </div>

      <div className="card">
        <div className="card__body card__body--flush">
          <Table
            rowKey="key"
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={false}
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        title="Редактировать настройку"
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Сохранить"
        cancelText="Отмена"
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Параметр">
            <Input
              value={
                editing
                  ? SETTING_LABELS[editing.key]?.label || editing.key
                  : ""
              }
              disabled
            />
          </Form.Item>
          {editing && isNumberArray(editing.value) ? (
            <Form.Item label="Значение">{renderValueEditor()}</Form.Item>
          ) : (
            <Form.Item
              name="value"
              label="Значение"
              valuePropName={
                editing && typeof editing.value === "boolean"
                  ? "checked"
                  : "value"
              }
            >
              {renderValueEditor()}
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}
