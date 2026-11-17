"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiShoppingBag,
  FiSearch,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { orderService } from "@/src/services/api";
import { formatearMoneda } from "@/src/utils/formatters";
import { sanitizeSearch } from "@/src/utils/validations";
import { mensajeError } from "@/src/utils/solicitudes";

const TRANSICIONES_PEDIDO = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["enviado", "cancelado"],
  enviado: ["entregado"],
  entregado: [],
  cancelado: [],
};

const formatearFechaHora = (valor) => {
  if (!valor) return "-";
  const texto = String(valor);
  const tieneZona = /Z|[+-]\d{2}:?\d{2}$/.test(texto);
  const normalizada =
    texto.includes("T") && !tieneZona ? `${texto}Z` : texto;

  return new Date(normalizada).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeAlerta, setMensajeAlerta] = useState("");

  const cargarPedidos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setActualizando(true);

    try {
      const data = await orderService.getAll();
      if (Array.isArray(data)) {
        setPedidos(data);
      }
    } catch (err) {
      console.error("Error cargando pedidos:", err);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    orderService
      .getAll()
      .then((data) => {
        if (activo && Array.isArray(data)) {
          setPedidos(data);
        }
      })
      .catch((err) => {
        console.error("Error cargando pedidos:", err);
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

  const handleCambiarEstado = async (id, nuevoEstado) => {
    if (!nuevoEstado) return;
    setActualizando(true);
    setMensajeAlerta("");
    try {
      await orderService.updateEstado(id, nuevoEstado);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      );
      setMensajeExito(
        `Estado de la orden #${id} actualizado a "${nuevoEstado}".`
      );
      setTimeout(() => setMensajeExito(""), 3500);
    } catch (err) {
      const detalle =
        err?.response || err?.request
          ? mensajeError(err)
          : err?.message || "No se pudo actualizar el estado del pedido.";
      setMensajeAlerta(detalle);
    } finally {
      setActualizando(false);
    }
  };

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const busquedaLimpia = filtroBusqueda.toLowerCase().trim();
      const coincide =
        !busquedaLimpia ||
        (p.cliente && p.cliente.toLowerCase().includes(busquedaLimpia)) ||
        (p.email && p.email.toLowerCase().includes(busquedaLimpia)) ||
        (p.entrega?.comuna &&
          p.entrega.comuna.toLowerCase().includes(busquedaLimpia)) ||
        String(p.id).includes(busquedaLimpia);

      if (!coincide) return false;
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      return true;
    });
  }, [pedidos, filtroBusqueda, filtroEstado]);

  const resumen = useMemo(() => {
    const activos = pedidos.filter((p) => p.estado !== "cancelado");
    const porDespachar = pedidos.filter(
      (p) => p.estado === "pendiente" || p.estado === "confirmado"
    ).length;
    const entregados = pedidos.filter((p) => p.estado === "entregado").length;
    const montoTotalActivo = activos.reduce(
      (acc, p) => acc + (Number(p.monto_total) || 0),
      0
    );
    return {
      total: pedidos.length,
      porDespachar,
      entregados,
      montoTotalActivo,
    };
  }, [pedidos]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F2547] tracking-tight">
            Gestión de Ventas y Pedidos
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Administra las órdenes de compra, revisa los datos de despacho y actualiza el estado logístico de cada venta.
          </p>
        </div>

        <button
          onClick={() => cargarPedidos(true)}
          disabled={actualizando}
          className="btn btn-sm w-full sm:w-auto bg-[#0F2547] hover:bg-[#1a3865] text-white rounded-xl border-none shadow-sm gap-2 justify-center"
        >
          <FiRefreshCw
            className={`w-3.5 h-3.5 ${actualizando ? "animate-spin" : ""}`}
          />
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

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
            Total Órdenes
          </span>
          <span className="text-2xl font-black text-[#0F2547] mt-1 block">
            {cargando ? "---" : resumen.total}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
            Pendientes / Por Despachar
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {cargando ? "---" : resumen.porDespachar}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
            Pedidos Entregados
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {cargando ? "---" : resumen.entregados}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
            Volumen de Ventas Activas
          </span>
          <span className="text-2xl font-black text-[#0F2547] mt-1 block">
            {cargando ? "---" : formatearMoneda(resumen.montoTotalActivo)}
          </span>
        </div>
      </div>

      {/* Tabla con Buscador y Filtros */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0F2547]">
              Órdenes Registradas ({pedidos.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Selecciona el estado de cada orden para avanzar de pendiente a confirmado, enviado o entregado.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filtroBusqueda}
                onChange={(e) =>
                  setFiltroBusqueda(sanitizeSearch(e.target.value))
                }
                placeholder="Buscar por cliente, comuna o ID..."
                className="input input-sm w-full pl-9 bg-gray-50 border-gray-200 text-xs rounded-xl focus:border-[#0F2547]"
              />
            </div>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="select select-sm bg-gray-50 border-gray-200 text-xs rounded-xl font-medium w-full sm:w-auto"
            >
              <option value="todos">Todos los Estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="enviado">Enviado</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="table w-full min-w-205 text-left text-xs">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-600 uppercase text-[10px] tracking-wider font-extrabold">
                <th className="py-3 px-4">ID Orden</th>
                <th className="py-3 px-4">Cliente y Contacto</th>
                <th className="py-3 px-4">Dirección de Despacho</th>
                <th className="py-3 px-4">Equipos Solicitados</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-right">Monto Total</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-xs text-gray-600"
                  >
                    Cargando pedidos desde el servidor...
                  </td>
                </tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-600">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FiShoppingBag className="w-8 h-8 text-gray-300" />
                      <span className="font-bold text-gray-700 text-sm">
                        No hay pedidos registrados
                      </span>
                      <span className="text-xs text-gray-400 max-w-sm">
                        Las ventas generadas desde el carrito y checkout aparecerán aquí automáticamente.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((p) => {
                  const opcionesSiguientes =
                    TRANSICIONES_PEDIDO[p.estado] || [];
                  const badgeColor =
                    p.estado === "entregado"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : p.estado === "enviado"
                        ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                        : p.estado === "confirmado"
                          ? "bg-sky-50 text-sky-800 border-sky-200"
                          : p.estado === "cancelado"
                            ? "bg-red-50 text-red-800 border-red-200"
                            : "bg-amber-50 text-amber-800 border-amber-200";

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/60 transition-colors align-top"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F2547] whitespace-nowrap">
                        ORD-{p.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-800">
                          {p.entrega?.nombre || p.cliente || "Cliente"}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {p.email}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {p.entrega?.telefono || p.telefono}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        {p.entrega ? (
                          <div>
                            <span className="font-bold text-[#0F2547] block">
                              {p.entrega.comuna}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {p.entrega.direccion}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No registrada</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        <ul className="space-y-1">
                          {(p.items || []).map((item, idx) => (
                            <li
                              key={`${p.id}-${item.producto_id ?? "item"}-${idx}`}
                              className="text-[11px] leading-snug"
                            >
                              <strong className="text-[#0F2547]">
                                {item.cantidad}x
                              </strong>{" "}
                              {item.nombre || item.producto_nombre || "Equipo solar"}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        {formatearFechaHora(p.fecha)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-[#0F2547] whitespace-nowrap">
                        {formatearMoneda(p.monto_total)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {opcionesSiguientes.length > 0 ? (
                          <select
                            disabled={actualizando}
                            value={p.estado}
                            onChange={(e) =>
                              handleCambiarEstado(p.id, e.target.value)
                            }
                            className={`select select-xs rounded-lg font-bold text-[10px] uppercase tracking-wider border ${badgeColor}`}
                          >
                            <option value={p.estado}>{p.estado}</option>
                            {opcionesSiguientes.map((sig) => (
                              <option key={sig} value={sig}>
                                Pasar a: {sig}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider border ${badgeColor}`}
                          >
                            {p.estado}
                          </span>
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
