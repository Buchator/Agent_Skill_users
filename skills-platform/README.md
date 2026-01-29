# Skills Platform - DPH

Plataforma para exponer tus skills de Claude a usuarios externos de forma segura, sin revelar el contenido de los prompts.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     USUARIOS EXTERNOS                            │
│                   (login + catálogo)                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (index.html)                        │
│         • Autenticación JWT                                     │
│         • Catálogo visual de skills                             │
│         • Formularios dinámicos                                 │
│         • Visualización de resultados                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │ API REST
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                           │
│         • Autenticación y autorización                          │
│         • Encapsulamiento de skills (NUNCA expuestos)           │
│         • Construcción de prompts                               │
│         • Integración con API de Anthropic                      │
│         • Logs de uso                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API DE ANTHROPIC                               │
│              (Claude procesa con tu skill)                       │
└─────────────────────────────────────────────────────────────────┘
```

## 🔒 Seguridad

**El contenido de los SKILL.md NUNCA se expone al usuario final:**

1. Los skills se almacenan en el servidor (no en el frontend)
2. El catálogo solo muestra metadatos públicos (nombre, descripción, campos)
3. El prompt completo se construye en el backend
4. Solo se devuelve la respuesta de Claude, no el prompt usado

## 🚀 Instalación

### Requisitos

- Python 3.10+
- pip
- Tu API Key de Anthropic

### 1. Clonar y configurar el backend

```bash
cd skills-platform/backend

# Crear entorno virtual (recomendado)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY y SKILLS_DIRECTORY
```

### 2. Configurar el directorio de skills

En el archivo `.env`, establece `SKILLS_DIRECTORY` al directorio donde tienes tus skills:

```
SKILLS_DIRECTORY=/ruta/a/tus/skills
```

La estructura esperada es:
```
skills/
├── skill-1/
│   ├── SKILL.md
│   └── references/
│       └── archivo.md
├── skill-2/
│   ├── SKILL.md
│   └── references/
└── ...
```

### 3. Crear usuario administrador

```bash
python create_admin.py
```

### 4. Iniciar el servidor

```bash
# Desarrollo
uvicorn main:app --reload --port 8000

# Producción
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 5. Abrir el frontend

Abre `frontend/index.html` en tu navegador o sírvelo con un servidor web:

```bash
# Opción simple con Python
cd ../frontend
python -m http.server 3000
```

Luego visita: `http://localhost:3000`

## 📚 Uso

### Para usuarios

1. Registrarse o iniciar sesión
2. Explorar el catálogo de skills
3. Seleccionar un skill
4. Completar los campos requeridos
5. Ejecutar y obtener el resultado

### Para administradores

1. Crear usuarios desde la API o BD
2. Monitorear uso en `/api/admin/usage`
3. Gestionar accesos por usuario (próximamente)

## 🔧 Agregar nuevos skills

1. Crear el skill en tu directorio de skills:
   ```
   tu-nuevo-skill/
   ├── SKILL.md
   └── references/
       └── datos.md
   ```

2. Agregar los metadatos en `backend/skills_service.py`:
   ```python
   "tu-nuevo-skill": {
       "name": "Nombre del Skill",
       "description": "Descripción pública",
       "category": "Categoría",
       "icon": "🔧",
       "input_schema": {
           "fields": [
               {"name": "campo1", "label": "Campo 1", "type": "text", "required": True},
               {"name": "campo2", "label": "Campo 2", "type": "textarea", "required": False}
           ]
       },
       "output_format": "markdown"
   }
   ```

3. Reiniciar el servidor

## 📡 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Usuario actual |
| GET | `/api/skills` | Catálogo de skills |
| GET | `/api/skills/{id}` | Detalle de skill |
| POST | `/api/skills/execute` | Ejecutar skill |
| GET | `/api/admin/users` | Listar usuarios (admin) |
| GET | `/api/admin/usage` | Estadísticas de uso (admin) |
| GET | `/api/health` | Estado del sistema |

## 🌐 Despliegue en Producción

### Opciones recomendadas

1. **Railway/Render/Fly.io** - PaaS simples
2. **AWS/GCP/Azure** - Mayor control
3. **VPS (DigitalOcean, Linode)** - Económico

### Checklist de producción

- [ ] Cambiar `SECRET_KEY` por una clave segura
- [ ] Usar HTTPS
- [ ] Configurar CORS con dominios específicos
- [ ] Usar PostgreSQL en lugar de SQLite
- [ ] Configurar límites de rate limiting
- [ ] Implementar backups de BD
- [ ] Monitoreo y alertas

## 📁 Estructura del Proyecto

```
skills-platform/
├── backend/
│   ├── main.py              # API principal
│   ├── config.py            # Configuración
│   ├── models.py            # Modelos de BD
│   ├── database.py          # Conexión BD
│   ├── auth.py              # Autenticación JWT
│   ├── skills_service.py    # Lógica de skills
│   ├── anthropic_service.py # Integración Anthropic
│   ├── create_admin.py      # Script inicial
│   ├── requirements.txt     # Dependencias
│   └── .env.example         # Config ejemplo
├── frontend/
│   └── index.html           # App completa
└── README.md
```

## 🛡️ Licencia

Uso privado - Dentons Paz Horowitz
