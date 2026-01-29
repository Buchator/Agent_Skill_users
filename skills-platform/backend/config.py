"""
Skills Platform - Configuración
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # API
    APP_NAME: str = "Skills Platform - DPH"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Seguridad
    SECRET_KEY: str = "tu-clave-secreta-super-segura-cambiar-en-produccion-123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas
    
    # Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    
    # Base de datos
    DATABASE_URL: str = "sqlite+aiosqlite:///./skills_platform.db"
    
    # Skills directory (donde están almacenados los skills)
    SKILLS_DIRECTORY: str = "/mnt/skills/user"
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
