"use client";

import { useRef, useState } from "react";
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
        "¡Hola! 😊 Bienvenido a Anglo Electric. " +
        "¿En qué puedo ayudarte con energía solar?",
      actions: [],
    },
  ]);

  const bloqueo = useRef(false);

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
    <div className="fixed bottom-5 right-5 z-50 text-gray-900">
      {abierto && (
        <section
          id="chat-asistente-solar"
          aria-label="Chat con el asistente solar"
          className="w-[min(360px,90vw)] bg-white border rounded-xl shadow-xl mb-3 overflow-hidden"
        >
          <header className="bg-slate-800 text-white p-4 flex items-center justify-between gap-3">
            <strong>Asistente solar ☀️</strong>

            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar el chat"
              className="rounded px-2 py-1 hover:bg-slate-700"
            >
              Cerrar
            </button>
          </header>

          <div
            className="max-h-80 overflow-y-auto p-4 space-y-4"
            aria-live="polite"
            aria-busy={ocupado}
          >
            {mensajes.map((mensaje, indice) => (
              <article
                key={indice}
                className={
                  mensaje.role === "user"
                    ? "bg-green-50 p-3 rounded-lg"
                    : "bg-gray-100 p-3 rounded-lg"
                }
              >
                <p className="text-xs font-semibold mb-1 text-gray-500">
                  {mensaje.role === "user"
                    ? "Tú"
                    : "Asistente solar"}
                </p>

                <p className="whitespace-pre-wrap break-words text-sm">
                  {mensaje.content}
                </p>

                {mensaje.actions.length > 0 && (
                  <div className="flex flex-col gap-2 mt-3">
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
                          className="underline text-blue-800 text-sm"
                          onClick={() => setAbierto(false)}
                        >
                          {accion.label}
                        </Link>
                      ))}
                  </div>
                )}
              </article>
            ))}

            {ocupado && (
              <p
                role="status"
                className="text-sm text-gray-500"
              >
                Consultando…
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={enviar}
            className="p-3 flex gap-2 border-t"
          >
            <input
              type="text"
              aria-label="Mensaje para el asistente"
              required
              maxLength={2000}
              value={texto}
              disabled={ocupado}
              onChange={e => setTexto(e.target.value)}
              className="border rounded-lg p-2 min-w-0 flex-1 bg-white text-gray-900 disabled:bg-gray-100"
              placeholder="Escribe tu consulta"
              autoComplete="off"
            />

            <button
              type="submit"
              disabled={ocupado || !texto.trim()}
              className="bg-slate-800 text-white rounded-lg px-3 disabled:opacity-50"
            >
              {ocupado ? "…" : "Enviar"}
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setAbierto(valor => !valor)}
        aria-expanded={abierto}
        aria-controls="chat-asistente-solar"
        className="bg-slate-800 text-white rounded-full px-5 py-3 shadow-lg hover:bg-slate-700"
      >
        {abierto ? "Cerrar asistente" : "Asistente solar ☀️"}
      </button>
    </div>
  );
}