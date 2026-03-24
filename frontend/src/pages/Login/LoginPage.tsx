import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Form, Input, Button, Alert, Divider } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "@/auth/AuthContext";
import api from "@/api/client";

export default function LoginPage() {
  const { token, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [keycloakEnabled, setKeycloakEnabled] = useState(false);

  useEffect(() => {
    api.get("/auth/config")
      .then(({ data }) => setKeycloakEnabled(data.keycloak_enabled))
      .catch(() => {});
  }, []);

  if (token) {
    return <Navigate to="/" replace />;
  }

  const onFinish = async (values: { email: string; password: string }) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(values.email, values.password);
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo">L</div>
          <h1 className="login-card__title">LicenseDesk</h1>
          <p className="login-card__subtitle">
            Система учёта нематериальных активов
          </p>
        </div>

        <div className="login-card__body">
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 24 }}
            />
          )}

          <Form onFinish={onFinish} layout="vertical" size="large">
            <Form.Item
              name="email"
              rules={[{ required: true, message: "Введите email" }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Email"
                autoFocus
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: "Введите пароль" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Пароль"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                block
              >
                Войти
              </Button>
            </Form.Item>
          </Form>

          {keycloakEnabled && (
            <>
              <Divider plain>или</Divider>
              <Button block href="/api/auth/oidc/login">
                Войти через SSO
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
