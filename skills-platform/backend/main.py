"""
Skills Platform - API Principal
"""
from datetime import timedelta
from typing import Dict, List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from database import init_db, get_db
from models import User, Skill, UsageLog, UserSkillAccess
from auth import (
    Token, UserCreate, UserResponse,
    authenticate_user, create_user, create_access_token,
    get_current_user, get_current_admin_user,
    get_user_by_username, get_user_by_email
)
from skills_service import skill_service, SKILLS_CATALOG
from anthropic_service import anthropic_service
from document_service import document_service
from docx_export_service import docx_export_service

# Crear aplicación FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Plataforma para ejecutar skills de Claude de forma encapsulada"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== EVENTOS ==============

@app.on_event("startup")
async def startup_event():
    """Inicializa la base de datos al arrancar"""
    await init_db()
    print(f"✅ {settings.APP_NAME} iniciado")
    print(f"📚 Skills disponibles: {len(SKILLS_CATALOG)}")


# ============== SCHEMAS ==============

class SkillExecuteRequest(BaseModel):
    """Request para ejecutar un skill"""
    skill_id: str
    inputs: Dict[str, str]
    document_text: Optional[str] = None  # Texto extraído de documentos cargados


class SkillExecuteResponse(BaseModel):
    """Response de ejecución de skill"""
    success: bool
    output: Optional[str] = None
    error: Optional[str] = None
    tokens_used: Optional[int] = None


class SkillMetadata(BaseModel):
    """Metadatos públicos de un skill"""
    skill_id: str
    name: str
    description: str
    category: str
    icon: str
    input_schema: dict
    output_format: str


# ============== ENDPOINTS DE AUTENTICACIÓN ==============

@app.post("/api/auth/register", response_model=UserResponse, tags=["Autenticación"])
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Registra un nuevo usuario"""
    # Verificar si el usuario ya existe
    existing_user = await get_user_by_username(db, user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está registrado"
        )
    
    existing_email = await get_user_by_email(db, user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    user = await create_user(db, user_data)
    return user


@app.post("/api/auth/login", response_model=Token, tags=["Autenticación"])
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Inicia sesión y obtiene token JWT"""
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin
        }
    }


@app.get("/api/auth/me", response_model=UserResponse, tags=["Autenticación"])
async def get_me(current_user: User = Depends(get_current_user)):
    """Obtiene información del usuario actual"""
    return current_user


# ============== ENDPOINTS DE SKILLS ==============

@app.get("/api/skills", response_model=List[SkillMetadata], tags=["Skills"])
async def get_skills_catalog(
    current_user: User = Depends(get_current_user)
):
    """Obtiene el catálogo de skills disponibles"""
    catalog = skill_service.get_catalog()
    return catalog


@app.get("/api/skills/{skill_id}", response_model=SkillMetadata, tags=["Skills"])
async def get_skill_detail(
    skill_id: str,
    current_user: User = Depends(get_current_user)
):
    """Obtiene los detalles de un skill específico"""
    metadata = skill_service.get_skill_metadata(skill_id)
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill '{skill_id}' no encontrado"
        )
    return metadata


@app.post("/api/skills/execute", response_model=SkillExecuteResponse, tags=["Skills"])
async def execute_skill(
    request: SkillExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ejecuta un skill con los inputs proporcionados.
    El contenido del skill (SKILL.md) NUNCA se expone al usuario.
    """
    # Verificar que el skill existe
    metadata = skill_service.get_skill_metadata(request.skill_id)
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill '{request.skill_id}' no encontrado"
        )
    
    # Ejecutar el skill
    result = await anthropic_service.execute_skill(
        skill_id=request.skill_id,
        user_inputs=request.inputs,
        document_text=request.document_text
    )
    
    # Registrar el uso
    log = UsageLog(
        user_id=current_user.id,
        skill_id=1,  # TODO: mapear al ID real del skill
        input_summary=f"Skill: {request.skill_id}",
        tokens_used=result.get("tokens_used", 0),
        success=result["success"],
        error_message=result.get("error")
    )
    db.add(log)
    
    return SkillExecuteResponse(
        success=result["success"],
        output=result.get("output"),
        error=result.get("error"),
        tokens_used=result.get("tokens_used")
    )


# ============== ENDPOINTS DE DOCUMENTOS ==============

@app.post("/api/documents/upload", tags=["Documentos"])
async def upload_documents(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Carga uno o más documentos y extrae su contenido de texto.
    Formatos soportados: PDF, DOCX, TXT, MD.
    El texto extraído se retorna para ser usado como contexto en skills.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se proporcionaron archivos"
        )

    result = await document_service.save_multiple_uploads(files, current_user.id)

    if not result["success"]:
        errors = [r["error"] for r in result["results"] if not r["success"]]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar documentos: {'; '.join(errors)}"
        )

    return {
        "success": True,
        "total_files": result["total_files"],
        "successful": result["successful"],
        "failed": result["failed"],
        "combined_text": result["combined_text"],
        "files": [
            {
                "name": r.get("original_name", ""),
                "size": r.get("size", 0),
                "text_length": r.get("text_length", 0),
                "success": r["success"],
                "error": r.get("error")
            }
            for r in result["results"]
        ]
    }


@app.post("/api/documents/export-docx", tags=["Documentos"])
async def export_to_docx(
    content: str = Form(...),
    title: str = Form("Documento generado"),
    current_user: User = Depends(get_current_user)
):
    """
    Genera un documento Word (.docx) a partir del contenido proporcionado.
    El contenido puede incluir formato markdown básico.
    """
    try:
        docx_bytes = docx_export_service.generate_docx(content, title)

        # Crear nombre de archivo seguro
        safe_title = "".join(c for c in title if c.isalnum() or c in " -_")[:50]
        filename = f"{safe_title or 'documento'}.docx"

        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar el documento: {str(e)}"
        )


# ============== ENDPOINTS DE ADMINISTRACIÓN ==============

@app.get("/api/admin/users", tags=["Administración"])
async def list_users(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista todos los usuarios (solo admin)"""
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]


@app.get("/api/admin/usage", tags=["Administración"])
async def get_usage_stats(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene estadísticas de uso (solo admin)"""
    result = await db.execute(select(UsageLog))
    logs = result.scalars().all()
    
    total_requests = len(logs)
    total_tokens = sum(log.tokens_used or 0 for log in logs)
    successful = sum(1 for log in logs if log.success)
    
    return {
        "total_requests": total_requests,
        "successful_requests": successful,
        "failed_requests": total_requests - successful,
        "total_tokens_used": total_tokens
    }


# ============== HEALTH CHECK ==============

@app.get("/api/health", tags=["Sistema"])
async def health_check():
    """Verifica el estado del sistema"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "anthropic_configured": anthropic_service.is_configured(),
        "skills_available": len(SKILLS_CATALOG)
    }


# ============== ROOT ==============

@app.get("/", tags=["Sistema"])
async def root():
    """Endpoint raíz"""
    return {
        "message": f"Bienvenido a {settings.APP_NAME}",
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
