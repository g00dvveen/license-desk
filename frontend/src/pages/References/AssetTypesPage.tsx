import { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Input, Popconfirm, Space, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { AssetTypeRead } from "@/api/types";
import {
  getAssetTypes,
  createAssetType,
  updateAssetType,
  deleteAssetType,
} from "@/api/references";

export default function AssetTypesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AssetTypeRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AssetTypeRead | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAssetTypes({ page, size: pageSize });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error("Ошибка загрузки типов активов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: AssetTypeRead, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(record);
    form.setFieldsValue({ name: record.name, description: record.description ?? "" });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateAssetType(editing.id, values);
        message.success("Тип актива обновлён");
      } else {
        await createAssetType(values);
        message.success("Тип актива создан");
      }
      setModalOpen(false);
      fetchData();
    } catch {
      message.error("Ошибка сохранения");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAssetType(id);
      message.success("Тип актива удалён");
      fetchData();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Ошибка удаления");
    }
  };

  const columns = [

    { title: "Название", dataIndex: "name" },
    { title: "Описание", dataIndex: "description", render: (v: string | null) => v ?? "—" },
    {
      title: "Действия",
      width: 120,
      render: (_: unknown, record: AssetTypeRead) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={(e) => openEdit(record, e)}
          />
          <Popconfirm
            title="Удалить тип актива?"
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="card">
        <div className="card__header">
          <div className="card__title">Типы активов</div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Добавить
          </Button>
        </div>
        <div className="card__body card__body--flush">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            onRow={(record) => ({
              onClick: () => navigate(`/references/asset-types/${record.id}`),
              style: { cursor: "pointer" },
            })}
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

      <Modal
        open={modalOpen}
        title={editing ? "Редактировать тип актива" : "Новый тип актива"}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Сохранить"
        cancelText="Отмена"
        width={480}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
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
