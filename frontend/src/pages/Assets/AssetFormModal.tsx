import { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  message,
  Spin,
  Divider,
  Row,
  Col,
} from "antd";
import dayjs from "dayjs";

import { createAsset, updateAsset, updateFieldValues } from "@/api/assets";
import {
  getOrganizations,
  getProjects,
  getCurrencies,
  getRenewalPeriods,
  getAssetTypes,
  getAssetType,
} from "@/api/references";
import type {
  AssetRead,
  AssetTypeFieldRead,
  OrganizationRead,
  ProjectRead,
  CurrencyRead,
  RenewalPeriodRead,
  AssetTypeRead,
  AssetFieldValueWrite,
} from "@/api/types";

interface AssetFormModalProps {
  open: boolean;
  asset?: AssetRead | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssetFormModal({
  open,
  asset,
  onClose,
  onSuccess,
}: AssetFormModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const [organizations, setOrganizations] = useState<OrganizationRead[]>([]);
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRead[]>([]);
  const [renewalPeriods, setRenewalPeriods] = useState<RenewalPeriodRead[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeRead[]>([]);
  const [typeFields, setTypeFields] = useState<AssetTypeFieldRead[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      getOrganizations({ size: 100 }),
      getProjects({ size: 100 }),
      getCurrencies({ size: 100 }),
      getRenewalPeriods({ size: 100 }),
      getAssetTypes({ size: 100 }),
    ])
      .then(([orgs, prjs, curs, rps, types]) => {
        setOrganizations(orgs.items);
        setProjects(prjs.items);
        setCurrencies(curs.items);
        setRenewalPeriods(rps.items);
        setAssetTypes(types.items);
      })
      .catch(() => message.error("Не удалось загрузить справочники"))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (asset) {
      form.setFieldsValue({
        name: asset.name,
        type_id: asset.type_id,
        organization_id: asset.organization_id,
        project_id: asset.project_id ?? undefined,
        cost: asset.cost,
        currency_id: asset.currency_id,
        purchase_date: dayjs(asset.purchase_date),
        next_payment_date: asset.next_payment_date
          ? dayjs(asset.next_payment_date)
          : undefined,
        renewal_type: asset.renewal_type ?? "fixed",
        renewal_period_id: asset.renewal_period_id ?? undefined,
        admin_account: asset.admin_account ?? undefined,
        comment: asset.comment ?? undefined,
      });
      loadTypeFields(asset.type_id, asset);
    } else {
      form.resetFields();
      setTypeFields([]);
    }
  }, [open, asset, form]);

  async function loadTypeFields(typeId: number, currentAsset?: AssetRead | null) {
    try {
      const at = await getAssetType(typeId);
      const visibleFields = at.fields.filter((f) => !f.is_hidden);
      setTypeFields(visibleFields);
      if (currentAsset) {
        const fieldValues: Record<string, unknown> = {};
        for (const fv of currentAsset.field_values) {
          const fieldDef = visibleFields.find((f) => f.id === fv.field_id);
          if (fieldDef) {
            if (fieldDef.data_type === "date" && typeof fv.value === "string") {
              fieldValues[`field_${fv.field_id}`] = dayjs(fv.value);
            } else {
              fieldValues[`field_${fv.field_id}`] = fv.value;
            }
          }
        }
        form.setFieldsValue(fieldValues);
      }
    } catch {
      setTypeFields([]);
    }
  }

  function handleTypeChange(typeId: number) {
    const toClear: Record<string, undefined> = {};
    for (const f of typeFields) {
      toClear[`field_${f.id}`] = undefined;
    }
    form.setFieldsValue(toClear);
    loadTypeFields(typeId);
  }

  async function handleSubmit() {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name,
        type_id: values.type_id,
        organization_id: values.organization_id,
        project_id: values.project_id ?? null,
        cost: values.cost,
        currency_id: values.currency_id,
        purchase_date: (values.purchase_date as dayjs.Dayjs).format("YYYY-MM-DD"),
        next_payment_date: values.next_payment_date
          ? (values.next_payment_date as dayjs.Dayjs).format("YYYY-MM-DD")
          : null,
        renewal_type: values.renewal_type ?? "fixed",
        renewal_period_id: values.renewal_type === "fixed" ? (values.renewal_period_id ?? null) : null,
        admin_account: values.admin_account || null,
        comment: values.comment || null,
      };

      // Collect custom field values
      const fieldVals: AssetFieldValueWrite[] = [];
      for (const f of typeFields) {
        const raw = values[`field_${f.id}`];
        if (raw !== undefined && raw !== null && raw !== "") {
          let val: unknown = raw;
          if (f.data_type === "date" && dayjs.isDayjs(raw)) {
            val = (raw as dayjs.Dayjs).format("YYYY-MM-DD");
          }
          fieldVals.push({ field_id: f.id, value: val });
        }
      }

      if (asset) {
        await updateAsset(asset.id, payload);
        if (fieldVals.length > 0) {
          await updateFieldValues(asset.id, fieldVals);
        }
        message.success("Актив обновлён");
      } else {
        const created = await createAsset({ ...payload, field_values: fieldVals });
        if (fieldVals.length > 0 && !payload.hasOwnProperty("field_values")) {
          await updateFieldValues(created.id, fieldVals);
        }
        message.success("Актив создан");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) {
        return;
      }
      message.error("Ошибка при сохранении актива");
    } finally {
      setSubmitting(false);
    }
  }

  function renderDynamicField(field: AssetTypeFieldRead) {
    switch (field.data_type) {
      case "string":
        return <Input />;
      case "number":
        return <InputNumber style={{ width: "100%" }} />;
      case "date":
        return <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />;
      case "boolean":
        return <Switch />;
      default:
        return <Input />;
    }
  }

  return (
    <Modal
      title={asset ? "Редактировать актив" : "Добавить актив"}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      okText="Сохранить"
      cancelText="Отмена"
      width={720}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Наименование"
                rules={[{ required: true, message: "Введите наименование" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type_id"
                label="Тип актива"
                rules={[{ required: true, message: "Выберите тип" }]}
              >
                <Select
                  placeholder="Выберите тип"
                  showSearch
                  optionFilterProp="label"
                  options={assetTypes.map((t) => ({ value: t.id, label: t.name }))}
                  onChange={handleTypeChange}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="organization_id"
                label="Организация"
                rules={[{ required: true, message: "Выберите организацию" }]}
              >
                <Select
                  placeholder="Выберите организацию"
                  showSearch
                  optionFilterProp="label"
                  options={organizations.map((o) => ({ value: o.id, label: o.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="project_id" label="Проект">
                <Select
                  placeholder="Выберите проект"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cost"
                label="Стоимость"
                rules={[{ required: true, message: "Введите стоимость" }]}
              >
                <InputNumber style={{ width: "100%" }} min={0} precision={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="currency_id"
                label="Валюта"
                rules={[{ required: true, message: "Выберите валюту" }]}
              >
                <Select
                  placeholder="Выберите валюту"
                  showSearch
                  optionFilterProp="label"
                  options={currencies.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.symbol})`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="purchase_date"
                label="Дата покупки"
                rules={[{ required: true, message: "Выберите дату покупки" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="next_payment_date" label="Следующий платёж">
                <DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="renewal_type"
                label="Тип продления"
                initialValue="fixed"
              >
                <Select
                  options={[
                    { value: "fixed", label: "Фиксированный период" },
                    { value: "manual", label: "Плавающий (вручную)" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.renewal_type !== cur.renewal_type}>
                {({ getFieldValue }) =>
                  getFieldValue("renewal_type") === "fixed" ? (
                    <Form.Item name="renewal_period_id" label="Период продления">
                      <Select
                        placeholder="Выберите период"
                        allowClear
                        options={renewalPeriods.map((r) => ({
                          value: r.id,
                          label: r.name,
                        }))}
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item label="Период продления">
                      <Input disabled placeholder="Устанавливается при оплате" />
                    </Form.Item>
                  )
                }
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="admin_account" label="Административная учётная запись">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="comment" label="Комментарий">
            <Input.TextArea rows={3} />
          </Form.Item>

          {typeFields.length > 0 && (
            <>
              <Divider orientation="left" style={{ fontSize: 14, color: "#555" }}>
                Дополнительные параметры
              </Divider>
              <Row gutter={16}>
                {typeFields.map((field) => (
                  <Col span={12} key={field.id}>
                    <Form.Item
                      name={`field_${field.id}`}
                      label={field.name}
                      valuePropName={field.data_type === "boolean" ? "checked" : "value"}
                    >
                      {renderDynamicField(field)}
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Form>
      </Spin>
    </Modal>
  );
}
