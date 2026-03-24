import { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Input, Popconfirm, Space, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { CurrencyRead } from "@/api/types";
import {
  getCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
} from "@/api/references";

export default function CurrenciesPage() {
  const [data, setData] = useState<CurrencyRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CurrencyRead | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getCurrencies({ page, size: pageSize });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error("Ошибка загрузки валют");
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

  const openEdit = (record: CurrencyRead) => {
    setEditing(record);
    form.setFieldsValue({ code: record.code, name: record.name, symbol: record.symbol });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateCurrency(editing.id, values);
        message.success("Валюта обновлена");
      } else {
        await createCurrency(values);
        message.success("Валюта создана");
      }
      setModalOpen(false);
      fetchData();
    } catch {
      message.error("Ошибка сохранения");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCurrency(id);
      message.success("Валюта удалена");
      fetchData();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Ошибка удаления");
    }
  };

  const columns = [

    { title: "Код", dataIndex: "code", width: 100 },
    { title: "Название", dataIndex: "name" },
    { title: "Символ", dataIndex: "symbol", width: 80 },
    {
      title: "Действия",
      width: 120,
      render: (_: unknown, record: CurrencyRead) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Удалить валюту?" onConfirm={() => handleDelete(record.id)}>
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
          <div className="card__title">Валюты</div>
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
        title={editing ? "Редактировать валюту" : "Новая валюта"}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Сохранить"
        cancelText="Отмена"
        width={480}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label="Код"
            rules={[{ required: true, message: "Введите код валюты" }]}
          >
            <Input placeholder="USD" />
          </Form.Item>
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: "Введите название" }]}
          >
            <Input placeholder="Доллар США" />
          </Form.Item>
          <Form.Item
            name="symbol"
            label="Символ"
            rules={[{ required: true, message: "Введите символ" }]}
          >
            <Input placeholder="$" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
