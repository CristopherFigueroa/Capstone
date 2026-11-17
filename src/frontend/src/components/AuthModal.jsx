"use client";

import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useAuthForm } from "@/src/hooks/useAuthForm";
import { authService } from "@/src/services/api";
import { mensajeError } from "@/src/utils/solicitudes";

export default function AuthModal({ isOpen, onClose }) {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [modoRecuperacion, setModoRecuperacion] = useState(false);
  const [emailRecuperacion, setEmailRecuperacion] = useState("");
  const [enviadoRecuperacion, setEnviadoRecuperacion] = useState(false);
  const [cargandoRecuperacion, setCargandoRecuperacion] = useState(false);
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState({ text: "", type: "" });

  const {
    isLogin,
    formData,
    errors,
    handleChange,
    handleBlur,
    getFieldClasses,
    handleSubmit,
    toggleView,
    statusMessage
  } = useAuthForm(onClose);

  if (!isOpen) return null;

  const abrirRecuperacion = () => {
    setEmailRecuperacion(formData.email || "");
    setEnviadoRecuperacion(false);
    setMensajeRecuperacion({ text: "", type: "" });
    setModoRecuperacion(true);
  };

  const cerrarRecuperacion = () => {
    setModoRecuperacion(false);
    setEnviadoRecuperacion(false);
    setMensajeRecuperacion({ text: "", type: "" });
  };

  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    const correo = emailRecuperacion.trim();
    if (!correo) {
      setMensajeRecuperacion({ text: "Ingresa tu correo electrónico.", type: "error" });
      return;
    }

    setCargandoRecuperacion(true);
    setMensajeRecuperacion({ text: "", type: "" });
    try {
      const res = await authService.solicitarRecuperacion(correo);
      setEnviadoRecuperacion(true);
      setMensajeRecuperacion({
        text:
          res?.detail ||
          "Si el correo está registrado, recibirás un mensaje con las instrucciones para restablecer tu contraseña.",
        type: "success",
      });
    } catch (err) {
      const detalle =
        err?.response || err?.request
          ? mensajeError(err)
          : err?.message || "No se pudo procesar la solicitud.";
      setMensajeRecuperacion({ text: detalle, type: "error" });
    } finally {
      setCargandoRecuperacion(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col">
        <div className="h-2 w-full bg-linear-to-r from-[#0F2547] to-[#00fc82]"></div>
        
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-3xl font-extrabold text-[#0F2547]">
              {modoRecuperacion
                ? "Recuperar Contraseña"
                : isLogin
                  ? "Iniciar Sesión"
                  : "Crear Cuenta"}
            </h2>
            <button 
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle text-gray-400 hover:text-gray-800"
            >
              ✕
            </button>
          </div>

          {modoRecuperacion ? (
            <form onSubmit={handleSolicitarCodigo} className="flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
              </p>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-bold text-gray-600">Correo Electrónico</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={enviadoRecuperacion}
                  value={emailRecuperacion}
                  onChange={(e) => setEmailRecuperacion(e.target.value)}
                  placeholder="tu@correo.com"
                  maxLength={120}
                  className="input bg-gray-50 text-black w-full border-gray-200 focus:border-[#00fc82] outline-none disabled:opacity-60"
                />
              </div>

              {!enviadoRecuperacion && (
                <button
                  type="submit"
                  disabled={cargandoRecuperacion}
                  className="btn w-full bg-[#0F2547] text-white hover:bg-[#00fc82] hover:text-[#0F2547] border-none font-bold mt-2 shadow-lg shadow-blue-900/20 disabled:opacity-50"
                >
                  {cargandoRecuperacion ? "Enviando..." : "Enviar correo de recuperación"}
                </button>
              )}

              {mensajeRecuperacion.text && (
                <div
                  className={`p-3 rounded-lg text-sm font-semibold text-center ${
                    mensajeRecuperacion.type === "success"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}
                >
                  {mensajeRecuperacion.text}
                </div>
              )}

              <button
                type="button"
                onClick={cerrarRecuperacion}
                className="text-sm font-bold text-[#0F2547] hover:text-[#00B4D8] mt-2 cursor-pointer"
              >
                ← Volver a Iniciar Sesión
              </button>
            </form>
          ) : (
          <>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {!isLogin && (
              <div className="form-control">
                <label className="label py-1"><span className="label-text font-bold text-gray-600">Nombre completo</span></label>
                <input 
                  type="text" 
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Ej. Juan Pérez" 
                  maxLength={60}
                  className={`input bg-gray-50 text-black w-full outline-none transition-colors ${getFieldClasses("nombre")}`}
                />
                {errors.nombre && <span className="text-red-500 text-xs mt-1 font-semibold">{errors.nombre}</span>}
              </div>
            )}

            <div className="form-control">
              <label className="label py-1"><span className="label-text font-bold text-gray-600">Correo Electrónico</span></label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="tu@correo.com" 
                maxLength={120}
                className={`input bg-gray-50 text-black w-full outline-none transition-colors ${getFieldClasses("email")}`}
              />
              {errors.email && <span className="text-red-500 text-xs mt-1 font-semibold">{errors.email}</span>}
            </div>

            {!isLogin && (
              <div className="form-control">
                <label className="label py-1"><span className="label-text font-bold text-gray-600">Teléfono (Opcional)</span></label>
                <input 
                  type="tel" 
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="+56 9 1234 5678" 
                  maxLength={20}
                  className={`input bg-gray-50 text-black w-full outline-none transition-colors ${getFieldClasses("telefono")}`}
                />
                {errors.telefono && <span className="text-red-500 text-xs mt-1 font-semibold">{errors.telefono}</span>}
              </div>
            )}

            <div className="form-control">
              <label className="label py-1"><span className="label-text font-bold text-gray-600">Contraseña</span></label>
              <div className="relative">
                <input 
                  type={mostrarPassword ? "text" : "password"} 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••" 
                  maxLength={128}
                  className={`input bg-gray-50 text-black w-full pr-11 outline-none transition-colors ${getFieldClasses("password")}`}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((prev) => !prev)}
                  aria-label={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0F2547] transition-colors cursor-pointer p-1"
                >
                  {mostrarPassword ? (
                    <FiEyeOff className="w-5 h-5" />
                  ) : (
                    <FiEye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && <span className="text-red-500 text-xs mt-1 font-semibold">{errors.password}</span>}
              
              {!isLogin && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-700 font-bold mb-1">
                    Requisitos de seguridad de la contraseña:
                  </p>
                  <ul className="text-[11px] text-gray-500 list-disc list-inside space-y-0.5 ml-1">
                    <li>Extensión mínima de <strong>9 caracteres</strong>.</li>
                    <li>Debe contener al menos una <strong>letra mayúscula</strong> y una <strong>minúscula</strong>.</li>
                    <li>Debe contener al menos un <strong>número</strong>.</li>
                    <li>Debe contener al menos un <strong>símbolo o carácter especial</strong>.</li>
                  </ul>
                </div>
              )}
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={abrirRecuperacion}
                  className="text-sm text-gray-500 hover:text-[#00fc82] transition-colors cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <button type="submit" className="btn w-full bg-[#0F2547] text-white hover:bg-[#00fc82] hover:text-[#0F2547] border-none font-bold mt-4 shadow-lg shadow-blue-900/20">
              {isLogin ? "Entrar" : "Registrarse"}
            </button>

            {statusMessage.text && (
              <div className={`p-3 rounded-lg text-sm font-semibold text-center mt-2 ${
                statusMessage.type === "success" 
                  ? "bg-green-100 text-green-800 border border-green-200" 
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}>
                {statusMessage.text}
              </div>
            )}
          </form>

          <div className="divider text-sm text-gray-400 mt-6 mb-6">O</div>

          <div className="text-center text-sm font-medium text-gray-600">
            {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button 
              type="button" 
              onClick={toggleView} 
              className="text-[#00fc82] font-bold hover:underline cursor-pointer"
            >
              {isLogin ? "Regístrate aquí" : "Inicia sesión"}
            </button>
          </div>
          </>
          )}
        </div>
      </div>
    </>
  );
}
