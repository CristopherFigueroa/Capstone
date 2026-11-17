"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FiTrendingUp,
  FiDollarSign,
  FiPercent,
  FiCpu,
  FiBarChart2,
  FiRefreshCw,
  FiSearch,
  FiSliders,
  FiPackage,
  FiCheckCircle,
  FiShoppingBag,
  FiFileText,
  FiAlertTriangle,
} from "react-icons/fi";
import { formatearMoneda } from "@/src/utils/formatters";
import { sanitizeSearch } from "@/src/utils/validations";
import { mensajeError } from "@/src/utils/solicitudes";
import {
  orderService,
  productService,
  categoryService,
  cotizacionService,
} from "@/src/services/api";

const TRANSICIONES_PEDIDO = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["enviado", "cancelado"],
  enviado: ["entregado"],
  entregado: [],
  cancelado: [],
};

export default function AdminDashboard() {
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorBackend, setErrorBackend] = useState(null);
  const [mensajeExito, setMensajeExito] = useState("");

  const [metricas, setMetricas] = useState({
    total_ingresos: 0,
    costos_registrados: null,
    margen_bruto: null,
    porcentaje_margen: null,
    total_pedidos: 0,
    pedidos_entregados: 0,
    total_cotizaciones: 0,
    cotizaciones_convertidas: 0,
    ticket_promedio: 0,
    tasa_conversion: 0,
    valor_inventario: 0,
    total_unidades_stock: 0,
    total_productos: 0,
    total_categorias: 0,
  });

  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);

  // Filtros de tabla de pedidos
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Simulador de margen
  const [simPrecioVenta, setSimPrecioVenta] = useState("3500000");
  const [simCostoEquipos, setSimCostoEquipos] = useState("2300000");
  const [simCostoInstalacion, setSimCostoInstalacion] = useState("400000");

  const handleSimInput = (setter) => (e) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    setter(rawVal);
  };

  const refrescarDatos = async () => {
    setActualizando(true);
    setErrorBackend(null);
    try {
      const [
        resStats,
        resPedidos,
        resProductos,
        resCategorias,
        resCotizaciones,
      ] = await Promise.allSettled([
        orderService.getStats(),
        orderService.getAll(),
        productService.getAll(),
        categoryService.getAll(),
        cotizacionService.getAll(),
      ]);

      if (resStats.status === "fulfilled" && resStats.value)
        setMetricas(resStats.value);
      if (resPedidos.status === "fulfilled" && Array.isArray(resPedidos.value))
        setPedidos(resPedidos.value);
      if (
        resProductos.status === "fulfilled" &&
        Array.isArray(resProductos.value)
      )
        setProductos(resProductos.value);
      if (
        resCategorias.status === "fulfilled" &&
        Array.isArray(resCategorias.value)
      )
        setCategorias(resCategorias.value);
      if (
        resCotizaciones.status === "fulfilled" &&
        Array.isArray(resCotizaciones.value)
      )
        setCotizaciones(resCotizaciones.value);
    } catch (err) {
      console.error("Error refrescando métricas:", err);
      setErrorBackend("No fue posible sincronizar los datos con el servidor.");
    } finally {
      setActualizando(false);
    }
  };

  useEffect(() => {
    let activo = true;

    async function cargarInicial() {
      try {
        const [
          resStats,
          resPedidos,
          resProductos,
          resCategorias,
          resCotizaciones,
        ] = await Promise.allSettled([
          orderService.getStats(),
          orderService.getAll(),
          productService.getAll(),
          categoryService.getAll(),
          cotizacionService.getAll(),
        ]);

        if (!activo) return;
        if (resStats.status === "fulfilled" && resStats.value)
          setMetricas(resStats.value);
        if (
          resPedidos.status === "fulfilled" &&
          Array.isArray(resPedidos.value)
        )
          setPedidos(resPedidos.value);
        if (
          resProductos.status === "fulfilled" &&
          Array.isArray(resProductos.value)
        )
          setProductos(resProductos.value);
        if (
          resCategorias.status === "fulfilled" &&
          Array.isArray(resCategorias.value)
        )
          setCategorias(resCategorias.value);
        if (
          resCotizaciones.status === "fulfilled" &&
          Array.isArray(resCotizaciones.value)
        )
          setCotizaciones(resCotizaciones.value);
      } catch (err) {
        if (!activo) return;
        console.error("Error en carga inicial:", err);
        setErrorBackend("No fue posible conectar con el servidor.");
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarInicial();

    return () => {
      activo = false;
    };
  }, []);

  const handleCambiarEstadoPedido = async (pedidoId, nuevoEstado) => {
    if (!nuevoEstado) return;
    setActualizando(true);
    setErrorBackend(null);
    try {
      await orderService.updateEstado(pedidoId, nuevoEstado);
      setMensajeExito(
        `Estado del pedido #${pedidoId} actualizado a "${nuevoEstado}".`
      );
      setTimeout(() => setMensajeExito(""), 3500);
      await refrescarDatos();
    } catch (err) {
      const detalle =
        err?.response || err?.request
          ? mensajeError(err)
          : err?.message || "No se pudo actualizar el estado del pedido.";
      setErrorBackend(detalle);
      setActualizando(false);
    }
  };

  // Resumen financiero consolidado (con respaldo estimado si aún no hay pedidos entregados o costos manuales)
  const resumenFinanciero = useMemo(() => {
    const pedidosActivos = pedidos.filter((p) => p.estado !== "cancelado");
    const ventasTotalesPedidos = pedidosActivos.reduce(
      (acc, p) => acc + (Number(p.monto_total) || 0),
      0
    );

    const ingresosEntregados = Number(metricas.total_ingresos) || 0;
    const baseIngresos =
      ingresosEntregados > 0 ? ingresosEntregados : ventasTotalesPedidos;
    const usaPipeline = ingresosEntregados === 0 && ventasTotalesPedidos > 0;

    const costos =
      metricas.costos_registrados != null && ingresosEntregados > 0
        ? Number(metricas.costos_registrados)
        : Math.round(baseIngresos * 0.68);

    const margen =
      metricas.margen_bruto != null && ingresosEntregados > 0
        ? Number(metricas.margen_bruto)
        : baseIngresos - costos;

    const porcentajeMargen =
      baseIngresos > 0 ? Number(((margen / baseIngresos) * 100).toFixed(1)) : 0;

    const porcentajeCosto =
      baseIngresos > 0 ? Number(((costos / baseIngresos) * 100).toFixed(1)) : 0;

    return {
      baseIngresos,
      usaPipeline,
      costos,
      margen,
      porcentajeMargen,
      porcentajeCosto,
      pedidosActivosCount: pedidosActivos.length,
    };
  }, [metricas, pedidos]);

  // Cálculo del simulador
  const calculoSimulador = useMemo(() => {
    const pVenta = Number(simPrecioVenta) || 0;
    const cEquipos = Number(simCostoEquipos) || 0;
    const cInstalacion = Number(simCostoInstalacion) || 0;
    const costoTotal = cEquipos + cInstalacion;
    const gananciaNeta = pVenta - costoTotal;
    const porcentaje = pVenta > 0 ? (gananciaNeta / pVenta) * 100 : 0;
    return {
      costoTotal,
      gananciaNeta,
      porcentaje: Number(porcentaje.toFixed(2)),
    };
  }, [simPrecioVenta, simCostoEquipos, simCostoInstalacion]);

  // Filtrado de pedidos
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const busquedaLimpia = filtroBusqueda.toLowerCase().trim();
      const coincide =
        !busquedaLimpia ||
        (p.cliente && p.cliente.toLowerCase().includes(busquedaLimpia)) ||
        (p.id && String(p.id).toLowerCase().includes(busquedaLimpia)) ||
        (p.email && p.email.toLowerCase().includes(busquedaLimpia));

      if (!coincide) return false;
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      return true;
    });
  }, [pedidos, filtroBusqueda, filtroEstado]);

  // Opción 1: Distribución de Categorías con porcentajes para gráfico de barras
  const distribucionCategorias = useMemo(() => {
    if (!categorias.length || !productos.length) return [];

    const totalValor =
      productos.reduce(
        (acc, curr) => acc + (curr.precio || 0) * (curr.stock || 0),
        0
      ) || 1;

    return categorias
      .map((cat) => {
        const prodsEnCat = productos.filter(
          (prod) => prod.categoria_id === cat.id
        );
        const stockTotal = prodsEnCat.reduce(
          (acc, curr) => acc + (curr.stock || 0),
          0
        );
        const valorInventario = prodsEnCat.reduce(
          (acc, curr) => acc + (curr.precio || 0) * (curr.stock || 0),
          0
        );
        const porcentajeValor = Math.round(
          (valorInventario / totalValor) * 100
        );

        return {
          id: cat.id,
          nombre: cat.nombre,
          cantidadProductos: prodsEnCat.length,
          stockTotal,
          valorInventario,
          porcentajeValor,
        };
      })
      .sort((a, b) => b.valorInventario - a.valorInventario);
  }, [categorias, productos]);

  // Productos con stock crítico (<= 3 unidades)
  const productosStockCritico = useMemo(() => {
    return productos
      .filter((p) => (p.stock || 0) <= 3)
      .sort((a, b) => (a.stock || 0) - (b.stock || 0));
  }, [productos]);

  // Opción 2A: Estado de Cotizaciones para Gráfico de Dona
  const resumenEstadosCotizaciones = useMemo(() => {
    const conteo = {
      pendiente: 0,
      contactado: 0,
      aprobada: 0,
      rechazada: 0,
    };
    for (const c of cotizaciones) {
      const est = c.estado || "pendiente";
      if (conteo[est] !== undefined) {
        conteo[est] += 1;
      } else {
        conteo.pendiente += 1;
      }
    }
    const total = cotizaciones.length || 1;
    return [
      {
        key: "pendiente",
        label: "Pendientes",
        cantidad: conteo.pendiente,
        porcentaje: Math.round((conteo.pendiente / total) * 100),
        colorHex: "#f59e0b",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      },
      {
        key: "contactado",
        label: "Contactadas",
        cantidad: conteo.contactado,
        porcentaje: Math.round((conteo.contactado / total) * 100),
        colorHex: "#00B4D8",
        badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
      },
      {
        key: "aprobada",
        label: "Aprobadas",
        cantidad: conteo.aprobada,
        porcentaje: Math.round((conteo.aprobada / total) * 100),
        colorHex: "#10b981",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      },
      {
        key: "rechazada",
        label: "Rechazadas",
        cantidad: conteo.rechazada,
        porcentaje: Math.round((conteo.rechazada / total) * 100),
        colorHex: "#ef4444",
        badgeClass: "bg-red-50 text-red-800 border-red-200",
      },
    ];
  }, [cotizaciones]);

  // Opción 2B: Demanda de Cotizaciones por Comuna
  const demandaPorComuna = useMemo(() => {
    const mapa = {};
    for (const c of cotizaciones) {
      const comuna = (c.comuna || "Sin especificar").trim();
      if (!mapa[comuna]) {
        mapa[comuna] = { comuna, cantidad: 0, sumaKwh: 0 };
      }
      mapa[comuna].cantidad += 1;
      mapa[comuna].sumaKwh += Number(c.consumo_kwh_mensual) || 0;
    }
    const lista = Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad);
    const maxCantidad = lista[0]?.cantidad || 1;

    return lista.map((item) => ({
      ...item,
      promedioKwh: Math.round(item.sumaKwh / item.cantidad),
      porcentajeBarra: Math.round((item.cantidad / maxCantidad) * 100),
    }));
  }, [cotizaciones]);

  // Resumen de Pedidos por Estado
  const resumenEstadosPedidos = useMemo(() => {
    const conteo = {
      pendiente: 0,
      confirmado: 0,
      enviado: 0,
      entregado: 0,
      cancelado: 0,
    };
    for (const p of pedidos) {
      const est = p.estado || "pendiente";
      if (conteo[est] !== undefined) conteo[est] += 1;
    }
    return [
      { key: "pendiente", label: "Pendientes", count: conteo.pendiente, color: "bg-amber-400" },
      { key: "confirmado", label: "Confirmados", count: conteo.confirmado, color: "bg-sky-500" },
      { key: "enviado", label: "Enviados", count: conteo.enviado, color: "bg-indigo-500" },
      { key: "entregado", label: "Entregados", count: conteo.entregado, color: "bg-emerald-500" },
      { key: "cancelado", label: "Cancelados", count: conteo.cancelado, color: "bg-red-400" },
    ];
  }, [pedidos]);

  // Segmentos SVG para el gráfico de dona de cotizaciones
  const segmentosDona = useMemo(() => {
    const total = cotizaciones.length;
    if (!total) return [];
    const circunferencia = 2 * Math.PI * 40; // r=40 => ~251.32
    let acumulado = 0;

    return resumenEstadosCotizaciones
      .filter((item) => item.cantidad > 0)
      .map((item) => {
        const fraccion = item.cantidad / total;
        const longitud = fraccion * circunferencia;
        const offset = -acumulado;
        acumulado += longitud;
        return {
          ...item,
          strokeDasharray: `${longitud} ${circunferencia}`,
          strokeDashoffset: offset,
        };
      });
  }, [cotizaciones.length, resumenEstadosCotizaciones]);

  const cotizacionesPendientesCount = useMemo(
    () =>
      cotizaciones.filter(
        (c) => c.estado === "pendiente" || c.estado === "contactado"
      ).length,
    [cotizaciones]
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12 w-full">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0F2547] tracking-tight">
            Panel Analítico y Rendimiento de Ventas
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Monitoreo en tiempo real de facturación, márgenes, demanda por comuna y estado de inventario.
          </p>
        </div>

        <button
          onClick={refrescarDatos}
          disabled={actualizando}
          className="btn btn-sm w-full sm:w-auto bg-[#0F2547] hover:bg-[#1a3865] text-white rounded-xl border-none shadow-sm gap-2 justify-center"
        >
          <FiRefreshCw
            className={`w-3.5 h-3.5 ${actualizando ? "animate-spin" : ""}`}
          />
          <span>{actualizando ? "Actualizando..." : "Sincronizar"}</span>
        </button>
      </div>

      {errorBackend && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs font-semibold">
          {errorBackend}
        </div>
      )}

      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* TARJETAS KPI DE RENDIMIENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {/* KPI 1: Facturación */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-600">
              {resumenFinanciero.usaPipeline
                ? "Ventas en Curso (Pipeline)"
                : "Facturación Total"}
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FiDollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F2547] mt-2 sm:mt-3 wrap-break-word">
            {cargando ? "---" : formatearMoneda(resumenFinanciero.baseIngresos)}
          </div>
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <span>
              {metricas.pedidos_entregados > 0
                ? `${metricas.pedidos_entregados} entregado(s) de ${pedidos.length} pedido(s)`
                : `${resumenFinanciero.pedidosActivosCount} pedido(s) activo(s)`}
            </span>
          </div>
        </div>

        {/* KPI 2: Costos de Equipos */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-600">
              Costos de Equipos (COGS)
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FiBarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F2547] mt-2 sm:mt-3 wrap-break-word">
            {cargando ? "---" : formatearMoneda(resumenFinanciero.costos)}
          </div>
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <span>
              {metricas.costos_registrados != null
                ? "Costo registrado en catálogo"
                : "Costo estimado (68% sobre venta)"}
            </span>
          </div>
        </div>

        {/* KPI 3: Margen Neto */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-[#00fc82]"></div>
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-600">
              Margen Bruto Calculado
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#00fc82]/10 text-emerald-700 flex items-center justify-center shrink-0">
              <FiPercent className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F2547] mt-2 sm:mt-3 wrap-break-word">
            {cargando ? "---" : formatearMoneda(resumenFinanciero.margen)}
          </div>
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
            <FiTrendingUp className="w-3.5 h-3.5" />
            <span>{resumenFinanciero.porcentajeMargen}% de rentabilidad</span>
          </div>
        </div>

        {/* KPI 4: Conversión y Cotizaciones */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-600">
              Cotizaciones vs Ventas
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <FiFileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F2547] mt-2 sm:mt-3 wrap-break-word">
            {cargando
              ? "---"
              : `${
                  cotizaciones.length > 0
                    ? Math.round(
                        ((resumenFinanciero.pedidosActivosCount || 0) /
                          cotizaciones.length) *
                          100
                      )
                    : 0
                }%`}
          </div>
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <span>{cotizaciones.length} cotizaciones registradas</span>
          </div>
        </div>
      </div>

      {/* OPCIÓN 3: GRÁFICO FINANCIERO (INGRESOS VS COSTOS VS MARGEN + PIPELINE DE PEDIDOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-7 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex justify-between items-start gap-2 mb-4">
              <div>
                <h3 className="font-extrabold text-[#0F2547] text-sm sm:text-base">
                  Estructura Financiera: Ingresos vs. Costos y Margen
                </h3>
                <p className="text-xs text-gray-500">
                  Proporción del ingreso destinada a cubrir costos de equipos frente a la ganancia bruta
                </p>
              </div>
              <span className="text-xs font-bold text-[#0F2547] bg-slate-100 px-3 py-1 rounded-full shrink-0">
                100% = {formatearMoneda(resumenFinanciero.baseIngresos)}
              </span>
            </div>

            {/* Barra apilada visual */}
            <div className="w-full h-8 bg-gray-100 rounded-xl overflow-hidden flex border border-gray-200/70">
              {resumenFinanciero.baseIngresos > 0 ? (
                <>
                  <div
                    style={{ width: `${resumenFinanciero.porcentajeCosto}%` }}
                    className="bg-[#0F2547] h-full flex items-center justify-center text-[11px] font-bold text-white transition-all duration-500"
                    title={`Costos: ${formatearMoneda(resumenFinanciero.costos)}`}
                  >
                    {resumenFinanciero.porcentajeCosto >= 15 &&
                      `Costos ${resumenFinanciero.porcentajeCosto}%`}
                  </div>
                  <div
                    style={{ width: `${resumenFinanciero.porcentajeMargen}%` }}
                    className="bg-[#00fc82] h-full flex items-center justify-center text-[11px] font-extrabold text-[#0F2547] transition-all duration-500"
                    title={`Margen: ${formatearMoneda(resumenFinanciero.margen)}`}
                  >
                    {resumenFinanciero.porcentajeMargen >= 12 &&
                      `Margen ${resumenFinanciero.porcentajeMargen}%`}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                  Sin ventas registradas aún
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0F2547]"></span>
                <span>Costo Equipos</span>
              </div>
              <p className="text-sm font-black text-[#0F2547] mt-1">
                {formatearMoneda(resumenFinanciero.costos)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00fc82]"></span>
                <span>Ganancia Bruta</span>
              </div>
              <p className="text-sm font-black text-emerald-800 mt-1">
                {formatearMoneda(resumenFinanciero.margen)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-gray-600 block">
                Ticket Promedio
              </span>
              <p className="text-sm font-black text-[#0F2547] mt-1">
                {formatearMoneda(
                  resumenFinanciero.pedidosActivosCount > 0
                    ? Math.round(
                        resumenFinanciero.baseIngresos /
                          resumenFinanciero.pedidosActivosCount
                      )
                    : 0
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Estado de Pedidos (Barras de progreso) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-[#0F2547] text-sm sm:text-base">
                  Flujo Operativo de Pedidos
                </h3>
                <p className="text-xs text-gray-500">
                  Distribución de órdenes según etapa logística
                </p>
              </div>
              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {pedidos.length} total
              </span>
            </div>

            <div className="space-y-3">
              {resumenEstadosPedidos.map((item) => {
                const pct =
                  pedidos.length > 0
                    ? Math.round((item.count / pedidos.length) * 100)
                    : 0;
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#0F2547]">{item.label}</span>
                      <span className="text-gray-500">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* OPCIÓN 2: GRÁFICO DE DONA (COTIZACIONES) + GRÁFICO DE BARRAS (DEMANDA POR COMUNA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Gráfico de Anillo (Dona) de Cotizaciones */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
          <div className="mb-4">
            <h3 className="font-extrabold text-[#0F2547] text-sm sm:text-base">
              Estado Comercial de Cotizaciones
            </h3>
            <p className="text-xs text-gray-500">
              Proporción de solicitudes según etapa de seguimiento
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            {/* SVG Donut Chart */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full -rotate-90 transform"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                />
                {segmentosDona.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={seg.colorHex}
                    strokeWidth="12"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-[#0F2547]">
                  {cotizaciones.length}
                </span>
                <span className="text-[10px] font-bold uppercase text-gray-400">
                  Cotizaciones
                </span>
              </div>
            </div>

            {/* Leyenda */}
            <div className="flex-1 w-full space-y-2.5">
              {resumenEstadosCotizaciones.map((est) => (
                <div
                  key={est.key}
                  className="flex items-center justify-between text-xs p-2 rounded-xl bg-gray-50/80 border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: est.colorHex }}
                    />
                    <span className="font-bold text-[#0F2547]">
                      {est.label}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-600">
                    {est.cantidad} ({est.porcentaje}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico de Barras: Demanda Solar por Comuna */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start gap-2 mb-4">
            <div>
              <h3 className="font-extrabold text-[#0F2547] text-sm sm:text-base">
                Demanda Solar y Consumo Promedio por Comuna
              </h3>
              <p className="text-xs text-gray-500">
                Zonas geográficas con mayor volumen de cotizaciones y su requerimiento energético medio
              </p>
            </div>
          </div>

          {demandaPorComuna.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-500">
              Aún no hay cotizaciones registradas por comuna.
            </div>
          ) : (
            <div className="space-y-3.5 mt-2">
              {demandaPorComuna.slice(0, 5).map((item) => (
                <div key={item.comuna} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-extrabold text-[#0F2547]">
                      {item.comuna}
                    </span>
                    <span className="text-gray-500 font-medium">
                      <strong className="text-[#0F2547]">
                        {item.cantidad}
                      </strong>{" "}
                      cotización(es) · Promedio:{" "}
                      <strong className="text-[#00B4D8]">
                        {item.promedioKwh} kWh/mes
                      </strong>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.porcentajeBarra}%` }}
                      className="h-full bg-linear-to-r from-[#09203F] to-[#00B4D8] rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OPCIÓN 1: INVENTARIO FÍSICO + GRÁFICO DE BARRAS DE CAPITAL POR CATEGORÍA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Inventario Físico + Alerta de Stock Crítico */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <FiPackage className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0F2547] text-sm">
                  Valor de Inventario Físico
                </h3>
                <p className="text-[11px] text-gray-500">
                  Capital acumulado en bodega
                </p>
              </div>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-[#0F2547] mt-2">
              {cargando ? "---" : formatearMoneda(metricas.valor_inventario)}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-gray-600 block">
                  Total Unidades
                </span>
                <span className="text-base sm:text-lg font-black text-[#0F2547]">
                  {metricas.total_unidades_stock} un.
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-gray-600 block">
                  Productos Activos
                </span>
                <span className="text-base sm:text-lg font-black text-[#0F2547]">
                  {metricas.total_productos}
                </span>
              </div>
            </div>
          </div>

          {/* Alerta de stock crítico */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs font-bold text-[#0F2547] mb-2">
              <span className="flex items-center gap-1.5">
                <FiAlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Stock Crítico (≤ 3 un.)</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                {productosStockCritico.length} prod.
              </span>
            </div>

            {productosStockCritico.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl font-medium">
                Todo el catálogo cuenta con stock saludable.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {productosStockCritico.slice(0, 4).map((prod) => (
                  <div
                    key={prod.id}
                    className="flex justify-between items-center text-xs bg-amber-50/60 border border-amber-200/70 px-2.5 py-1.5 rounded-lg"
                  >
                    <span className="font-semibold text-[#0F2547] truncate pr-2">
                      {prod.nombre}
                    </span>
                    <span className="font-extrabold text-amber-800 shrink-0">
                      {prod.stock} un.
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Barras de Capital por Categoría */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="font-extrabold text-[#0F2547] text-sm sm:text-base">
                Distribución de Capital y Stock por Categoría
              </h3>
              <p className="text-xs text-gray-500">
                Participación de cada línea de equipos sobre el valor total del inventario
              </p>
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {categorias.length} Categorías
            </span>
          </div>

          {distribucionCategorias.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-600">
              Cargando información de categorías...
            </div>
          ) : (
            <div className="space-y-4 mt-3">
              {distribucionCategorias.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-[#0F2547]">
                        {cat.nombre}
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        {cat.cantidadProductos} productos · {cat.stockTotal} unidades en stock
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-[#0F2547] block">
                        {formatearMoneda(cat.valorInventario)}
                      </span>
                      <span className="text-[10px] font-bold text-[#00B4D8]">
                        {cat.porcentajeValor}% del capital
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-gray-200/70 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(cat.porcentajeValor, 4)}%` }}
                      className="h-full bg-[#0F2547] rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OPCIÓN 4: DIAGNÓSTICO AUTOMÁTICO REAL DEL NEGOCIO */}
      <div className="bg-linear-to-br from-[#0F2547] to-[#1a3865] text-white p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/10 text-[#00fc82] shrink-0">
              <FiCpu className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-white">
                  Diagnóstico Comercial y Operativo en Vivo
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#00fc82] text-[#0F2547]">
                  Activo
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1">
                Indicadores clave generados automáticamente a partir de las cotizaciones, inventario y pedidos actuales.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Insight 1: Oportunidad en Cotizaciones */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00fc82]">
              1. Seguimiento Comercial
            </span>
            <h4 className="text-sm font-extrabold text-white">
              {cotizacionesPendientesCount} cotización(es) por cerrar
            </h4>
            <p className="text-xs text-white/80 leading-relaxed">
              Existen {cotizacionesPendientesCount} solicitudes en estado pendiente o contactado. Gestionarlas desde la pestaña Cotizaciones aumentará la tasa de conversión actual.
            </p>
          </div>

          {/* Insight 2: Salud de Stock */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00fc82]">
              2. Abastecimiento de Bodega
            </span>
            <h4 className="text-sm font-extrabold text-white">
              {productosStockCritico.length === 0
                ? "Stock óptimo en todas las líneas"
                : `${productosStockCritico.length} equipo(s) requieren reposición`}
            </h4>
            <p className="text-xs text-white/80 leading-relaxed">
              {productosStockCritico.length === 0
                ? "Todos los productos superan el umbral mínimo de 3 unidades disponibles."
                : `Priorizar reposición de "${productosStockCritico[0]?.nombre}" (${productosStockCritico[0]?.stock} un. restantes) para no detener el cotizador KNN.`}
            </p>
          </div>

          {/* Insight 3: Zona Líder */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00fc82]">
              3. Foco Geográfico y Capital
            </span>
            <h4 className="text-sm font-extrabold text-white">
              {demandaPorComuna[0]
                ? `Mayor demanda en ${demandaPorComuna[0].comuna}`
                : "Sin tendencia comunal aún"}
            </h4>
            <p className="text-xs text-white/80 leading-relaxed">
              {demandaPorComuna[0]
                ? `${demandaPorComuna[0].comuna} lidera con ${demandaPorComuna[0].cantidad} cotización(es) y un consumo medio de ${demandaPorComuna[0].promedioKwh} kWh/mes.`
                : "A medida que los clientes coticen kits solares, se identificará aquí la comuna de mayor demanda."}
            </p>
          </div>
        </div>
      </div>

      {/* TABLA DE PEDIDOS Y VENTAS CON GESTIÓN DE ESTADO */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0F2547]">
              Registro de Ventas y Pedidos ({pedidos.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Historial de órdenes registradas y control de estado logístico.
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
                placeholder="Buscar cliente, orden..."
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
          <table className="table w-full min-w-137.5 text-left text-xs">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-600 uppercase text-[10px] tracking-wider font-extrabold">
                <th className="py-3 px-4">Orden</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-right">Monto Total</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-xs text-gray-600"
                  >
                    Consultando pedidos en la base de datos...
                  </td>
                </tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 sm:py-12 text-center text-gray-600"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 px-4">
                      <FiShoppingBag className="w-8 h-8 text-gray-300" />
                      <span className="font-bold text-gray-600 text-sm">
                        No hay pedidos que coincidan con el filtro
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
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F2547]">
                        #{p.id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-800">
                        {p.cliente}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        <div>{p.email}</div>
                        <div className="text-[10px] text-gray-400">
                          {p.telefono}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        {p.fecha ? p.fecha.slice(0, 10) : "-"}
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
                              handleCambiarEstadoPedido(p.id, e.target.value)
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
                            className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}
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

      {/* SIMULADOR RÁPIDO DE MÁRGENES */}
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl sm:rounded-2xl shrink-0">
            <FiSliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-[#0F2547] text-sm sm:text-base">
              Simulador Automatizado de Márgenes
            </h3>
            <p className="text-xs text-gray-500">
              Ingresa los valores numéricos directamente con tu teclado para calcular al instante la rentabilidad.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
              Precio de Venta (CLP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={simPrecioVenta}
              onChange={handleSimInput(setSimPrecioVenta)}
              placeholder="0"
              className="input input-sm sm:input-md bg-gray-50 border-gray-200 text-gray-900 font-bold w-full rounded-xl focus:border-[#0F2547] text-sm"
            />
            <span className="text-[11px] text-gray-400 mt-1 block font-medium">
              {simPrecioVenta ? formatearMoneda(Number(simPrecioVenta)) : "$0 CLP"}
            </span>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
              Costo de Equipos (CLP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={simCostoEquipos}
              onChange={handleSimInput(setSimCostoEquipos)}
              placeholder="0"
              className="input input-sm sm:input-md bg-gray-50 border-gray-200 text-gray-900 font-bold w-full rounded-xl focus:border-[#0F2547] text-sm"
            />
            <span className="text-[11px] text-gray-400 mt-1 block font-medium">
              {simCostoEquipos ? formatearMoneda(Number(simCostoEquipos)) : "$0 CLP"}
            </span>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
              Instalación / Mano de Obra (CLP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={simCostoInstalacion}
              onChange={handleSimInput(setSimCostoInstalacion)}
              placeholder="0"
              className="input input-sm sm:input-md bg-gray-50 border-gray-200 text-gray-900 font-bold w-full rounded-xl focus:border-[#0F2547] text-sm"
            />
            <span className="text-[11px] text-gray-400 mt-1 block font-medium">
              {simCostoInstalacion
                ? formatearMoneda(Number(simCostoInstalacion))
                : "$0 CLP"}
            </span>
          </div>

          <div className="bg-emerald-50/70 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-200 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Ganancia Neta Calculada
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
              {formatearMoneda(calculoSimulador.gananciaNeta)}
            </div>
            <div className="text-xs font-bold text-[#0F2547] mt-0.5">
              Margen: {calculoSimulador.porcentaje}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
