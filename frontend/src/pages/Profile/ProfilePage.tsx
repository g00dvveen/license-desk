import { useState, useEffect, useRef } from "react";
import {
  Form,
  Input,
  Button,
  Tag,
  Table,
  message,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  LockOutlined,
} from "@ant-design/icons";
import api from "@/api/client";
import { getOrganizations, getProjects } from "@/api/references";
import { useAuth, type User } from "@/auth/AuthContext";
import type { PermissionRead, OrganizationRead, ProjectRead } from "@/api/types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  viewer: "Наблюдатель",
};

export default function ProfilePage() {
  useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<PermissionRead[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRead[]>([]);
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
    loadPermissions();
    loadReferences();
  }, []);

  async function loadProfile() {
    try {
      const { data } = await api.get<User>("/auth/me");
      setProfile(data);
      profileForm.setFieldsValue({
        last_name: data.last_name,
        first_name: data.first_name,
        middle_name: data.middle_name,
      });
    } catch {
      message.error("Не удалось загрузить профиль");
    }
  }

  async function loadPermissions() {
    try {
      const { data } = await api.get<PermissionRead[]>("/auth/me/permissions");
      setPermissions(data);
    } catch {
      /* ignore */
    }
  }

  async function loadReferences() {
    try {
      const [orgs, prjs] = await Promise.all([
        getOrganizations({ size: 100 }),
        getProjects({ size: 100 }),
      ]);
      setOrganizations(orgs.items);
      setProjects(prjs.items);
    } catch {
      /* ignore */
    }
  }

  async function handleSaveProfile() {
    try {
      const values = await profileForm.validateFields();
      setSaving(true);
      await api.patch("/auth/me", values);
      message.success("Профиль обновлён");
      loadProfile();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      message.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    try {
      const values = await passwordForm.validateFields();
      setChangingPassword(true);
      await api.post("/auth/me/change-password", values);
      message.success("Пароль изменён");
      passwordForm.resetFields();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) return;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || "Ошибка смены пароля");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/auth/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      message.success("Аватар обновлён");
      loadProfile();
    } catch {
      message.error("Не удалось загрузить аватар");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeleteAvatar() {
    try {
      await api.delete("/auth/me/avatar");
      message.success("Аватар удалён");
      loadProfile();
    } catch {
      message.error("Не удалось удалить аватар");
    }
  }

  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));
  const prjMap = new Map(projects.map((p) => [p.id, p.name]));

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const permColumns = [
    {
      title: "Роль",
      dataIndex: "role",
      render: (v: string) => <Tag color={v === "manager" ? "blue" : "default"}>{ROLE_LABELS[v] || v}</Tag>,
    },
    {
      title: "Организация",
      dataIndex: "organization_id",
      render: (v: number | null) => (v ? orgMap.get(v) ?? v : "Все"),
    },
    {
      title: "Проект",
      dataIndex: "project_id",
      render: (v: number | null) => (v ? prjMap.get(v) ?? v : "Все"),
    },
  ];

  if (!profile) return null;

  return (
    <>
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Профиль</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* Avatar card */}
        <div className="card">
          <div className="card__body" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Аватар"
                style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "var(--brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {initials}
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{profile.full_name}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{profile.email}</div>
              <div style={{ marginTop: 8 }}>
                <Tag color={profile.is_superuser ? "blue" : "default"}>
                  {ROLE_LABELS[profile.role || ""] || "Пользователь"}
                </Tag>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleAvatarUpload}
              />
              <Button
                icon={<UploadOutlined />}
                size="small"
                onClick={() => fileInputRef.current?.click()}
              >
                Загрузить
              </Button>
              {profile.avatar_url && (
                <Button
                  icon={<DeleteOutlined />}
                  size="small"
                  danger
                  onClick={handleDeleteAvatar}
                >
                  Удалить
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Profile form */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">Личные данные</div>
            </div>
            <div className="card__body">
              <Form form={profileForm} layout="vertical" style={{ maxWidth: 400 }}>
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
                <Button type="primary" onClick={handleSaveProfile} loading={saving}>
                  Сохранить
                </Button>
              </Form>
            </div>
          </div>

          {/* Permissions */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">Права доступа</div>
            </div>
            <div className="card__body card__body--flush">
              {profile.is_superuser ? (
                <div style={{ padding: 20, color: "var(--text-secondary)" }}>
                  Полный доступ (администратор)
                </div>
              ) : permissions.length > 0 ? (
                <Table
                  rowKey="id"
                  columns={permColumns}
                  dataSource={permissions}
                  pagination={false}
                  size="small"
                />
              ) : (
                <div style={{ padding: 20, color: "var(--text-secondary)" }}>
                  Нет назначенных прав
                </div>
              )}
            </div>
          </div>

          {/* Change password */}
          {profile.is_local && (
            <div className="card">
              <div className="card__header">
                <div className="card__title">Смена пароля</div>
              </div>
              <div className="card__body">
                <Form form={passwordForm} layout="vertical" style={{ maxWidth: 400 }}>
                  <Form.Item
                    name="current_password"
                    label="Текущий пароль"
                    rules={[{ required: true, message: "Введите текущий пароль" }]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Form.Item
                    name="new_password"
                    label="Новый пароль"
                    rules={[
                      { required: true, message: "Введите новый пароль" },
                      { min: 6, message: "Минимум 6 символов" },
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Form.Item
                    name="confirm_password"
                    label="Подтверждение пароля"
                    dependencies={["new_password"]}
                    rules={[
                      { required: true, message: "Подтвердите пароль" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("new_password") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("Пароли не совпадают"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Button type="primary" onClick={handleChangePassword} loading={changingPassword}>
                    Изменить пароль
                  </Button>
                </Form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
