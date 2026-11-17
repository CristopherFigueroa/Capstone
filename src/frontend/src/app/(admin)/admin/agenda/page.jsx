"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiCalendar,
  FiSearch,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { agendaService } from "@/src/services/api";
import { mensajeError } from "@/src/utils/solicitudes";
import { sanitizeSearch } from "@/src/utils/validations";

const HORAS_LABORALES = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const normalizarFechaIso = (valor) => {
  if (!valor) return null;
  const texto = String(valor);
  const tieneZona = /Z|[+-]\d{2}:?\d{2}$/.test(texto);
  const normalizada =
    texto.includes("T") && !tieneZona ? `${texto}Z` : texto;
  return new Date(normalizada);
};

const formatearFechaHora = (valor) => {
  const fechaObj = normalizarFechaIso(valor);
  if (!fechaObj) return "";

  return fechaObj.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const obtenerFechaKey = (valor) => {
  const fechaObj = valor instanceof Date ? valor : normalizarFechaIso(valor);
  if (!fechaObj) return "";
  const y = fechaObj.getFullYear();
  const m = String(fechaObj.getMonth() + 1).padStart(2, "0");
  const d = String(fechaObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const obtenerHoraLocal = (valor) => {
  const fechaObj = normalizarFechaIso(valor);
  if (!fechaObj) return "";
  const h = String(fechaObj.getHours()).padStart(2, "0");
  const m = String(fechaObj.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

export default function AdminAgendaPage() {
  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [citas, setCitas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  // Estado del calendario (mes actual y día seleccionado)
  const [mesActual, setMesActual] = useState(
    () => new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  );
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() =>
    obtenerFechaKey(hoy)
  );
  const [horaSeleccionada, setHoraSeleccionada] = useState("");

  const [destinos, setDestinos] = useState({});
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeAlerta, setMensajeAlerta] = useState("");

  const cargarDatos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setActualizando(true);

    try {
      const [listaCitas, listaTurnos] = await Promise.all([
        agendaService.getAll(),
        agendaService.getDisponibles(),
      ]);
      if (Array.isArray(listaCitas)) setCitas(listaCitas);
      if (Array.isArray(listaTurnos)) setTurnos(listaTurnos);
    } catch (err) {
      console.error("Error cargando agenda:", err);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    Promise.all([agendaService.getAll(), agendaService.getDisponibles()])
      .then(([listaCitas, listaTurnos]) => {
        if (!activo) return;
        if (Array.isArray(listaCitas)) setCitas(listaCitas);
        if (Array.isArray(listaTurnos)) setTurnos(listaTurnos);
      })
      .catch((err) => {
        console.error("Error cargando agenda:", err);
      })
      .finally(() => {
        if (activo) {
          setCargando(false);
          setActualizando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, []);

  // Agrupar turnos publicados por fecha YYYY-MM-DD
  const turnosPorFecha = useMemo(() => {
    const mapa = {};
    for (const t of turnos) {
      const key = obtenerFechaKey(t.inicio);
      const hora = obtenerHoraLocal(t.inicio);
      if (!mapa[key]) mapa[key] = [];
      mapa[key].push({ ...t, hora });
    }
    return mapa;
  }, [turnos]);

  // Generar celdas del calendario mensual (Lunes a Domingo)
  const diasCalendario = useMemo(() => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();
    const primerDiaSemana = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Lunes
    const totalDiasMes = new Date(year, month + 1, 0).getDate();

    const celdas = [];
    for (let i = 0; i < primerDiaSemana; i++) {
      celdas.push(null);
    }
    for (let dia = 1; dia <= totalDiasMes; dia++) {
      const fecha = new Date(year, month, dia);
      celdas.push({
        dia,
        fecha,
        key: obtenerFechaKey(fecha),
        esPasado: fecha < hoy,
      });
    }
    return celdas;
  }, [mesActual, hoy]);

  const mostrarExito = (msg) => {
    setMensajeAlerta("");
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(""), 3500);
  };

  const mostrarError = (err) => {
    setMensajeExito("");
    const texto =
      err?.response || err?.request
        ? mensajeError(err)
        : err?.message || "No se pudo completar la operación.";
    setMensajeAlerta(texto);
  };

  const handlePublicarTurno = async () => {
    if (!fechaSeleccionada || !horaSeleccionada) return;
    setActualizando(true);
    try {
      const [y, m, d] = fechaSeleccionada.split("-").map(Number);
      const [hh, mm] = horaSeleccionada.split(":").map(Number);
      const fechaLocal = new Date(y, m - 1, d, hh, mm, 0, 0);

      await agendaService.crearTurno(fechaLocal.toISOString());
      setHoraSeleccionada("");
      await cargarDatos(true);
      mostrarExito(
        `Horario ${horaSeleccionada} del ${d}/${String(m).padStart(2, "0")}/${y} publicado correctamente.`
      );
    } catch (err) {
      mostrarError(err);
      setActualizando(false);
    }
  };

  const handleCancelarCita = async (citaId) => {
    setActualizando(true);
    try {
      await agendaService.cancelar(citaId);
      await cargarDatos(true);
      mostrarExito(`Visita VIS-${citaId} cancelada correctamente.`);
    } catch (err) {
      mostrarError(err);
      setActualizando(false);
    }
  };

  const handleReprogramarCita = async (citaId) => {
    const turnoId = destinos[citaId];
    if (!turnoId) return;
    setActualizando(true);
    try {
      await agendaService.reprogramar(citaId, turnoId);
      setDestinos((prev) => ({ ...prev, [citaId]: "" }));
      await cargarDatos(true);
      mostrarExito(`Visita VIS-${citaId} reprogramada correctamente.`);
    } catch (err) {
      mostrarError(err);
      setActualizando(false);
    }
  };

  const citasFiltradas = useMemo(() => {
    return citas.filter((c) => {
      const busquedaLimpia = filtroBusqueda.toLowerCase().trim();
      const coincide =
        !busquedaLimpia ||
        (c.comuna && c.comuna.toLowerCase().includes(busquedaLimpia)) ||
        (c.direccion && c.direccion.toLowerCase().includes(busquedaLimpia)) ||
        String(c.id).includes(busquedaLimpia) ||
        String(c.usuario_id).includes(busquedaLimpia);

      if (!coincide) return false;
      if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false;
      return true;
    });
  }, [citas, filtroBusqueda, filtroEstado]);

  const horasPublicadasDia = useMemo(() => {
    const lista = turnosPorFecha[fechaSeleccionada] || [];
    return new Set(lista.map((t) => t.hora));
  }, [turnosPorFecha, fechaSeleccionada]);

  const ahora = new Date();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F2547] tracking-tight">
            Gestión de Agenda y Visitas Técnicas
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Selecciona una fecha en el calendario y habilita los bloques de hora para visitas técnicas.
          </p>
        </div>

        <button
          onClick={() => cargarDatos(true)}
          disabled={actualizando}
          className="btn btn-sm w-full sm:w-auto bg-[#0F2547] hover:bg-[#1a3865] text-white rounded-xl border-none shadow-sm gap-2 justify-center"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${actualizando ? "animate-spin" : ""}`} />
          <span>{actualizando ? "Actualizando..." : "Sincronizar"}</span>
        </button>
      </div>

      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeAlerta && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <FiAlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{mensajeAlerta}</span>
        </div>
      )}

      {/* Sección 1: Calendario + Selector de Bloques de Hora */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base sm:text-lg font-black text-[#0F2547]">
            Publicar Horarios Disponibles
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Elige un día en el calendario de la izquierda y luego selecciona la hora a habilitar en el bloque derecho.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Bloque Izquierdo: Calendario Mensual */}
          <div className="lg:col-span-5 bg-gray-50/70 rounded-2xl border border-gray-200/80 p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() =>
                  setMesActual(
                    new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1)
                  )
                }
                className="p-1.5 rounded-lg hover:bg-gray-200/70 text-[#0F2547] transition-colors cursor-pointer"
                aria-label="Mes anterior"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm font-extrabold text-[#0F2547]">
                {NOMBRES_MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
              </span>

              <button
                type="button"
                onClick={() =>
                  setMesActual(
                    new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1)
                  )
                }
                className="p-1.5 rounded-lg hover:bg-gray-200/70 text-[#0F2547] transition-colors cursor-pointer"
                aria-label="Mes siguiente"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {DIAS_SEMANA.map((d) => (
                <span
                  key={d}
                  className="text-[10px] font-extrabold uppercase text-gray-400 py-1"
                >
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {diasCalendario.map((celda, idx) => {
                if (!celda) {
                  return <div key={`vacio-${idx}`} className="h-9" />;
                }

                const seleccionado = celda.key === fechaSeleccionada;
                const tieneTurnos = (turnosPorFecha[celda.key]?.length || 0) > 0;

                return (
                  <button
                    key={celda.key}
                    type="button"
                    disabled={celda.esPasado}
                    onClick={() => {
                      setFechaSeleccionada(celda.key);
                      setHoraSeleccionada("");
                    }}
                    className={`h-9 rounded-xl text-xs font-bold flex flex-col items-center justify-center relative transition-all ${
                      celda.esPasado
                        ? "text-gray-300 cursor-not-allowed"
                        : seleccionado
                          ? "bg-[#0F2547] text-white shadow-sm cursor-pointer"
                          : "text-[#0F2547] hover:bg-white hover:shadow-xs cursor-pointer"
                    }`}
                  >
                    <span>{celda.dia}</span>
                    {tieneTurnos && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                          seleccionado ? "bg-[#00fc82]" : "bg-[#00B4D8]"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloque Derecho: Selección de Hora */}
          <div className="lg:col-span-7 bg-gray-50/70 rounded-2xl border border-gray-200/80 p-5 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-extrabold text-[#0F2547] flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-[#00B4D8]" />
                  <span>
                    Bloques horarios para el{" "}
                    {fechaSeleccionada.split("-").reverse().join("-")}
                  </span>
                </h3>
                <span className="text-[11px] text-gray-500 font-medium">
                  Duración: 1 hora por bloque
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {HORAS_LABORALES.map((hora) => {
                  const yaPublicado = horasPublicadasDia.has(hora);
                  const [y, m, d] = fechaSeleccionada.split("-").map(Number);
                  const [hh] = hora.split(":").map(Number);
                  const fechaHoraBloque = new Date(y, m - 1, d, hh, 0, 0);
                  const yaPasoHora = fechaHoraBloque <= ahora;
                  const activa = horaSeleccionada === hora;

                  return (
                    <button
                      key={hora}
                      type="button"
                      disabled={yaPublicado || yaPasoHora || actualizando}
                      onClick={() =>
                        setHoraSeleccionada(activa ? "" : hora)
                      }
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center ${
                        yaPublicado
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default"
                          : yaPasoHora
                            ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                            : activa
                              ? "bg-[#00fc82] text-[#0F2547] border-[#00fc82] shadow-sm cursor-pointer"
                              : "bg-white text-[#0F2547] border-gray-200 hover:border-[#0F2547] cursor-pointer"
                      }`}
                    >
                      <span>{hora}</span>
                      {yaPublicado && (
                        <span className="text-[9px] uppercase tracking-wider font-extrabold mt-0.5">
                          Publicado
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-gray-200/70">
              <p className="text-xs text-gray-500">
                {horaSeleccionada
                  ? `Seleccionado: ${fechaSeleccionada.split("-").reverse().join("-")} a las ${horaSeleccionada} hrs.`
                  : "Haz clic en un bloque disponible para habilitarlo."}
              </p>

              <button
                type="button"
                disabled={!horaSeleccionada || actualizando}
                onClick={handlePublicarTurno}
                className="btn btn-sm bg-[#0F2547] hover:bg-[#1a3865] text-white rounded-xl border-none shadow-sm px-5 disabled:opacity-40"
              >
                {actualizando ? "Publicando..." : "Publicar horario"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 2: Tabla de Visitas Agendadas */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0F2547]">
              Visitas Técnicas Agendadas ({citas.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Revisa las solicitudes de visita a domicilio, reprograma horarios o cancela citas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(sanitizeSearch(e.target.value))}
                placeholder="Buscar por comuna, dirección o ID..."
                className="input input-sm w-full pl-9 bg-gray-50 border-gray-200 text-xs rounded-xl focus:border-[#0F2547]"
              />
            </div>

            {/* Filtro por estado */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="select select-sm bg-gray-50 border-gray-200 text-xs rounded-xl font-medium w-full sm:w-auto"
            >
              <option value="todos">Todos los Estados</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="table w-full min-w-187.5 text-left text-xs">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-600 uppercase text-[10px] tracking-wider font-extrabold">
                <th className="py-3 px-4">ID Visita</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Horario Programado</th>
                <th className="py-3 px-4">Dirección y Comuna</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-gray-600">
                    Cargando visitas técnicas desde el servidor...
                  </td>
                </tr>
              ) : citasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-600">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FiCalendar className="w-8 h-8 text-gray-300" />
                      <span className="font-bold text-gray-700 text-sm">
                        No hay visitas técnicas registradas
                      </span>
                      <span className="text-xs text-gray-400 max-w-sm">
                        Las visitas reservadas por los clientes desde la sección de Agenda aparecerán aquí.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                citasFiltradas.map((cita) => {
                  const fechaInicioCita = normalizarFechaIso(cita.inicio);
                  const esFutura = fechaInicioCita && fechaInicioCita > new Date();
                  const puedeModificar = cita.estado === "confirmada" && esFutura;

                  return (
                    <tr key={cita.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F2547]">
                        VIS-{cita.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-700">
                        Cliente #{cita.usuario_id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#0F2547] whitespace-nowrap">
                        {formatearFechaHora(cita.inicio)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        <strong className="text-[#0F2547]">{cita.comuna}:</strong> {cita.direccion}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap">
                        {cita.telefono}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider border ${
                            cita.estado === "confirmada"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-red-50 text-red-800 border-red-200"
                          }`}
                        >
                          {cita.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {puedeModificar ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={destinos[cita.id] || ""}
                              onChange={(e) =>
                                setDestinos((prev) => ({
                                  ...prev,
                                  [cita.id]: e.target.value,
                                }))
                              }
                              className="select select-xs bg-gray-50 border-gray-200 rounded-lg text-xs font-medium"
                            >
                              <option value="">Cambiar hora...</option>
                              {turnos.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {formatearFechaHora(t.inicio)}
                                </option>
                              ))}
                            </select>

                            {destinos[cita.id] && (
                              <button
                                type="button"
                                disabled={actualizando}
                                onClick={() => handleReprogramarCita(cita.id)}
                                className="btn btn-xs bg-[#0F2547] text-white hover:bg-[#1a3865] rounded-lg border-none"
                              >
                                Guardar
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={actualizando}
                              onClick={() => handleCancelarCita(cita.id)}
                              className="btn btn-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Sin acciones</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
