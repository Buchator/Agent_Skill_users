"""
Script para crear el usuario administrador inicial
Ejecutar: python create_admin.py
"""
import asyncio
from sqlalchemy import select
from database import init_db, AsyncSessionLocal
from models import User
from auth import get_password_hash

async def create_admin_user():
    """Crea el usuario administrador inicial"""
    await init_db()
    
    async with AsyncSessionLocal() as session:
        # Verificar si ya existe un admin
        result = await session.execute(
            select(User).where(User.username == "admin")
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print("⚠️  El usuario admin ya existe")
            return
        
        # Crear usuario admin
        admin = User(
            email="admin@dph.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),  # CAMBIAR EN PRODUCCIÓN
            full_name="Administrador",
            organization="Dentons Paz Horowitz",
            is_active=True,
            is_admin=True
        )
        
        session.add(admin)
        await session.commit()
        
        print("✅ Usuario admin creado:")
        print("   Username: admin")
        print("   Password: admin123")
        print("   ⚠️  CAMBIAR LA CONTRASEÑA EN PRODUCCIÓN!")

if __name__ == "__main__":
    asyncio.run(create_admin_user())
