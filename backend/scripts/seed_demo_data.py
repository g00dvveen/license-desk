"""Seed database with demo data for showcasing all features."""

import asyncio
import random
from datetime import date, timedelta

from sqlalchemy import select, func

from app.core.database import async_session_maker
from app.core.security import hash_password
from app.models.user import User
from app.models.user_permission import UserPermission
from app.models.organization import Organization
from app.models.project import Project
from app.models.currency import Currency
from app.models.renewal_period import RenewalPeriod
from app.models.asset_type import AssetType
from app.models.asset_type_field import AssetTypeField
from app.models.asset import Asset
from app.models.asset_payment import AssetPayment
from app.models.asset_cost_history import AssetCostHistory
from app.models.asset_notification_setting import AssetNotificationSetting
from app.models.notification import Notification
from app.models.system_setting import SystemSetting
from app.models.audit_log import AuditLog


async def main() -> None:
    async with async_session_maker() as db:
        # Check if data already exists
        count = (await db.execute(select(func.count()).select_from(Asset))).scalar()
        if count and count > 0:
            print(f"Database already has {count} assets. Skipping seed.")
            return

        print("Seeding demo data...")

        # ── Users ──
        admin = User(
            email="admin@demo.example.com",
            hashed_password=hash_password("admin"),
            last_name="Иванов",
            first_name="Алексей",
            middle_name="Сергеевич",
            is_active=True,
            is_superuser=True,
        )
        manager1 = User(
            email="petrov@demo.example.com",
            hashed_password=hash_password("demo"),
            last_name="Петров",
            first_name="Дмитрий",
            middle_name="Андреевич",
            is_active=True,
        )
        manager2 = User(
            email="sidorova@demo.example.com",
            hashed_password=hash_password("demo"),
            last_name="Сидорова",
            first_name="Елена",
            middle_name="Викторовна",
            is_active=True,
        )
        viewer = User(
            email="kozlov@demo.example.com",
            hashed_password=hash_password("demo"),
            last_name="Козлов",
            first_name="Михаил",
            is_active=True,
        )
        inactive = User(
            email="morozov@demo.example.com",
            hashed_password=hash_password("demo"),
            last_name="Морозов",
            first_name="Андрей",
            middle_name="Павлович",
            is_active=False,
        )
        db.add_all([admin, manager1, manager2, viewer, inactive])
        await db.flush()

        # ── Organizations ──
        orgs_data = [
            ("Альфа Технологии", "АТ-001", "771234567890", "ООО «Альфа Технологии»"),
            ("Бета Консалтинг", "БК-002", "772345678901", "ЗАО «Бета Консалтинг»"),
            ("Гамма Финанс", "ГФ-003", "773456789012", "АО «Гамма Финанс»"),
            ("Дельта Логистика", "ДЛ-004", "774567890123", "ООО «Дельта Логистика»"),
            ("Эпсилон Медиа", "ЭМ-005", "775678901234", "ООО «Эпсилон Медиа»"),
        ]
        orgs = []
        for name, ext_id, bin_val, full_name in orgs_data:
            o = Organization(name=name, external_id=ext_id, bin=bin_val, full_name=full_name)
            db.add(o)
            orgs.append(o)
        await db.flush()

        # ── Projects ──
        projects_data = [
            ("Внедрение ERP", orgs[0].id),
            ("Миграция в облако", orgs[0].id),
            ("Корпоративный портал", orgs[0].id),
            ("CRM-система", orgs[1].id),
            ("Аналитическая платформа", orgs[1].id),
            ("Мобильное приложение", orgs[2].id),
            ("Автоматизация склада", orgs[3].id),
            ("Маркетинговая платформа", orgs[4].id),
            ("Видеопродакшен", orgs[4].id),
            ("Инфраструктура DevOps", orgs[0].id),
        ]
        projects = []
        for name, org_id in projects_data:
            p = Project(name=name, organization_id=org_id)
            db.add(p)
            projects.append(p)
        await db.flush()

        # ── Permissions ──
        db.add(UserPermission(user_id=manager1.id, role="manager", organization_id=orgs[0].id))
        db.add(UserPermission(user_id=manager1.id, role="manager", organization_id=orgs[1].id))
        db.add(UserPermission(user_id=manager2.id, role="manager"))  # all orgs
        db.add(UserPermission(user_id=viewer.id, role="viewer", organization_id=orgs[0].id))
        db.add(UserPermission(user_id=viewer.id, role="viewer", organization_id=orgs[2].id))

        # ── Currencies ──
        currencies_data = [
            ("KZT", "Тенге", "₸"),
            ("USD", "Доллар США", "$"),
            ("EUR", "Евро", "€"),
            ("RUB", "Рубль", "₽"),
        ]
        currencies = []
        for code, name, symbol in currencies_data:
            existing = (await db.execute(select(Currency).where(Currency.code == code))).scalar_one_or_none()
            if existing:
                currencies.append(existing)
            else:
                c = Currency(code=code, name=name, symbol=symbol)
                db.add(c)
                currencies.append(c)
        await db.flush()

        # ── Renewal Periods ──
        periods_data = [
            ("Ежемесячно", 1),
            ("Ежеквартально", 3),
            ("Полугодовой", 6),
            ("Ежегодно", 12),
            ("Раз в 2 года", 24),
            ("Раз в 3 года", 36),
        ]
        periods = []
        for name, months in periods_data:
            rp = RenewalPeriod(name=name, months=months)
            db.add(rp)
            periods.append(rp)
        await db.flush()

        # ── Asset Types ──
        type_software = AssetType(name="Программное обеспечение", description="Лицензии на ПО, SaaS-подписки")
        type_domain = AssetType(name="Домен", description="Доменные имена")
        type_ssl = AssetType(name="SSL-сертификат", description="SSL/TLS сертификаты")
        type_cloud = AssetType(name="Облачный сервис", description="IaaS/PaaS подписки")
        type_support = AssetType(name="Техподдержка", description="Контракты техподдержки и SLA")
        type_design = AssetType(name="Дизайн-ресурс", description="Подписки на стоки и инструменты дизайна")
        db.add_all([type_software, type_domain, type_ssl, type_cloud, type_support, type_design])
        await db.flush()

        # Fields for software
        db.add(AssetTypeField(type_id=type_software.id, name="Кол-во лицензий", data_type="number", sort_order=1))
        db.add(AssetTypeField(type_id=type_software.id, name="Версия", data_type="string", sort_order=2))
        db.add(AssetTypeField(type_id=type_software.id, name="Тип лицензии", data_type="string", sort_order=3))

        # Fields for domain
        db.add(AssetTypeField(type_id=type_domain.id, name="Регистратор", data_type="string", sort_order=1))
        db.add(AssetTypeField(type_id=type_domain.id, name="DNS-провайдер", data_type="string", sort_order=2))

        # Fields for SSL
        db.add(AssetTypeField(type_id=type_ssl.id, name="Тип сертификата", data_type="string", sort_order=1))
        db.add(AssetTypeField(type_id=type_ssl.id, name="Wildcard", data_type="boolean", sort_order=2))

        # Fields for cloud
        db.add(AssetTypeField(type_id=type_cloud.id, name="Провайдер", data_type="string", sort_order=1))
        db.add(AssetTypeField(type_id=type_cloud.id, name="Регион", data_type="string", sort_order=2))

        # ── System Settings ──
        existing = (await db.execute(select(SystemSetting).where(SystemSetting.key == "notification_days_before_payment"))).scalar_one_or_none()
        if not existing:
            db.add(SystemSetting(key="notification_days_before_payment", value=[14]))

        # ── Assets ──
        today = date.today()

        assets_data = [
            # (name, type, org_idx, project_idx|None, cost, currency_idx, purchase_date, next_payment, period_idx|None, renewal_type, admin_account, comment)
            ("Microsoft 365 Business", type_software, 0, 0, 45000, 1, -400, 30, 3, "fixed", "admin@alpha-tech.com", "Пакет E3, 50 пользователей"),
            ("Adobe Creative Cloud", type_software, 4, 8, 32000, 1, -300, 65, 3, "fixed", "design@epsilon.com", "Командная подписка, 10 мест"),
            ("JetBrains All Products", type_software, 0, 9, 28000, 1, -200, 165, 3, "fixed", "devops@alpha-tech.com", "12 лицензий разработчиков"),
            ("Atlassian Cloud (Jira + Confluence)", type_software, 0, 0, 18500, 1, -350, 15, 3, "fixed", "admin@alpha-tech.com", "Premium план, 100 пользователей"),
            ("Slack Business+", type_software, 1, 3, 12000, 1, -180, 185, 3, "fixed", None, "Командная работа, 40 пользователей"),
            ("1С:Предприятие 8.3", type_software, 2, 5, 850000, 0, -700, 90, 3, "fixed", "1c-admin@gamma.com", "Серверная лицензия + 30 клиентских"),
            ("Figma Enterprise", type_design, 4, 8, 15000, 1, -150, 215, 3, "fixed", "design@epsilon.com", "Команда дизайна, 8 мест"),
            ("GitHub Enterprise", type_software, 0, 9, 21000, 1, -250, 115, 3, "fixed", "devops@alpha-tech.com", "50 разработчиков"),
            ("Zoom Business", type_software, 1, 4, 8500, 1, -120, 245, 3, "fixed", None, "25 лицензий"),
            ("Notion Team", type_software, 0, 2, 6000, 1, -90, 275, 0, "fixed", None, "Корпоративная вики"),

            ("alpha-technologies.com", type_domain, 0, None, 1500, 0, -730, 5, 3, "fixed", "dns@alpha-tech.com", "Основной домен"),
            ("beta-consulting.kz", type_domain, 1, None, 3500, 0, -365, 1, 3, "fixed", None, "Корпоративный сайт"),
            ("gamma-finance.com", type_domain, 2, None, 1200, 1, -500, 50, 3, "fixed", None, None),
            ("delta-logistics.kz", type_domain, 3, None, 2800, 0, -200, 165, 3, "fixed", None, None),
            ("epsilon-media.studio", type_domain, 4, None, 4500, 1, -400, 60, 3, "fixed", None, "Премиум домен"),

            ("SSL alpha-technologies.com", type_ssl, 0, None, 15000, 0, -300, 65, 3, "fixed", None, "Wildcard сертификат"),
            ("SSL beta-consulting.kz", type_ssl, 1, None, 8000, 0, -180, 185, 3, "fixed", None, "OV сертификат"),
            ("SSL *.gamma-finance.com", type_ssl, 2, None, 25000, 0, -100, 265, 3, "fixed", None, "EV Wildcard"),

            ("AWS (Альфа Технологии)", type_cloud, 0, 1, 150000, 1, -365, 3, None, "manual", "aws-root@alpha-tech.com", "EC2, S3, RDS — миграция в облако"),
            ("Yandex Cloud (Гамма)", type_cloud, 2, 5, 85000, 3, -200, 10, None, "manual", "cloud@gamma.com", "Compute, Object Storage"),
            ("Azure DevOps", type_cloud, 0, 9, 45000, 1, -150, 25, 0, "fixed", "azure@alpha-tech.com", "CI/CD пайплайны"),
            ("DigitalOcean (Эпсилон)", type_cloud, 4, 7, 12000, 1, -90, None, None, "manual", None, "Маркетинговые лендинги"),

            ("Поддержка 1С (Гамма)", type_support, 2, 5, 120000, 3, -365, 20, 3, "fixed", None, "Расширенная техподдержка"),
            ("Cisco SmartNet", type_support, 3, 6, 95000, 1, -400, 40, 3, "fixed", None, "Сетевое оборудование склада"),
            ("Oracle Support", type_support, 2, None, 200000, 1, -500, 80, 3, "fixed", "oracle@gamma.com", "Database Standard Edition"),

            ("Shutterstock Enterprise", type_design, 4, 8, 22000, 1, -180, 185, 3, "fixed", None, "750 загрузок/месяц"),
            ("Canva Pro", type_design, 4, 7, 8000, 1, -120, 245, 3, "fixed", None, "Маркетинговая команда, 5 мест"),

            ("Google Workspace", type_software, 1, None, 35000, 1, -300, 65, 3, "fixed", "admin@beta-consult.com", "Business Standard, 30 пользователей"),
            ("Bitdefender GravityZone", type_software, 0, None, 42000, 2, -250, 115, 3, "fixed", "security@alpha-tech.com", "Endpoint Security, 100 узлов"),
            ("Salesforce CRM", type_software, 1, 3, 180000, 1, -365, 2, 3, "fixed", "crm@beta-consult.com", "Enterprise Edition, 20 пользователей"),

            ("Veeam Backup", type_software, 3, 6, 55000, 2, -400, 145, 3, "fixed", "backup@delta.com", "Резервное копирование инфраструктуры"),
            ("Kaspersky Endpoint Security", type_software, 2, None, 38000, 3, -280, 85, 3, "fixed", None, "200 узлов"),
        ]

        assets = []
        for row in assets_data:
            name, atype, org_idx, proj_idx, cost, cur_idx, purchase_offset, next_offset, period_idx, renewal_type, admin_acc, comment = row
            a = Asset(
                name=name,
                type_id=atype.id,
                organization_id=orgs[org_idx].id,
                project_id=projects[proj_idx].id if proj_idx is not None else None,
                cost=cost,
                currency_id=currencies[cur_idx].id,
                purchase_date=today + timedelta(days=purchase_offset),
                next_payment_date=(today + timedelta(days=next_offset)) if next_offset is not None else None,
                renewal_period_id=periods[period_idx].id if period_idx is not None else None,
                renewal_type=renewal_type,
                admin_account=admin_acc,
                comment=comment,
            )
            db.add(a)
            assets.append(a)
        await db.flush()

        # ── Notification settings for all assets ──
        for a in assets:
            db.add(AssetNotificationSetting(asset_id=a.id, days_before=14))

        # ── Disable notifications for some assets ──
        for idx in [11, 13, 21]:  # some domains and DigitalOcean
            if idx < len(assets):
                assets[idx].notifications_enabled = False

        # ── Archived assets ──
        archived_data = [
            ("Dropbox Business (устарел)", type_cloud, 0, None, 9000, 1, -800, None, None, "fixed", None, "Мигрировали на OneDrive"),
            ("Trello Premium (устарел)", type_software, 1, None, 5000, 1, -600, None, None, "fixed", None, "Перешли на Jira"),
            ("GoDaddy SSL (устарел)", type_ssl, 0, None, 3000, 1, -500, None, None, "fixed", None, "Заменён на Let's Encrypt"),
        ]
        for row in archived_data:
            name, atype, org_idx, proj_idx, cost, cur_idx, purchase_offset, next_offset, period_idx, renewal_type, admin_acc, comment = row
            a = Asset(
                name=name,
                type_id=atype.id,
                organization_id=orgs[org_idx].id,
                project_id=projects[proj_idx].id if proj_idx is not None else None,
                cost=cost,
                currency_id=currencies[cur_idx].id,
                purchase_date=today + timedelta(days=purchase_offset),
                next_payment_date=None,
                renewal_period_id=None,
                renewal_type=renewal_type,
                admin_account=admin_acc,
                comment=comment,
                is_archived=True,
                notifications_enabled=False,
            )
            db.add(a)

        # ── Payments ──
        payment_users = [admin.id, manager1.id, manager2.id]
        for a in assets[:20]:  # payments for first 20 assets
            num_payments = random.randint(1, 4)
            for i in range(num_payments):
                pdate = a.purchase_date + timedelta(days=30 * (i + 1) + random.randint(-5, 5))
                if pdate > today:
                    continue
                p = AssetPayment(
                    asset_id=a.id,
                    date=pdate,
                    amount=float(a.cost) * random.uniform(0.9, 1.1),
                    currency_id=a.currency_id,
                    comment=random.choice([None, "Плановый платёж", "Продление", "Ежемесячная оплата", "Оплата по счёту"]),
                    created_by=random.choice(payment_users),
                )
                db.add(p)

        # ── Cost History ──
        for a in assets[:15]:
            old_cost = float(a.cost) * random.uniform(0.7, 0.95)
            db.add(AssetCostHistory(
                asset_id=a.id,
                old_value=round(old_cost, 2),
                new_value=float(a.cost),
                currency_id=a.currency_id,
                changed_by=admin.id,
            ))

        # Currency change example
        if len(assets) > 5:
            db.add(AssetCostHistory(
                asset_id=assets[5].id,
                old_value=5000.0,
                new_value=850000.0,
                currency_id=currencies[0].id,  # new: KZT
                old_currency_id=currencies[1].id,  # old: USD
                changed_by=admin.id,
            ))

        # ── Notifications ──
        notif_data = [
            ("Приближается платёж: Microsoft 365 Business", "До даты платежа осталось 14 дней", "asset"),
            ("Приближается платёж: Atlassian Cloud", "До даты платежа осталось 7 дней", "asset"),
            ("Платёж завтра: beta-consulting.kz", "Домен beta-consulting.kz требует продления завтра", "asset"),
            ("Приближается платёж: Salesforce CRM", "До даты платежа осталось 2 дня", "asset"),
            ("Приближается платёж: AWS", "Рекомендуется проверить расходы на AWS", "asset"),
        ]
        for i, (title, msg, etype) in enumerate(notif_data):
            db.add(Notification(
                user_id=admin.id,
                title=title,
                message=msg,
                entity_type=etype,
                entity_id=assets[i].id if i < len(assets) else 1,
                is_read=i > 2,  # first 3 unread
            ))
        # Notifications for manager
        db.add(Notification(
            user_id=manager1.id,
            title="Приближается платёж: JetBrains",
            message="До даты платежа JetBrains All Products осталось 14 дней",
            entity_type="asset",
            entity_id=assets[2].id,
        ))

        # ── Audit Log ──
        audit_entries = [
            (admin.id, "create", "asset", assets[0].id, None, {"name": "Microsoft 365 Business"}),
            (admin.id, "create", "asset", assets[5].id, None, {"name": "1С:Предприятие 8.3"}),
            (manager1.id, "update", "asset", assets[0].id, {"cost": 40000.0}, {"cost": 45000.0}),
            (manager2.id, "payment", "asset", assets[0].id, None, {"amount": 45000.0, "date": str(today - timedelta(days=30))}),
            (admin.id, "update", "asset", assets[5].id, {"cost": 5000.0, "currency_id": currencies[1].id}, {"cost": 850000.0, "currency_id": currencies[0].id}),
            (admin.id, "archive", "asset", assets[0].id, None, None),
            (admin.id, "restore", "asset", assets[0].id, None, None),
            (manager1.id, "create", "asset", assets[7].id, None, {"name": "GitHub Enterprise"}),
            (manager2.id, "payment", "asset", assets[7].id, None, {"amount": 21000.0}),
            (admin.id, "update", "asset", assets[9].id, {"comment": None}, {"comment": "Корпоративная вики"}),
        ]
        for user_id, action, etype, eid, old_v, new_v in audit_entries:
            db.add(AuditLog(
                user_id=user_id,
                action=action,
                entity_type=etype,
                entity_id=eid,
                old_values=old_v,
                new_values=new_v,
            ))

        await db.commit()

        print(f"Demo data seeded successfully!")
        print(f"  Users: 5 (admin + 2 managers + viewer + inactive)")
        print(f"  Organizations: {len(orgs)}")
        print(f"  Projects: {len(projects)}")
        print(f"  Assets: {len(assets)} active + 3 archived")
        print(f"  Payments: ~40-60")
        print(f"")
        print(f"Login credentials:")
        print(f"  Admin:   admin@demo.example.com / admin")
        print(f"  Manager: petrov@demo.example.com / demo")
        print(f"  Manager: sidorova@demo.example.com / demo")
        print(f"  Viewer:  kozlov@demo.example.com / demo")


if __name__ == "__main__":
    asyncio.run(main())
