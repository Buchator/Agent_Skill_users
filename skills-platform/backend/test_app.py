"""
Skills Platform - Pruebas Automatizadas
Cubre: autenticación, skills service, anthropic service y endpoints API.
"""
import os
import sys
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import timedelta

# Configurar variables de entorno ANTES de importar módulos de la app
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_skills_platform.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["SKILLS_DIRECTORY"] = "/tmp/test_skills"

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from models import Base, User
from config import settings
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    UserCreate,
)
from skills_service import SkillService, SKILLS_CATALOG


# ============== FIXTURES ==============

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_skills_platform.db"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
TestAsyncSession = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    """Override de la dependencia de BD para tests"""
    async with TestAsyncSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Crea y limpia la BD de test para cada test"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    # Limpiar archivo de BD de test
    if os.path.exists("./test_skills_platform.db"):
        os.remove("./test_skills_platform.db")


@pytest_asyncio.fixture
async def db_session():
    """Sesión de BD para tests unitarios"""
    async with TestAsyncSession() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    """Cliente HTTP para tests de endpoints"""
    from main import app
    from database import get_db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient):
    """Registra un usuario de prueba y retorna sus datos"""
    user_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPassword123",
        "full_name": "Test User",
        "organization": "Test Org",
    }
    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 200
    return {**user_data, "response": response.json()}


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient, registered_user: dict):
    """Obtiene un token JWT para un usuario registrado"""
    response = await client.post(
        "/api/auth/login",
        data={
            "username": registered_user["username"],
            "password": registered_user["password"],
        },
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def auth_headers(auth_token: str):
    """Headers de autorización con token Bearer"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession):
    """Crea un usuario admin directamente en la BD"""
    hashed = get_password_hash("AdminPass123")
    admin = User(
        email="admin@example.com",
        username="adminuser",
        hashed_password=hashed,
        full_name="Admin User",
        is_admin=True,
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture
async def admin_token(client: AsyncClient, admin_user):
    """Token JWT de un usuario admin"""
    response = await client.post(
        "/api/auth/login",
        data={"username": "adminuser", "password": "AdminPass123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def admin_headers(admin_token: str):
    """Headers de autorización para admin"""
    return {"Authorization": f"Bearer {admin_token}"}


# ============== TESTS: AUTH - FUNCIONES UTILITARIAS ==============


class TestPasswordHashing:
    """Pruebas de hash y verificación de contraseñas"""

    def test_hash_password(self):
        password = "MiPassword123"
        hashed = get_password_hash(password)
        assert hashed != password
        assert len(hashed) > 0

    def test_verify_correct_password(self):
        password = "MiPassword123"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_verify_incorrect_password(self):
        hashed = get_password_hash("CorrectPassword")
        assert verify_password("WrongPassword", hashed) is False

    def test_different_hashes_for_same_password(self):
        password = "MiPassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        # bcrypt genera salts diferentes, así que los hashes deben ser distintos
        assert hash1 != hash2
        # Pero ambos deben verificar correctamente
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestJWTToken:
    """Pruebas de creación y validación de tokens JWT"""

    def test_create_token(self):
        token = create_access_token(data={"sub": "testuser"})
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_token_with_expiry(self):
        expires = timedelta(minutes=30)
        token = create_access_token(data={"sub": "testuser"}, expires_delta=expires)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_token_contains_payload(self):
        from jose import jwt as jose_jwt

        token = create_access_token(data={"sub": "testuser"})
        payload = jose_jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert payload["sub"] == "testuser"
        assert "exp" in payload

    def test_token_with_default_expiry(self):
        from jose import jwt as jose_jwt

        token = create_access_token(data={"sub": "testuser"})
        payload = jose_jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        assert "exp" in payload


# ============== TESTS: AUTH - ENDPOINTS ==============


class TestRegisterEndpoint:
    """Pruebas del endpoint de registro"""

    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "nuevo@example.com",
                "username": "nuevousuario",
                "password": "Password123",
                "full_name": "Nuevo Usuario",
                "organization": "Mi Org",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "nuevousuario"
        assert data["email"] == "nuevo@example.com"
        assert data["full_name"] == "Nuevo Usuario"
        assert data["is_admin"] is False
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_register_duplicate_username(
        self, client: AsyncClient, registered_user
    ):
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "otro@example.com",
                "username": registered_user["username"],
                "password": "Password123",
            },
        )
        assert response.status_code == 400
        assert "ya está registrado" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_duplicate_email(
        self, client: AsyncClient, registered_user
    ):
        response = await client.post(
            "/api/auth/register",
            json={
                "email": registered_user["email"],
                "username": "otrousuario",
                "password": "Password123",
            },
        )
        assert response.status_code == 400
        assert "email ya está registrado" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_missing_fields(self, client: AsyncClient):
        response = await client.post(
            "/api/auth/register",
            json={"email": "test@test.com"},
        )
        assert response.status_code == 422  # Validation error


class TestLoginEndpoint:
    """Pruebas del endpoint de login"""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, registered_user):
        response = await client.post(
            "/api/auth/login",
            data={
                "username": registered_user["username"],
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == registered_user["username"]

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, registered_user):
        response = await client.post(
            "/api/auth/login",
            data={
                "username": registered_user["username"],
                "password": "WrongPassword",
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        response = await client.post(
            "/api/auth/login",
            data={"username": "noexiste", "password": "Password123"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_returns_valid_token(
        self, client: AsyncClient, registered_user
    ):
        response = await client.post(
            "/api/auth/login",
            data={
                "username": registered_user["username"],
                "password": registered_user["password"],
            },
        )
        token = response.json()["access_token"]
        # Usar el token para acceder a un endpoint protegido
        me_response = await client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200


class TestMeEndpoint:
    """Pruebas del endpoint /api/auth/me"""

    @pytest.mark.asyncio
    async def test_get_me_authenticated(
        self, client: AsyncClient, auth_headers, registered_user
    ):
        response = await client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == registered_user["username"]
        assert data["email"] == registered_user["email"]

    @pytest.mark.asyncio
    async def test_get_me_no_token(self, client: AsyncClient):
        response = await client.get("/api/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_me_invalid_token(self, client: AsyncClient):
        response = await client.get(
            "/api/auth/me", headers={"Authorization": "Bearer invalidtoken123"}
        )
        assert response.status_code == 401


# ============== TESTS: SKILLS SERVICE ==============


class TestSkillsCatalog:
    """Pruebas del catálogo de skills"""

    def test_catalog_not_empty(self):
        assert len(SKILLS_CATALOG) > 0

    def test_catalog_has_expected_skills(self):
        expected_ids = [
            "analisis-riesgos-datos",
            "citacion-academica-chicago",
            "experto-consumidor-ec",
            "experto-pdp",
            "guia-documentos-pdp",
        ]
        for skill_id in expected_ids:
            assert skill_id in SKILLS_CATALOG, f"Skill '{skill_id}' no encontrado"

    def test_each_skill_has_required_fields(self):
        required_fields = [
            "name",
            "description",
            "category",
            "icon",
            "input_schema",
            "output_format",
        ]
        for skill_id, metadata in SKILLS_CATALOG.items():
            for field in required_fields:
                assert field in metadata, (
                    f"Skill '{skill_id}' le falta el campo '{field}'"
                )

    def test_each_skill_has_input_fields(self):
        for skill_id, metadata in SKILLS_CATALOG.items():
            schema = metadata["input_schema"]
            assert "fields" in schema, (
                f"Skill '{skill_id}' no tiene 'fields' en input_schema"
            )
            assert len(schema["fields"]) > 0, (
                f"Skill '{skill_id}' no tiene campos de input"
            )

    def test_input_fields_have_required_properties(self):
        field_required_props = ["name", "label", "type", "required"]
        for skill_id, metadata in SKILLS_CATALOG.items():
            for field in metadata["input_schema"]["fields"]:
                for prop in field_required_props:
                    assert prop in field, (
                        f"Campo '{field.get('name', '?')}' en skill '{skill_id}' "
                        f"le falta '{prop}'"
                    )


class TestSkillService:
    """Pruebas del SkillService"""

    def test_get_catalog_returns_list(self):
        service = SkillService()
        catalog = service.get_catalog()
        assert isinstance(catalog, list)
        assert len(catalog) == len(SKILLS_CATALOG)

    def test_catalog_items_have_skill_id(self):
        service = SkillService()
        catalog = service.get_catalog()
        for item in catalog:
            assert "skill_id" in item
            assert "name" in item
            assert "description" in item

    def test_get_skill_metadata_existing(self):
        service = SkillService()
        metadata = service.get_skill_metadata("experto-pdp")
        assert metadata is not None
        assert metadata["skill_id"] == "experto-pdp"
        assert metadata["name"] == "Experto en Protección de Datos EC"

    def test_get_skill_metadata_nonexistent(self):
        service = SkillService()
        metadata = service.get_skill_metadata("skill-que-no-existe")
        assert metadata is None

    def test_build_prompt_without_skill_file(self):
        """Sin archivo SKILL.md, build_prompt debe retornar None"""
        service = SkillService()
        result = service.build_prompt("experto-pdp", {"consulta": "test"})
        # Sin el directorio de skills real, retorna None
        assert result is None

    def test_build_prompt_with_mock_skill_file(self, tmp_path):
        """Con archivo SKILL.md simulado, build_prompt debe construir el prompt"""
        # Crear estructura de skill temporal
        skill_dir = tmp_path / "experto-pdp"
        skill_dir.mkdir()
        skill_file = skill_dir / "SKILL.md"
        skill_file.write_text("# Skill de Prueba\nEres un experto en protección de datos.")

        service = SkillService()
        service.skills_dir = tmp_path

        result = service.build_prompt("experto-pdp", {"consulta": "test de consulta"})
        assert result is not None
        assert "system" in result
        assert "user" in result
        assert "Skill de Prueba" in result["system"]
        assert "test de consulta" in result["user"]

    def test_build_prompt_includes_references(self, tmp_path):
        """Verifica que se incluyen archivos de referencia en el prompt"""
        skill_dir = tmp_path / "test-skill"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("# Test Skill")
        refs_dir = skill_dir / "references"
        refs_dir.mkdir()
        (refs_dir / "ley.md").write_text("Artículo 1: Ley de prueba")

        # Agregar el skill al catálogo temporalmente
        SKILLS_CATALOG["test-skill"] = {
            "name": "Test Skill",
            "description": "Skill de prueba",
            "category": "Test",
            "icon": "🧪",
            "input_schema": {"fields": [{"name": "input", "label": "Input", "type": "text", "required": True}]},
            "output_format": "text",
        }

        try:
            service = SkillService()
            service.skills_dir = tmp_path
            result = service.build_prompt("test-skill", {"input": "datos"})
            assert result is not None
            assert "REFERENCIAS" in result["system"]
            assert "Ley de prueba" in result["system"]
        finally:
            del SKILLS_CATALOG["test-skill"]


# ============== TESTS: ANTHROPIC SERVICE ==============


class TestAnthropicService:
    """Pruebas del servicio de Anthropic"""

    def test_service_not_configured_without_key(self):
        from anthropic_service import AnthropicService

        with patch.object(settings, "ANTHROPIC_API_KEY", None):
            service = AnthropicService()
            assert service.is_configured() is False

    def test_service_configured_with_key(self):
        from anthropic_service import AnthropicService

        with patch.object(settings, "ANTHROPIC_API_KEY", "sk-test-key"):
            service = AnthropicService()
            assert service.is_configured() is True

    @pytest.mark.asyncio
    async def test_execute_skill_not_configured(self):
        from anthropic_service import AnthropicService

        with patch.object(settings, "ANTHROPIC_API_KEY", None):
            service = AnthropicService()
            result = await service.execute_skill("experto-pdp", {"consulta": "test"})
            assert result["success"] is False
            assert "no configurada" in result["error"]

    @pytest.mark.asyncio
    async def test_execute_skill_not_found(self):
        from anthropic_service import AnthropicService

        with patch.object(settings, "ANTHROPIC_API_KEY", "sk-test-key"):
            service = AnthropicService()
            # build_prompt retorna None si no encuentra el SKILL.md
            result = await service.execute_skill(
                "skill-inexistente", {"input": "test"}
            )
            assert result["success"] is False

    @pytest.mark.asyncio
    async def test_execute_skill_success_mock(self, tmp_path):
        """Prueba ejecución exitosa con mock del cliente de Anthropic"""
        from anthropic_service import AnthropicService
        from skills_service import skill_service as _skill_service

        # Crear skill temporal
        skill_dir = tmp_path / "experto-pdp"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("# Experto PDP\nInstrucciones del skill.")

        original_skills_dir = _skill_service.skills_dir
        try:
            with patch.object(settings, "ANTHROPIC_API_KEY", "sk-test-key"):
                service = AnthropicService()
                _skill_service.skills_dir = tmp_path

                # Mock del cliente
                mock_message = MagicMock()
                mock_block = MagicMock()
                mock_block.text = "Respuesta generada por Claude."
                mock_message.content = [mock_block]
                mock_message.usage.input_tokens = 100
                mock_message.usage.output_tokens = 50
                mock_message.model = "claude-test"

                service.client = MagicMock()
                service.client.messages.create = MagicMock(return_value=mock_message)

                result = await service.execute_skill(
                    "experto-pdp", {"consulta": "Consulta de prueba"}
                )

                assert result["success"] is True
                assert result["output"] == "Respuesta generada por Claude."
                assert result["tokens_used"] == 150
        finally:
            _skill_service.skills_dir = original_skills_dir

    @pytest.mark.asyncio
    async def test_execute_skill_api_error(self, tmp_path):
        """Prueba manejo de error de API"""
        from anthropic_service import AnthropicService
        from skills_service import skill_service as _skill_service
        import httpx

        skill_dir = tmp_path / "experto-pdp"
        skill_dir.mkdir()
        (skill_dir / "SKILL.md").write_text("# Experto PDP")

        original_skills_dir = _skill_service.skills_dir
        try:
            with patch.object(settings, "ANTHROPIC_API_KEY", "sk-test-key"):
                service = AnthropicService()
                _skill_service.skills_dir = tmp_path

                service.client = MagicMock()
                service.client.messages.create = MagicMock(
                    side_effect=Exception("Rate limit exceeded")
                )

                result = await service.execute_skill(
                    "experto-pdp", {"consulta": "test"}
                )
                assert result["success"] is False
                assert "Error" in result["error"]
        finally:
            _skill_service.skills_dir = original_skills_dir


# ============== TESTS: API ENDPOINTS ==============


class TestHealthEndpoint:
    """Pruebas del endpoint de health check"""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "app" in data
        assert "version" in data
        assert "skills_available" in data
        assert data["skills_available"] > 0


class TestRootEndpoint:
    """Pruebas del endpoint raíz"""

    @pytest.mark.asyncio
    async def test_root(self, client: AsyncClient):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "docs" in data
        assert "health" in data


class TestSkillsEndpoints:
    """Pruebas de los endpoints de skills"""

    @pytest.mark.asyncio
    async def test_get_skills_catalog_authenticated(
        self, client: AsyncClient, auth_headers
    ):
        response = await client.get("/api/skills", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verificar estructura de cada skill
        for skill in data:
            assert "skill_id" in skill
            assert "name" in skill
            assert "description" in skill
            assert "category" in skill

    @pytest.mark.asyncio
    async def test_get_skills_catalog_unauthenticated(self, client: AsyncClient):
        response = await client.get("/api/skills")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_skill_detail(self, client: AsyncClient, auth_headers):
        response = await client.get(
            "/api/skills/experto-pdp", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["skill_id"] == "experto-pdp"
        assert data["name"] == "Experto en Protección de Datos EC"

    @pytest.mark.asyncio
    async def test_get_skill_detail_not_found(
        self, client: AsyncClient, auth_headers
    ):
        response = await client.get(
            "/api/skills/no-existe", headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_execute_skill_unauthenticated(self, client: AsyncClient):
        response = await client.post(
            "/api/skills/execute",
            json={"skill_id": "experto-pdp", "inputs": {"consulta": "test"}},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_execute_skill_not_found(
        self, client: AsyncClient, auth_headers
    ):
        response = await client.post(
            "/api/skills/execute",
            json={"skill_id": "no-existe", "inputs": {"consulta": "test"}},
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestAdminEndpoints:
    """Pruebas de los endpoints de administración"""

    @pytest.mark.asyncio
    async def test_list_users_as_admin(
        self, client: AsyncClient, admin_headers
    ):
        response = await client.get("/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # Al menos el admin

    @pytest.mark.asyncio
    async def test_list_users_as_regular_user(
        self, client: AsyncClient, auth_headers
    ):
        response = await client.get("/api/admin/users", headers=auth_headers)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_list_users_unauthenticated(self, client: AsyncClient):
        response = await client.get("/api/admin/users")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_usage_stats_as_admin(
        self, client: AsyncClient, admin_headers
    ):
        response = await client.get("/api/admin/usage", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_requests" in data
        assert "successful_requests" in data
        assert "failed_requests" in data
        assert "total_tokens_used" in data

    @pytest.mark.asyncio
    async def test_usage_stats_as_regular_user(
        self, client: AsyncClient, auth_headers
    ):
        response = await client.get("/api/admin/usage", headers=auth_headers)
        assert response.status_code == 403


# ============== TESTS: MODELOS ==============


class TestUserModel:
    """Pruebas del modelo User"""

    @pytest.mark.asyncio
    async def test_create_user(self, db_session: AsyncSession):
        user = User(
            email="model_test@example.com",
            username="modeltest",
            hashed_password=get_password_hash("password"),
            full_name="Model Test",
            is_active=True,
            is_admin=False,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.id is not None
        assert user.username == "modeltest"
        assert user.is_active is True
        assert user.is_admin is False
        assert user.created_at is not None

    @pytest.mark.asyncio
    async def test_user_defaults(self, db_session: AsyncSession):
        user = User(
            email="defaults@example.com",
            username="defaultuser",
            hashed_password="hash",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.is_active is True
        assert user.is_admin is False


# ============== TESTS: INTEGRACIÓN ==============


class TestIntegrationFlow:
    """Pruebas de integración - flujo completo de usuario"""

    @pytest.mark.asyncio
    async def test_register_login_access_skills(self, client: AsyncClient):
        """Flujo completo: registro -> login -> acceso a skills"""
        # 1. Registrar
        reg_response = await client.post(
            "/api/auth/register",
            json={
                "email": "integration@example.com",
                "username": "integrationuser",
                "password": "IntegrationPass123",
                "full_name": "Integration User",
            },
        )
        assert reg_response.status_code == 200

        # 2. Login
        login_response = await client.post(
            "/api/auth/login",
            data={
                "username": "integrationuser",
                "password": "IntegrationPass123",
            },
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Obtener perfil
        me_response = await client.get("/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["username"] == "integrationuser"

        # 4. Listar skills
        skills_response = await client.get("/api/skills", headers=headers)
        assert skills_response.status_code == 200
        skills = skills_response.json()
        assert len(skills) > 0

        # 5. Ver detalle de un skill
        detail_response = await client.get(
            f"/api/skills/{skills[0]['skill_id']}", headers=headers
        )
        assert detail_response.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_flow(self, client: AsyncClient, admin_headers):
        """Flujo de administrador: listar usuarios y ver estadísticas"""
        # Registrar un usuario primero
        await client.post(
            "/api/auth/register",
            json={
                "email": "regular@example.com",
                "username": "regularuser",
                "password": "RegularPass123",
            },
        )

        # Admin lista usuarios
        users_response = await client.get(
            "/api/admin/users", headers=admin_headers
        )
        assert users_response.status_code == 200
        users = users_response.json()
        usernames = [u["username"] for u in users]
        assert "adminuser" in usernames
        assert "regularuser" in usernames

        # Admin ve estadísticas
        usage_response = await client.get(
            "/api/admin/usage", headers=admin_headers
        )
        assert usage_response.status_code == 200

    @pytest.mark.asyncio
    async def test_unauthorized_admin_access(
        self, client: AsyncClient, auth_headers
    ):
        """Un usuario regular no puede acceder a endpoints de admin"""
        users_response = await client.get(
            "/api/admin/users", headers=auth_headers
        )
        assert users_response.status_code == 403

        usage_response = await client.get(
            "/api/admin/usage", headers=auth_headers
        )
        assert usage_response.status_code == 403
