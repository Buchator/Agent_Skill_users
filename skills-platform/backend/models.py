"""
Skills Platform - Modelos de Base de Datos
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    """Modelo de Usuario"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    organization = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    usage_logs = relationship("UsageLog", back_populates="user")
    skill_access = relationship("UserSkillAccess", back_populates="user")


class Skill(Base):
    """Modelo de Skill (metadatos públicos)"""
    __tablename__ = "skills"
    
    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(String(100), unique=True, index=True, nullable=False)  # ej: "experto-pdp"
    name = Column(String(255), nullable=False)  # Nombre público
    description = Column(Text)  # Descripción pública
    category = Column(String(100))  # Categoría: "Protección de Datos", "Corporativo", etc.
    icon = Column(String(50), default="📋")  # Emoji o icono
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    
    # Campos para la interfaz (qué inputs necesita el skill)
    input_schema = Column(JSON)  # Define los campos que el usuario debe completar
    output_format = Column(String(50), default="text")  # text, markdown, docx, pdf
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    usage_logs = relationship("UsageLog", back_populates="skill")
    user_access = relationship("UserSkillAccess", back_populates="skill")


class UserSkillAccess(Base):
    """Control de acceso de usuarios a skills específicos"""
    __tablename__ = "user_skill_access"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    granted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # None = sin expiración
    usage_limit = Column(Integer, nullable=True)  # None = sin límite
    usage_count = Column(Integer, default=0)
    
    # Relaciones
    user = relationship("User", back_populates="skill_access")
    skill = relationship("Skill", back_populates="user_access")


class UsageLog(Base):
    """Log de uso de skills"""
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    input_summary = Column(Text)  # Resumen del input (sin datos sensibles)
    tokens_used = Column(Integer, default=0)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    # Relaciones
    user = relationship("User", back_populates="usage_logs")
    skill = relationship("Skill", back_populates="usage_logs")
