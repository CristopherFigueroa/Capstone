from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import re
import secrets
import smtplib

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from core.config import SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER
from core.database import get_db
from core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(tags=["Autenticación"])

# Almacén en memoria de códigos temporales: { email: (codigo, expira_utc) }
_codigos_recuperacion: dict[str, tuple[str, datetime]] = {}


class SolicitudRecuperacion(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)


class ConfirmarRecuperacion(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    codigo: str = Field(..., min_length=6, max_length=6)
    nueva_password: str = Field(..., min_length=9, max_length=128)


def _validar_password_segura(v: str) -> None:
    if (
        len(v) < 9
        or not re.search(r"[A-Z]", v)
        or not re.search(r"[a-z]", v)
        or not re.search(r"\d", v)
        or not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_\+=]", v)
    ):
        raise HTTPException(
            status_code=422,
            detail="La nueva contraseña no cumple los requisitos de seguridad.",
        )


def _enviar_correo_recuperacion(destinatario: str, nombre: str, codigo: str) -> bool:
    clave_limpia = SMTP_PASSWORD.replace(" ", "").strip()
    if not SMTP_USER or not clave_limpia:
        print(f"[RECUPERACION] Código para {destinatario}: {codigo}")
        return False

    msg = EmailMessage()
    msg["Subject"] = f"Código de recuperación Anglo Electric: {codigo}"
    msg["From"] = f"Anglo Electric <{SMTP_USER}>"
    msg["To"] = destinatario

    msg.set_content(
        f"Hola {nombre},\n\n"
        f"Recibimos una solicitud para restablecer tu contraseña en Anglo Electric.\n\n"
        f"Tu código de verificación es: {codigo}\n\n"
        f"Este código expira en 15 minutos. Si no solicitaste este cambio, ignora este mensaje.\n\n"
        f"Equipo Anglo Electric"
    )

    msg.add_alternative(
        f"""\
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; color: #0F2547;">
          <h2 style="margin-top: 0; color: #0F2547;">Recuperación de Contraseña</h2>
          <p style="color: #374151; font-size: 14px; line-height: 1.5;">
            Hola <strong>{nombre}</strong>, recibimos una solicitud para restablecer tu contraseña en <strong>Anglo Electric</strong>.
          </p>
          <div style="background-color: #0F2547; color: #00fc82; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 16px; border-radius: 12px; margin: 20px 0;">
            {codigo}
          </div>
          <p style="color: #6b7280; font-size: 12px; line-height: 1.5;">
            Este código es válido por <strong>15 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
          </p>
        </div>
        """,
        subtype="html",
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, clave_limpia)
            server.send_message(msg)
        return True
    except Exception as exc:
        print(f"[RECUPERACION] Falló SMTP ({exc}). Código para {destinatario}: {codigo}")
        return False


@router.post("/login/")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form_data.username
    password = form_data.password

    db_user = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == email)
        .first()
    )

    if not db_user or not verify_password(password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    access_token = create_access_token(
        data={"sub": db_user.email, "rol_id": db_user.rol_id}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/recuperar-password/solicitar")
def solicitar_recuperacion(
    datos: SolicitudRecuperacion,
    db: Session = Depends(get_db),
):
    email_limpio = datos.email.strip().lower()
    db_user = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == email_limpio)
        .first()
    )

    if db_user:
        codigo = f"{secrets.randbelow(900000) + 100000}"
        expira = datetime.now(timezone.utc) + timedelta(minutes=15)
        _codigos_recuperacion[email_limpio] = (codigo, expira)
        _enviar_correo_recuperacion(db_user.email, db_user.nombre, codigo)

    return {
        "detail": (
            "Si el correo está registrado, recibirás un mensaje con las "
            "instrucciones para restablecer tu contraseña."
        )
    }


@router.post("/recuperar-password/confirmar")
def confirmar_recuperacion(
    datos: ConfirmarRecuperacion,
    db: Session = Depends(get_db),
):
    email_limpio = datos.email.strip().lower()
    registro = _codigos_recuperacion.get(email_limpio)

    if not registro:
        raise HTTPException(
            status_code=400,
            detail="Solicita primero un código de recuperación para este correo.",
        )

    codigo_guardado, expira = registro
    if datetime.now(timezone.utc) > expira:
        _codigos_recuperacion.pop(email_limpio, None)
        raise HTTPException(
            status_code=400,
            detail="El código ha expirado. Solicita uno nuevo.",
        )

    if datos.codigo.strip() != codigo_guardado:
        raise HTTPException(
            status_code=400,
            detail="El código ingresado es incorrecto.",
        )

    _validar_password_segura(datos.nueva_password)

    db_user = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == email_limpio)
        .first()
    )
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado.",
        )

    db_user.password_hash = get_password_hash(datos.nueva_password)
    db.commit()
    _codigos_recuperacion.pop(email_limpio, None)

    return {
        "detail": "Contraseña actualizada con éxito. Ya puedes iniciar sesión."
    }