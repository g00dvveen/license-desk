import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Popconfirm,
  Space,
  Tag,
  Spin,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { AssetTypeRead, AssetTypeFieldRead, FieldDataType } from "@/api/types";
import {
  getAssetType,
  updateAssetType,
  deleteAssetType,
  createAssetTypeField,
  updateAssetTypeField,
  deleteAssetTypeField,
} from "@/api/references";
import { useAuth } from "@/auth/AuthContext";

const DATA_TYPE_LABELS: Record<FieldDataType, string> = {
  string: "Строка",
  number: "Число",
  date: "Дата",
  boolean: "Да/Нет",
  reference: "Справочник",
};

const DATA_TYPE_OPTIONS = Object.entries(DATA_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function AssetTypeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const [assetType, setAssetType] = useState<AssetTypeRead | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<AssetTypeFieldRead | null>(null);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [fieldForm] = Form.useForm();
  const [typeForm] = Form.useForm();

  const typeId = Number(id);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getAssetType(typeId);
      setAssetType(data);
    } catch {
      message.error("Ошибка загрузки типа актива");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const openFieldCreate = () => {
    setEditingField(null);
    fieldForm.resetFields();
    fieldForm.setFieldsValue({ sort_order: 0, is_hidden: false });
    setFieldModalOpen(true);
  };

  const openFieldEdit = (field: AssetTypeFieldRead) => {
    setEditingField(field);
    fieldForm.setFieldsValue({
      name: field.name,
      data_type: field.data_type,
      sort_order: field.sort_order,
      is_hidden: field.is_hidden,
    });
    setFieldModalOpen(true);
  };

  const handleFieldSubmit = async () => {
    const values = await fieldForm.validateFields();
    try {
      if (editingField) {
        await updateAssetTypeField(editingField.id, values);
        message.success("Поле обновлено");
      } else {
        await createAssetTypeField(typeId, values);
        message.success("Поле создано");
      }
      setFieldModalOpen(false);
      fetchData();
    } catch {
      message.error("Ошибка сохранения поля");
    }
  };

  const handleFieldDelete = async (fieldId: number) => {
    try {
      await deleteAssetTypeField(fieldId);
      message.success("Поле удалено");
      fetchData();
    } catch {
      message.error("Ошибка удаления поля");
    }
  };

  const openTypeEdit = () => {
    if (!assetType) return;
    typeForm.setFieldsValue({ name: assetType.name, description: assetType.description ?? "" });
    setTypeModalOpen(true);
  };

  const handleTypeUpdate = async () => {
    const values = await typeForm.validateFields();
    try {
      await updateAssetType(typeId, values);
      message.success("Тип актива обновлён");
      setTypeModalOpen(false);
      fetchData();
    } catch {
      message.error("Ошибка сохранения");
    }
  };

  const handleTypeDelete = async () => {
    try {
      await deleteAssetType(typeId);
      message.success("Тип актива удалён");
      navigate("/references/asset-types");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Ошибка удаления");
    }
  };

  if (loading && !assetType) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!assetType) {
    return null;
  }

  const fieldColumns = [
    { title: "Название", dataIndex: "name" },
    {
      title: "Тип данных",
      dataIndex: "data_type",
      render: (dt: FieldDataType) => (
        <Tag>{DATA_TYPE_LABELS[dt] ?? dt}</Tag>
      ),
    },
    { title: "Порядок", dataIndex: "sort_order", width: 100 },
    {
      title: "Скрыто",
      dataIndex: "is_hidden",
      width: 100,
      render: (v: boolean) => (v ? <Tag>Скрыто</Tag> : "Нет"),
    },
    ...(canEdit ? [{
      title: "Действия",
      width: 120,
      render: (_: unknown, record: AssetTypeFieldRead) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openFieldEdit(record)} />
          <Popconfirm title="Удалить поле?" onConfirm={() => handleFieldDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-header__left">
          <Button
            className="page-header__back"
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/references/asset-types")}
          />
          <h1 className="page-header__title">{assetType.name}</h1>
        </div>
        {canEdit && (
          <div className="page-header__actions">
            <Button type="text" icon={<EditOutlined />} onClick={openTypeEdit}>
              Редактировать
            </Button>
            <Popconfirm title="Удалить тип актива?" onConfirm={handleTypeDelete}>
              <Button type="text" danger icon={<DeleteOutlined />}>
                Удалить
              </Button>
            </Popconfirm>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card__header">
          <div className="card__title">Поля типа</div>
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openFieldCreate}>
              Добавить поле
            </Button>
          )}
        </div>
        <div className="card__body card__body--flush">
          <Table
            rowKey="id"
            columns={fieldColumns}
            dataSource={assetType.fields}
            pagination={false}
            loading={loading}
          />
        </div>
      </div>

      {/* Field modal */}
      <Modal
        open={fieldModalOpen}
        title={editingField ? "Редактировать поле" : "Новое поле"}
        onCancel={() => setFieldModalOpen(false)}
        onOk={handleFieldSubmit}
        okText="Сохранить"
        cancelText="Отмена"
        width={480}
        destroyOnClose
      >
        <Form form={fieldForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: "Введите название поля" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="data_type"
            label="Тип данных"
            rules={[{ required: true, message: "Выберите тип данных" }]}
          >
            <Select options={DATA_TYPE_OPTIONS} placeholder="Выберите тип" />
          </Form.Item>
          <Form.Item name="sort_order" label="Порядок">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="is_hidden" label="Скрыто" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Type edit modal */}
      <Modal
        open={typeModalOpen}
        title="Редактировать тип актива"
        onCancel={() => setTypeModalOpen(false)}
        onOk={handleTypeUpdate}
        okText="Сохранить"
        cancelText="Отмена"
        width={480}
        destroyOnClose
      >
        <Form form={typeForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: "Введите название" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
