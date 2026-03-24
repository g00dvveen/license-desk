import { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Input, Select, Popconfirm, Space, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ProjectRead, OrganizationRead } from "@/api/types";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getOrganizations,
} from "@/api/references";

export default function ProjectsPage() {
  const [data, setData] = useState<ProjectRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRead | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationRead[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOrgId, setFilterOrgId] = useState<number | undefined>();
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getProjects({ page, size: pageSize });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error("Ошибка загрузки проектов");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    setOrgsLoading(true);
    try {
      const res = await getOrganizations({ size: 100 });
      setOrganizations(res.items);
    } catch {
      message.error("Ошибка загрузки организаций");
    } finally {
      setOrgsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

  const filteredData = data.filter((item) => {
    if (filterOrgId && item.organization_id !== filterOrgId) return false;
    if (!search) return true;
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: ProjectRead) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      organization_id: record.organization_id ?? undefined,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateProject(editing.id, values);
        message.success("Проект обновлён");
      } else {
        await createProject(values);
        message.success("Проект создан");
      }
      setModalOpen(false);
      fetchData();
    } catch {
      message.error("Ошибка сохранения");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProject(id);
      message.success("Проект удалён");
      fetchData();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Ошибка удаления");
    }
  };

  const columns = [
    { title: "Наименование", dataIndex: "name" },
    {
      title: "Организация",
      dataIndex: "organization_id",
      render: (id: number | null | undefined) => (id ? orgMap.get(id) ?? id : "—"),
    },
    {
      title: "Действия",
      width: 120,
      render: (_: unknown, record: ProjectRead) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Удалить проект?" onConfirm={() => handleDelete(record.id)}>
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
          <div className="card__title">Проекты</div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Добавить
          </Button>
        </div>
        <div className="toolbar">
          <Input
            placeholder="Поиск по наименованию"
            allowClear
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 260 }}
          />
          <Select
            placeholder="Организация"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={orgsLoading}
            value={filterOrgId}
            onChange={(v) => { setFilterOrgId(v); setPage(1); }}
            options={organizations.map((o) => ({ value: o.id, label: o.name }))}
            style={{ width: 220 }}
          />
        </div>
        <div className="card__body card__body--flush">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredData}
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
        title={editing ? "Редактировать проект" : "Новый проект"}
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
          <Form.Item name="organization_id" label="Организация">
            <Select
              allowClear
              placeholder="Выберите организацию"
              showSearch
              optionFilterProp="label"
              loading={orgsLoading}
              options={organizations.map((o) => ({ value: o.id, label: o.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
