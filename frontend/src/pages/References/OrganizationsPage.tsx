import { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Input, Popconfirm, Space, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { OrganizationRead } from "@/api/types";
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "@/api/references";
import { useAuth } from "@/auth/AuthContext";

export default function OrganizationsPage() {
  const { canEdit } = useAuth();
  const [data, setData] = useState<OrganizationRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationRead | null>(null);
  const [search, setSearch] = useState("");
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getOrganizations({ page, size: pageSize });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error("Ошибка загрузки организаций");
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

  const openEdit = (record: OrganizationRead) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      external_id: record.external_id,
      bin: record.bin,
      full_name: record.full_name,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateOrganization(editing.id, values);
        message.success("Организация обновлена");
      } else {
        await createOrganization(values);
        message.success("Организация создана");
      }
      setModalOpen(false);
      fetchData();
    } catch {
      message.error("Ошибка сохранения");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteOrganization(id);
      message.success("Организация удалена");
      fetchData();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Ошибка удаления");
    }
  };

  const columns = [

    { title: "Наименование", dataIndex: "name" },
    { title: "Полное наименование", dataIndex: "full_name", ellipsis: true },

    { title: "БИН", dataIndex: "bin", width: 140 },
    ...(canEdit ? [{
      title: "Действия",
      width: 120,
      render: (_: unknown, record: OrganizationRead) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Удалить организацию?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <>
      <div className="card">
        <div className="card__header">
          <div className="card__title">Организации</div>
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Добавить
            </Button>
          )}
        </div>
        <div className="toolbar">
          <Input
            placeholder="Поиск по наименованию или БИН"
            allowClear
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 300 }}
          />
        </div>
        <div className="card__body card__body--flush">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data.filter((item) => {
              if (!search) return true;
              const s = search.toLowerCase();
              return (
                item.name.toLowerCase().includes(s) ||
                (item.full_name?.toLowerCase().includes(s) ?? false) ||
                (item.bin?.toLowerCase().includes(s) ?? false)
              );
            })}
            loading={loading}
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
        title={editing ? "Редактировать организацию" : "Новая организация"}
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
            label="Наименование"
            rules={[{ required: true, message: "Введите наименование" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="full_name" label="Полное наименование">
            <Input />
          </Form.Item>
          <Form.Item name="external_id" label="ID внешней системы">
            <Input />
          </Form.Item>
          <Form.Item name="bin" label="БИН">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
