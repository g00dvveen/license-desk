import { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Input, InputNumber, Popconfirm, Space, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { RenewalPeriodRead } from "@/api/types";
import {
  getRenewalPeriods,
  createRenewalPeriod,
  updateRenewalPeriod,
  deleteRenewalPeriod,
} from "@/api/references";

export default function RenewalPeriodsPage() {
  const [data, setData] = useState<RenewalPeriodRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RenewalPeriodRead | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getRenewalPeriods({ page, size: pageSize });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error("Ошибка загрузки периодов продления");
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

  const openEdit = (record: RenewalPeriodRead) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name, months: record.months });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateRenewalPeriod(editing.id, values);
        message.success("Период продления обновлён");
      } else {
        await createRenewalPeriod(values);
        message.success("Период продления создан");
      }
      setModalOpen(false);
      fetchData();
    } catch {
      message.error("Ошибка сохранения");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRenewalPeriod(id);
      message.success("Период продления удалён");
      fetchData();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Ошибка удаления");
    }
  };

  const columns = [

    { title: "Название", dataIndex: "name" },
    { title: "Месяцев", dataIndex: "months", width: 120 },
    {
      title: "Действия",
      width: 120,
      render: (_: unknown, record: RenewalPeriodRead) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Удалить период продления?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="card">
        <div className="card__header">
          <div className="card__title">Периоды продления</div>
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
        title={editing ? "Редактировать период продления" : "Новый период продления"}
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
            <Input placeholder="Ежегодно" />
          </Form.Item>
          <Form.Item
            name="months"
            label="Месяцев"
            rules={[{ required: true, message: "Введите количество месяцев" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
