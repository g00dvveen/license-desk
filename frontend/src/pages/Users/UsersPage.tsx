import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Tag,
  Popconfirm,
  message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type {
  UserRead,
  PermissionRead,
  PermissionCreate,
  RoleType,
  OrganizationRead,
  ProjectRead,
} from "@/api/types";
import {
  getUsers,
  createUser,
  updateUser,
  getUserPermissions,
  createPermission,
  deletePermission,
} from "@/api/users";
import { getOrganizations, getProjects } from "@/api/references";
import { useAuth } from "@/auth/AuthContext";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.is_superuser ?? false;
  const [data, setData] = useState<UserRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // User modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRead | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Permissions
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<PermissionRead[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permForm] = Form.useForm();

  // Reference data for permission selects
  const [organizations, setOrganizations] = useState<OrganizationRead[]>([]);
  const [projects, setProjects] = useState<ProjectRead[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers({ page, size: pageSize });
      setData(res.items);
      setTotal(res.total);
    } catch {
      message.error("Ошибка загрузки пользователей");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchPermissions = async (userId: number) => {
    setPermissionsLoading(true);
    try {
      const perms = await getUserPermissions(userId);
      setPermissions(perms);
    } catch {
      message.error("Ошибка загрузки прав");
    } finally {
      setPermissionsLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [orgsRes, projRes] = await Promise.all([
        getOrganizations({ size: 100 }),
        getProjects({ size: 100 }),
      ]);
      setOrganizations(orgsRes.items);
      setProjects(projRes.items);
    } catch {
      message.error("Ошибка загрузки справочников");
    }
  };

  // ── Create user ──

  const openCreate = () => {
    createForm.resetFields();
    setCreateModalOpen(true);
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    try {
      await createUser(values);
      message.success("Пользователь создан");
      setCreateModalOpen(false);
      fetchData();
    } catch {
      message.error("Ошибка создания пользователя");
    }
  };

  // ── Edit user ──

  const openEdit = (record: UserRead) => {
    setEditingUser(record);
    editForm.setFieldsValue({
      last_name: record.last_name,
      first_name: record.first_name,
      middle_name: record.middle_name,
      is_active: record.is_active,
      is_superuser: record.is_superuser,
    });
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    const values = await editForm.validateFields();
    try {
      await updateUser(editingUser.id, values);
      message.success("Пользователь обновлён");
      setEditModalOpen(false);
      fetchData();
    } catch {
      message.error("Ошибка обновления пользователя");
    }
  };

  // ── Permissions ──

  const openPermModal = () => {
    permForm.resetFields();
    fetchReferenceData();
    setPermModalOpen(true);
  };

  const handleAddPermission = async () => {
    if (expandedUserId === null) return;
    const values = await permForm.validateFields();
    const payload: PermissionCreate = {
      user_id: expandedUserId,
      role: values.role,
      organization_id: values.organization_id ?? null,
      project_id: values.project_id ?? null,
    };
    try {
      await createPermission(payload);
      message.success("Право добавлено");
      setPermModalOpen(false);
      fetchPermissions(expandedUserId);
    } catch {
      message.error("Ошибка добавления права");
    }
  };

  const handleDeletePermission = async (permId: number) => {
    if (expandedUserId === null) return;
    try {
      await deletePermission(permId);
      message.success("Право удалено");
      fetchPermissions(expandedUserId);
    } catch {
      message.error("Ошибка удаления права");
    }
  };

  // ── Columns ──

  const columns = [
    { title: "Email", dataIndex: "email" },
    { title: "Фамилия", dataIndex: "last_name" },
    { title: "Имя", dataIndex: "first_name" },
    { title: "Отчество", dataIndex: "middle_name", render: (v: string | null) => v ?? "—" },
    {
      title: "Статус",
      dataIndex: "is_active",
      width: 140,
      render: (v: boolean) =>
        v ? (
          <span className="status-badge status-badge--success">Активен</span>
        ) : (
          <span className="status-badge status-badge--error">Заблокирован</span>
        ),
    },
    {
      title: "Уровень",
      dataIndex: "is_superuser",
      width: 160,
      render: (v: boolean) =>
        v ? (
          <span className="status-badge status-badge--info">Администратор</span>
        ) : (
          <span className="status-badge status-badge--neutral">Пользователь</span>
        ),
    },
    ...(isAdmin ? [{
      title: "Действия",
      width: 80,
      render: (_: unknown, record: UserRead) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            openEdit(record);
          }}
        />
      ),
    }] : []),
  ];

  const permColumns = [
    {
      title: "Роль",
      dataIndex: "role",
      render: (v: RoleType) => (
        <Tag>{v === "manager" ? "Менеджер" : "Наблюдатель"}</Tag>
      ),
    },
    {
      title: "Организация",
      dataIndex: "organization_id",
      render: (v: number | null) => {
        if (!v) return "—";
        const org = organizations.find((o) => o.id === v);
        return org ? org.name : v;
      },
    },
    {
      title: "Проект",
      dataIndex: "project_id",
      render: (v: number | null) => {
        if (!v) return "—";
        const proj = projects.find((p) => p.id === v);
        return proj ? proj.name : v;
      },
    },
    {
      title: "Действия",
      width: 80,
      render: (_: unknown, record: PermissionRead) => (
        <Popconfirm
          title="Удалить право?"
          onConfirm={() => handleDeletePermission(record.id)}
          okText="Удалить"
          cancelText="Отмена"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const expandedRowRender = () => (
    <>
      <div style={{ marginBottom: 8 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={openPermModal}>
          Добавить право
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={permColumns}
        dataSource={permissions}
        loading={permissionsLoading}
        pagination={false}
        size="small"
      />
    </>
  );

  return (
    <>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Пользователи</h1>
        </div>
        {isAdmin && (
          <div className="page-header__actions">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Добавить пользователя
            </Button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="toolbar">
          <Input.Search
            placeholder="Поиск по ФИО или email"
            allowClear
            onSearch={(v) => { setSearch(v); setPage(1); }}
            onChange={(e) => { if (!e.target.value) { setSearch(""); setPage(1); } }}
            style={{ width: 300 }}
          />
        </div>
        <div className="card__body card__body--flush">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data.filter((u) => {
              if (!search) return true;
              const s = search.toLowerCase();
              return (
                u.email.toLowerCase().includes(s) ||
                u.last_name.toLowerCase().includes(s) ||
                u.first_name.toLowerCase().includes(s) ||
                (u.middle_name?.toLowerCase().includes(s) ?? false)
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
            expandable={{
              expandedRowRender,
              expandedRowKeys: expandedUserId !== null ? [expandedUserId] : [],
              onExpand: (expanded, record) => {
                if (expanded) {
                  setExpandedUserId(record.id);
                  fetchPermissions(record.id);
                  fetchReferenceData();
                } else {
                  setExpandedUserId(null);
                  setPermissions([]);
                }
              },
            }}
          />
        </div>
      </div>

      {/* Create user modal */}
      <Modal
        open={createModalOpen}
        title="Новый пользователь"
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreate}
        okText="Сохранить"
        cancelText="Отмена"
        width={480}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Введите email" },
              { type: "email", message: "Некорректный email" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="last_name"
            label="Фамилия"
            rules={[{ required: true, message: "Введите фамилию" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="first_name"
            label="Имя"
            rules={[{ required: true, message: "Введите имя" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="middle_name" label="Отчество">
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, message: "Введите пароль" }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="is_superuser"
            label="Суперпользователь"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit user modal */}
      <Modal
        open={editModalOpen}
        title="Редактировать пользователя"
        onCancel={() => setEditModalOpen(false)}
        onOk={handleEdit}
        okText="Сохранить"
        cancelText="Отмена"
        width={480}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="last_name"
            label="Фамилия"
            rules={[{ required: true, message: "Введите фамилию" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="first_name"
            label="Имя"
            rules={[{ required: true, message: "Введите имя" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="middle_name" label="Отчество">
            <Input />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="Активен"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="is_superuser"
            label="Суперпользователь"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add permission modal */}
      <Modal
        open={permModalOpen}
        title="Добавить право"
        onCancel={() => setPermModalOpen(false)}
        onOk={handleAddPermission}
        okText="Сохранить"
        cancelText="Отмена"
        width={480}
        destroyOnClose
      >
        <Form form={permForm} layout="vertical">
          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: "Выберите роль" }]}
          >
            <Select
              options={[
                { label: "Менеджер", value: "manager" },
                { label: "Наблюдатель", value: "viewer" },
              ]}
            />
          </Form.Item>
          <Form.Item name="organization_id" label="Организация">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Все организации"
              options={organizations.map((o) => ({
                label: o.name,
                value: o.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="project_id" label="Проект">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Все проекты"
              options={projects.map((p) => ({
                label: p.name,
                value: p.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
