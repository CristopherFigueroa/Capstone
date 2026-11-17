from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
from core.database import get_db
from core.security import (
    get_current_user,
    get_password_hash,
)

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"],
)


@router.post("/", response_model=schemas.UsuarioResponse)
def crear_usuario(
    usuario: schemas.UsuarioCreate,
    db: Session = Depends(get_db),
):
    email_limpio = usuario.email.strip().lower()

    existente = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == email_limpio)
        .first()
    )

    if existente:
        raise HTTPException(
            409,
            "El correo ya está registrado.",
        )

    # Asegurar que exista el rol Cliente (id=2)
    if db.get(models.Rol, 2) is None:
        db.add(models.Rol(id=2, nombre="Cliente"))
        db.commit()

    nuevo = models.Usuario(
        nombre=usuario.nombre.strip(),
        email=email_limpio,
        password_hash=get_password_hash(usuario.password),
        telefono=usuario.telefono.strip() if usuario.telefono else None,
        rol_id=2,
    )

    try:
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
    except IntegrityError as error:
        db.rollback()
        err_msg = str(error.orig) if getattr(error, "orig", None) else str(error)
        # Si la secuencia de IDs en PostgreSQL quedó desincronizada tras un seed manual
        if "usuarios_pkey" in err_msg:
            db.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('usuarios', 'id'), "
                    "COALESCE((SELECT MAX(id) FROM usuarios), 1), true)"
                )
            )
            db.commit()
            nuevo = models.Usuario(
                nombre=usuario.nombre.strip(),
                email=email_limpio,
                password_hash=get_password_hash(usuario.password),
                telefono=usuario.telefono.strip() if usuario.telefono else None,
                rol_id=2,
            )
            db.add(nuevo)
            db.commit()
            db.refresh(nuevo)
            return nuevo

        raise HTTPException(
            409,
            "El correo ya está registrado.",
        ) from error

    return nuevo


@router.get("/me", response_model=schemas.UsuarioResponse)
def obtener_perfil(
    usuario=Depends(get_current_user),
):
    return usuario


@router.put("/me", response_model=schemas.UsuarioResponse)
def actualizar_perfil(
    datos: schemas.UsuarioUpdate,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if datos.nombre is not None:
        usuario.nombre = datos.nombre.strip()

    if datos.telefono is not None:
        usuario.telefono = datos.telefono.strip()

    db.commit()
    db.refresh(usuario)

    return usuario