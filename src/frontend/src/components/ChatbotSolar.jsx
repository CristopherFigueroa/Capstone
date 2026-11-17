"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import api from "@/src/services/api";
import { mensajeError } from "@/src/utils/solicitudes";

export default function ChatbotSolar() {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  const [mensajes, setMensajes] = useState([
    {
      role: "assistant",
      content:
        "¡Hola! Bienvenido a Anglo Electric. " +
        "¿En qué puedo ayudarte con energía solar?",
      actions: [],
    },
  ]);

  const bloqueo = useRef(false);
  const contenedorMensajesRef = useRef(null);

  useEffect(() => {
    if (abierto && contenedorMensajesRef.current) {
      contenedorMensajesRef.current.scrollTo({
        top: contenedorMensajesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [mensajes, ocupado, abierto]);

  async function enviar(e) {
    e.preventDefault();

    const consulta = texto.trim();

    if (!consulta || bloqueo.current) {
      return;
    }

    bloqueo.current = true;
    setOcupado(true);
    setError("");
    setTexto("");

    const anteriores = mensajes.slice(-20).map(mensaje => ({
      role: mensaje.role,
      content: mensaje.content,
    }));

    setMensajes(actuales => [
      ...actuales,
      {
        role: "user",
        content: consulta,
        actions: [],
      },
    ]);

    try {
      const { data } = await api.post(
        "/ia/chat",
        {
          message: consulta,
          history: anteriores,
        },
        {
          timeout: 60000,
        }
      );

      if (
        typeof data?.reply !== "string" ||
        !data.reply.trim()
      ) {
        throw new Error(
          "El asistente no devolvió una respuesta. Intenta nuevamente."
        );
      }

      setMensajes(actuales => [
        ...actuales,
        {
          role: "assistant",
          content: data.reply,
          actions: Array.isArray(data.actions)
            ? data.actions
            : [],
        },
      ]);
    } catch (e) {
      const detalle =
        e.response || e.request
          ? mensajeError(e)
          : e.message;

      setError(
        typeof detalle === "string" && detalle
          ? detalle
          : "No se pudo conectar con el asistente."
      );

      setTexto(consulta);

      setMensajes(actuales => {
        const ultimo = actuales[actuales.length - 1];

        if (
          ultimo?.role === "user" &&
          ultimo.content === consulta
        ) {
          return actuales.slice(0, -1);
        }

        return actuales;
      });
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {abierto && (
        <section
          id="chat-asistente-solar"
          aria-label="Chat con el asistente solar"
          className="w-95 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl border border-[#00B4D8]/30 rounded-3xl shadow-[0_20px_50px_rgba(9,32,63,0.35)] mb-4 overflow-hidden flex flex-col transition-all duration-300"
        >
          {/* Cabecera con el degradado de Anglo Electric */}
          <header className="bg-linear-to-r from-[#09203F] to-[#00B4D8] text-white px-5 py-4 flex items-center justify-between gap-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00fc82] text-[#0F2547] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,252,130,0.4)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                  />
                </svg>
              </div>
              <div>
                <strong className="block text-base font-extrabold tracking-tight text-white leading-tight">
                  Asistente Solar IA
                </strong>
                <span className="flex items-center gap-1.5 text-xs text-gray-200 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#00fc82] animate-pulse"></span>
                  Anglo Electric en línea
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar el chat"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#00fc82] text-white hover:text-[#0F2547] flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </header>

          {/* Historial de mensajes */}
          <div
            ref={contenedorMensajesRef}
            className="max-h-96 min-h-64 overflow-y-auto p-4 space-y-3.5 bg-slate-50/80"
            aria-live="polite"
            aria-busy={ocupado}
          >
            {mensajes.map((mensaje, indice) => {
              const esUsuario = mensaje.role === "user";
              return (
                <article
                  key={indice}
                  className={`flex flex-col ${
                    esUsuario ? "items-end" : "items-start"
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider mb-1 px-1 text-gray-400">
                    {esUsuario ? "Tú" : "Asistente Solar"}
                  </span>

                  <div
                    className={
                      esUsuario
                        ? "max-w-[85%] bg-linear-to-br from-[#09203F] to-[#00B4D8] text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-md"
                        : "max-w-[88%] bg-white border border-gray-200/80 text-[#0F2547] px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs"
                    }
                  >
                    <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
                      {mensaje.content}
                    </p>

                    {mensaje.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-gray-100">
                        {mensaje.actions
                          .filter(
                            accion =>
                              accion &&
                              typeof accion.label === "string" &&
                              typeof accion.url === "string" &&
                              accion.url.startsWith("/") &&
                              !accion.url.startsWith("//") &&
                              !accion.url.includes("\\")
                          )
                          .map((accion, index) => (
                            <Link
                              key={`${accion.url}-${index}`}
                              href={accion.url}
                              onClick={() => setAbierto(false)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#0F2547] text-white hover:bg-[#00fc82] hover:text-[#0F2547] px-3.5 py-2 rounded-xl transition-colors shadow-xs"
                            >
                              <span>{accion.label}</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-3.5 h-3.5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                                />
                              </svg>
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {ocupado && (
              <div
                role="status"
                className="inline-flex items-center gap-2 bg-white border border-gray-200/80 text-[#0F2547] px-4 py-2.5 rounded-2xl rounded-tl-xs shadow-xs text-xs font-semibold"
              >
                <span className="w-2 h-2 rounded-full bg-[#00B4D8] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#00fc82] animate-bounce delay-150"></span>
                <span className="w-2 h-2 rounded-full bg-[#09203F] animate-bounce delay-300"></span>
                <span className="ml-1 text-gray-500">Consultando…</span>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-2xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700"
              >
                {error}
              </p>
            )}
          </div>

          {/* Barra de envío */}
          <form
            onSubmit={enviar}
            className="p-3.5 bg-white flex items-center gap-2 border-t border-gray-100"
          >
            <input
              type="text"
              aria-label="Mensaje para el asistente"
              required
              maxLength={2000}
              value={texto}
              disabled={ocupado}
              onChange={e => setTexto(e.target.value)}
              className="border border-gray-200 focus:border-[#00B4D8] focus:outline-none rounded-xl px-3.5 py-2.5 text-sm min-w-0 flex-1 bg-slate-50/70 text-[#0F2547] placeholder:text-gray-400 disabled:bg-gray-100 transition-colors"
              placeholder="Escribe tu consulta solar..."
              autoComplete="off"
            />

            <button
              type="submit"
              disabled={ocupado || !texto.trim()}
              aria-label="Enviar mensaje"
              className="bg-[#0F2547] text-white hover:bg-[#00fc82] hover:text-[#0F2547] rounded-xl px-4 py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-sm"
            >
              <span>Enviar</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </form>
        </section>
      )}

      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setAbierto(valor => !valor)}
        aria-expanded={abierto}
        aria-controls="chat-asistente-solar"
        className="group bg-linear-to-r from-[#09203F] to-[#00B4D8] text-white rounded-full pl-3 pr-5 py-2.5 shadow-[0_8px_25px_rgba(9,32,63,0.4)] hover:shadow-[0_0_25px_rgba(0,252,130,0.5)] border border-white/15 hover:border-[#00fc82] flex items-center gap-3 transition-all duration-300 cursor-pointer"
      >
        <span className="w-9 h-9 rounded-full bg-[#00fc82] text-[#0F2547] flex items-center justify-center shadow-[0_0_12px_rgba(0,252,130,0.4)] group-hover:scale-105 transition-transform">
          {abierto ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
              />
            </svg>
          )}
        </span>
        <span className="font-bold text-sm tracking-wide">
          {abierto ? "Ocultar asistente" : "Asistente Solar"}
        </span>
      </button>
    </div>
  );
}