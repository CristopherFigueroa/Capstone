"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import api from "@/src/services/api";
import { useCart } from "@/src/context/CartContext";
import { nuevaClave, mensajeError } from "@/src/utils/solicitudes";
import BotonPago from "./BotonPago";

const COMUNAS_COBERTURA = [
  "Valparaíso",
  "Viña del Mar",
  "Concón",
  "Quilpué",
  "Villa Alemana",
];

const DIAS_SEMANA_AGENDA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const NOMBRES_MESES_AGENDA = [
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

const normalizarFecha = valor => {
  if (!valor) return null;
  const texto = String(valor);
  const tieneZona = /Z|[+-]\d{2}:?\d{2}$/.test(texto);
  const normalizada =
    texto.includes("T") && !tieneZona ? `${texto}Z` : texto;
  return new Date(normalizada);
};

const obtenerFechaKey = valor => {
  const d = valor instanceof Date ? valor : normalizarFecha(valor);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const obtenerHoraTexto = valor => {
  const d = normalizarFecha(valor);
  if (!d) return "";
  return d.toLocaleTimeString("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const pesos = valor =>
  valor == null
    ? "Sin costos completos"
    : new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
      }).format(valor);

const fecha = valor => {
  if (!valor) return "";
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

const boton =
  "rounded-xl px-5 py-2.5 bg-[#0F2547] text-white font-bold hover:bg-[#00fc82] hover:text-[#0F2547] transition-all shadow-sm hover:shadow-[0_0_20px_rgba(0,252,130,0.4)] disabled:opacity-40 cursor-pointer";

const campoBase =
  "mt-1.5 border border-gray-200 focus:border-[#00B4D8] focus:outline-none rounded-xl px-3.5 py-2.5 w-full bg-slate-50/70 placeholder:text-gray-400 placeholder:font-normal transition-colors";

const campo = `${campoBase} text-[#0F2547] font-semibold`;

const siguientes = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["enviado", "cancelado"],
  enviado: ["entregado"],
};

export default function PanelGestionSolar({ vista = "cotizador" }) {
  const { carrito, agregarAlCarrito } = useCart();

  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const [form, setForm] = useState({
    consumo_kwh_mensual: "",
    comuna: "",
    objetivo_sistema: "",
    tipo_red: "",
    hsp: "",
    presupuesto_max_clp: "",
    superficie_disponible_m2: "",
  });

  const [resultado, setResultado] = useState(null);
  const [guardada, setGuardada] = useState(null);
  const [accionResultado, setAccionResultado] = useState(null);
  const [cotizaciones, setCotizaciones] = useState([]);

  const [turnos, setTurnos] = useState([]);
  const [citas, setCitas] = useState([]);
  const [destinos, setDestinos] = useState({});
  const [mesAgenda, setMesAgenda] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [fechaAgendaKey, setFechaAgendaKey] = useState("");

  const [reserva, setReserva] = useState({
    turno_id: "",
    direccion: "",
    comuna: "",
    telefono: "",
  });

  const [pedidos, setPedidos] = useState([]);
  const [stats, setStats] = useState(null);
  const [productos, setProductos] = useState([]);

  const [costo, setCosto] = useState({
    producto_id: "",
    costo_unitario: "",
  });

  const solicitud = useRef(null);
  const bloqueo = useRef(false);

  const mostrarError = useCallback(e => {
    setError(
      e.response || e.request
        ? mensajeError(e)
        : e.message || "No se pudo completar la operación."
    );
  }, []);

  const cargar = useCallback(async () => {
    if (vista === "agenda") {
      const respuesta = await api.get("/agenda/disponibles");
      setTurnos(respuesta.data);
    }

    if (!localStorage.getItem("token")) {
      setPerfil(null);
      setCitas([]);
      setPedidos([]);
      setCotizaciones([]);
      setStats(null);
      setProductos([]);

      if (["cotizaciones", "pedidos", "admin"].includes(vista)) {
        throw new Error("Inicia sesión desde el menú.");
      }

      return;
    }

    const p = (await api.get("/usuarios/me")).data;
    setPerfil(p);

    if (vista === "cotizaciones") {
      setCotizaciones(
        (await api.get("/cotizaciones/mis-cotizaciones")).data
      );
    }

    if (vista === "pedidos") {
      setPedidos((await api.get("/pedidos/mis-pedidos")).data);
    }

    if (vista === "agenda") {
      setCitas((await api.get("/agenda/mis-citas")).data);
    }

    if (vista === "admin") {
      const [s, pe, c, pr] = await Promise.all(
        [
          "/pedidos/stats",
          "/pedidos/",
          "/cotizaciones/",
          "/productos/",
        ].map(url => api.get(url))
      );

      setStats(s.data);
      setPedidos(pe.data);
      setCotizaciones(c.data);
      setProductos(pr.data);
    }
  }, [vista]);

  useEffect(() => {
    const refrescar = () => {
      cargar().catch(mostrarError);
    };

    refrescar();
    window.addEventListener("auth-change", refrescar);

    const timer =
      vista === "agenda" ? setInterval(refrescar, 15000) : null;

    return () => {
      window.removeEventListener("auth-change", refrescar);

      if (timer) {
        clearInterval(timer);
      }
    };
  }, [cargar, vista, mostrarError]);

  async function ejecutar(funcion, mensaje = "", refrescar = true) {
    if (bloqueo.current) return;

    bloqueo.current = true;
    setOcupado(true);
    setError("");
    setAviso("");

    try {
      await funcion();

      if (refrescar) {
        await cargar();
      }

      setAviso(mensaje);
    } catch (e) {
      mostrarError(e);
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  function abrirLogin() {
    window.dispatchEvent(new Event("open-auth-modal"));
  }

  function cambiarCampo(nombre, valor) {
    setForm(anterior => ({
      ...anterior,
      [nombre]: valor,
    }));

    setResultado(null);
    setGuardada(null);
    setAccionResultado(null);
    setError("");
    setAviso("");
  }

  function agregar(recomendacion, cotizacionId) {
    const existe = carrito.some(
      producto =>
        Number(producto.id) === Number(recomendacion.producto_id)
    );

    if (existe) {
      setError(
        "Ese kit ya está en el carrito. " +
          "Retíralo antes de añadir esta cotización."
      );
      return;
    }

    agregarAlCarrito({
      id: recomendacion.producto_id,
      nombre: recomendacion.nombre,
      precio: recomendacion.precio_clp,
      stock: recomendacion.stock,
      es_kit: true,
      imagen_url: recomendacion.imagen_url || "",
      cotizacion_id: cotizacionId || null,
    });

    setError("");
    setAviso("Kit añadido al carrito.");
  }

  function recomendar(e) {
    e.preventDefault();

    if (bloqueo.current) return;

    if (!localStorage.getItem("token")) {
      setError(
        "Inicia sesión para recomendar y guardar tu cotización."
      );
      setAviso("");
      abrirLogin();
      return;
    }

    const datos = {
      ...form,
      comuna: form.comuna.trim(),
      consumo_kwh_mensual: Number(form.consumo_kwh_mensual),
      hsp: Number(form.hsp),
      cobertura_objetivo: 1,
      presupuesto_max_clp:
        form.presupuesto_max_clp === ""
          ? null
          : Number(form.presupuesto_max_clp),
      superficie_disponible_m2:
        form.superficie_disponible_m2 === ""
          ? null
          : Number(form.superficie_disponible_m2),
    };

    if (!COMUNAS_COBERTURA.includes(datos.comuna)) {
      setError("Selecciona una comuna de la lista.");
      return;
    }

    ejecutar(
      async () => {
        setResultado(null);
        setGuardada(null);
        setAccionResultado(null);

        // Reutiliza la clave al reintentar los mismos datos.
        if (
          !solicitud.current ||
          JSON.stringify(solicitud.current.datos) !==
            JSON.stringify(datos)
        ) {
          solicitud.current = {
            clave: nuevaClave(),
            datos,
          };
        }

        // Recomienda y guarda en una sola operación.
        const { data } = await api.post(
          "/cotizaciones/guardar",
          solicitud.current
        );

        setGuardada(data);
        setResultado(data.resultado);
      },
      "Cotización guardada. Puedes verla en Mis cotizaciones.",
      false
    );
  }

  function opcionesTurno(valor, cambiar) {
    return (
      <select
        required
        className={`${campoBase} ${
          valor === ""
            ? "text-gray-400 font-normal"
            : "text-[#0F2547] font-semibold"
        }`}
        value={valor}
        onChange={e => cambiar(e.target.value)}
      >
        <option value="" disabled>
          Selecciona un horario disponible
        </option>

        {turnos.map(turno => (
          <option
            key={turno.id}
            value={turno.id}
            className="text-[#0F2547] font-medium"
          >
            {fecha(turno.inicio)}
          </option>
        ))}
      </select>
    );
  }

  const turnosPorFecha = useMemo(() => {
    const mapa = {};
    for (const t of turnos) {
      const key = obtenerFechaKey(t.inicio);
      if (!mapa[key]) mapa[key] = [];
      mapa[key].push({
        ...t,
        hora: obtenerHoraTexto(t.inicio),
      });
    }
    return mapa;
  }, [turnos]);

  const fechaActivaAgenda = useMemo(() => {
    if (fechaAgendaKey && turnosPorFecha[fechaAgendaKey]?.length) {
      return fechaAgendaKey;
    }
    const fechasConCupo = Object.keys(turnosPorFecha).sort();
    return fechasConCupo[0] || obtenerFechaKey(new Date());
  }, [fechaAgendaKey, turnosPorFecha]);

  const diasCalendarioAgenda = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const year = mesAgenda.getFullYear();
    const month = mesAgenda.getMonth();
    const primerDia = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDias = new Date(year, month + 1, 0).getDate();

    const celdas = [];
    for (let i = 0; i < primerDia; i++) {
      celdas.push(null);
    }
    for (let dia = 1; dia <= totalDias; dia++) {
      const f = new Date(year, month, dia);
      celdas.push({
        dia,
        key: obtenerFechaKey(f),
        esPasado: f < hoy,
      });
    }
    return celdas;
  }, [mesAgenda]);

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 text-[#0F2547]">
      <nav className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-white/80 backdrop-blur-md border border-gray-200/80 shadow-xs">
        <Link
          href="/cotizador"
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            vista === "cotizador"
              ? "bg-linear-to-r from-[#09203F] to-[#00B4D8] text-white shadow-sm"
              : "text-[#0F2547] hover:bg-slate-100"
          }`}
        >
          Cotizador
        </Link>
        <Link
          href="/mis-cotizaciones"
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            vista === "cotizaciones"
              ? "bg-linear-to-r from-[#09203F] to-[#00B4D8] text-white shadow-sm"
              : "text-[#0F2547] hover:bg-slate-100"
          }`}
        >
          Mis cotizaciones
        </Link>
        <Link
          href="/agenda"
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            vista === "agenda"
              ? "bg-linear-to-r from-[#09203F] to-[#00B4D8] text-white shadow-sm"
              : "text-[#0F2547] hover:bg-slate-100"
          }`}
        >
          Agenda
        </Link>
        <Link
          href="/mis-pedidos"
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            vista === "pedidos"
              ? "bg-linear-to-r from-[#09203F] to-[#00B4D8] text-white shadow-sm"
              : "text-[#0F2547] hover:bg-slate-100"
          }`}
        >
          Mis pedidos
        </Link>

        {perfil?.rol_id === 1 && (
          <Link
            href="/admin"
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              vista === "admin"
                ? "bg-linear-to-r from-[#09203F] to-[#00B4D8] text-white shadow-sm"
                : "text-[#0F2547] hover:bg-slate-100"
            }`}
          >
            Administración
          </Link>
        )}
      </nav>

      {error && (
        <p
          role="alert"
          className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold shadow-xs"
        >
          {error}
        </p>
      )}

      {aviso && (
        <p
          role="status"
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold shadow-xs"
        >
          {aviso}
        </p>
      )}

      {vista === "cotizador" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0F2547]">
              Cotizador solar KNN
            </h1>
            <p className="mt-1 text-sm md:text-base text-gray-600">
              Prototipo con datos simulados. HSP es un supuesto
              editable; no se calcula desde tu comuna.
              Requiere revisión técnica.
            </p>
          </div>

          {!perfil && (
            <div className="rounded-2xl p-5 bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-sm text-gray-700">
                Para guardar tu cotización debes iniciar sesión.
                Los datos que completes se conservarán mientras
                permanezcas en esta página.
              </p>

              <button
                type="button"
                className={`${boton} shrink-0`}
                onClick={abrirLogin}
              >
                Iniciar sesión o registrarse
              </button>
            </div>
          )}

          {/* Formulario del cotizador */}
          <form
            onSubmit={recomendar}
            className="bg-white/95 backdrop-blur-xl rounded-3xl border border-gray-200/80 p-6 md:p-10 shadow-xl"
          >
            <fieldset
              disabled={ocupado}
              className="grid md:grid-cols-2 gap-6"
            >
              <label className="block text-sm font-bold text-[#0F2547]">
                Consumo mensual kWh
                <input
                  required
                  name="consumo_kwh_mensual"
                  type="number"
                  min="30"
                  max="1500"
                  step="0.1"
                  placeholder="Ej: 350"
                  className={campo}
                  value={form.consumo_kwh_mensual}
                  onChange={e =>
                    cambiarCampo(
                      "consumo_kwh_mensual",
                      e.target.value
                    )
                  }
                />
              </label>

              <label className="block text-sm font-bold text-[#0F2547]">
                Comuna
                <select
                  required
                  name="comuna"
                  className={`${campoBase} ${
                    form.comuna === ""
                      ? "text-gray-400 font-normal"
                      : "text-[#0F2547] font-semibold"
                  }`}
                  value={form.comuna}
                  onChange={e =>
                    cambiarCampo("comuna", e.target.value)
                  }
                >
                  <option value="" disabled>
                    Selecciona tu comuna
                  </option>

                  {COMUNAS_COBERTURA.map(comuna => (
                    <option
                      key={comuna}
                      value={comuna}
                      className="text-[#0F2547] font-medium"
                    >
                      {comuna}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-bold text-[#0F2547]">
                Sistema
                <select
                  required
                  name="objetivo_sistema"
                  className={`${campoBase} ${
                    form.objetivo_sistema === ""
                      ? "text-gray-400 font-normal"
                      : "text-[#0F2547] font-semibold"
                  }`}
                  value={form.objetivo_sistema}
                  onChange={e =>
                    cambiarCampo(
                      "objetivo_sistema",
                      e.target.value
                    )
                  }
                >
                  <option value="" disabled>
                    Selecciona un sistema
                  </option>
                  <option
                    value="ahorro_red"
                    className="text-[#0F2547] font-medium"
                  >
                    On-Grid
                  </option>
                  <option
                    value="hibrido"
                    className="text-[#0F2547] font-medium"
                  >
                    Híbrido
                  </option>
                  <option
                    value="off_grid"
                    className="text-[#0F2547] font-medium"
                  >
                    Off-Grid
                  </option>
                </select>
              </label>

              <label className="block text-sm font-bold text-[#0F2547]">
                Tipo de red
                <select
                  required
                  name="tipo_red"
                  className={`${campoBase} ${
                    form.tipo_red === ""
                      ? "text-gray-400 font-normal"
                      : "text-[#0F2547] font-semibold"
                  }`}
                  value={form.tipo_red}
                  onChange={e =>
                    cambiarCampo("tipo_red", e.target.value)
                  }
                >
                  <option value="" disabled>
                    Selecciona el tipo de red
                  </option>
                  <option
                    value="monofasico"
                    className="text-[#0F2547] font-medium"
                  >
                    Monofásica
                  </option>
                  <option
                    value="trifasico"
                    className="text-[#0F2547] font-medium"
                  >
                    Trifásica: requiere evaluación
                  </option>
                </select>
              </label>

              <label className="block text-sm font-bold text-[#0F2547]">
                Horas solares pico
                <input
                  required
                  name="hsp"
                  type="number"
                  min="2"
                  max="7"
                  step="0.1"
                  placeholder="Ej: 4.8"
                  className={campo}
                  value={form.hsp}
                  onChange={e =>
                    cambiarCampo("hsp", e.target.value)
                  }
                />
              </label>

              <label className="block text-sm font-bold text-[#0F2547]">
                Presupuesto máximo CLP, opcional
                <input
                  name="presupuesto_max_clp"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ej: 3800000"
                  className={campo}
                  value={form.presupuesto_max_clp}
                  onChange={e =>
                    cambiarCampo(
                      "presupuesto_max_clp",
                      e.target.value
                    )
                  }
                />
              </label>

              <label className="block text-sm font-bold text-[#0F2547] md:col-span-2">
                Superficie disponible m², opcional
                <input
                  name="superficie_disponible_m2"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="Ej: 25"
                  className={campo}
                  value={form.superficie_disponible_m2}
                  onChange={e =>
                    cambiarCampo(
                      "superficie_disponible_m2",
                      e.target.value
                    )
                  }
                />
              </label>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  className="w-full md:w-auto min-w-56 rounded-xl px-8 py-3.5 bg-linear-to-r from-[#09203F] to-[#00B4D8] text-white font-extrabold hover:from-[#00fc82] hover:to-[#00fc82] hover:text-[#0F2547] transition-all shadow-lg hover:shadow-[0_0_25px_rgba(0,252,130,0.5)] inline-flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-wait cursor-pointer"
                  disabled={ocupado}
                  aria-busy={ocupado}
                >
                  {ocupado && (
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}

                  <span aria-live="polite">
                    {ocupado ? "Cotizando…" : "Recomendar"}
                  </span>
                </button>
              </div>
            </fieldset>
          </form>

          {/* Tarjeta de resultado */}
          {resultado && (
            <article className="rounded-3xl bg-linear-to-br from-[#09203F] to-[#00B4D8] p-6 md:p-10 text-white shadow-2xl border border-[#00fc82]/40 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/15 pb-5">
                <div>
                  {guardada && (
                    <p className="inline-block text-xs font-extrabold uppercase tracking-wider bg-[#00fc82] text-[#0F2547] px-3 py-1 rounded-full mb-2">
                      Cotización #{guardada.id} guardada
                    </p>
                  )}
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                    {resultado.nombre}
                  </h2>
                </div>

                <div className="md:text-right">
                  <p className="text-2xl md:text-3xl font-extrabold text-[#00fc82]">
                    {pesos(resultado.precio_clp)}
                  </p>
                  <p className="text-xs text-gray-200 font-medium">
                    Stock: {resultado.stock}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <p className="text-xs uppercase tracking-wider text-gray-200 mb-1">
                    Ubicación
                  </p>
                  <p className="text-base font-bold text-white">
                    <strong>Comuna:</strong>{" "}
                    {guardada?.comuna || resultado.comuna}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <p className="text-xs uppercase tracking-wider text-gray-200 mb-1">
                    Dimensionamiento
                  </p>
                  <p className="text-base font-bold text-white">
                    {resultado.cantidad_paneles} paneles
                    {" · "}{resultado.potencia_kwp} kWp
                    {" · "}Superficie:{" "}
                    {resultado.superficie_estimada_m2} m²
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <p className="text-xs uppercase tracking-wider text-gray-200 mb-1">
                    Producción
                  </p>
                  <p className="text-base font-bold text-white">
                    Energía mensual estimada:{" "}
                    {resultado.energia_mensual_estimada_kwh} kWh
                  </p>
                </div>
              </div>

              {(resultado.advertencias || []).length > 0 && (
                <ul className="p-4 rounded-2xl bg-black/20 border border-white/10 space-y-1.5 text-sm text-gray-100">
                  {(resultado.advertencias || []).map(advertencia => (
                    <li key={advertencia}>• {advertencia}</li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {guardada && (
                  <Link
                    href="/mis-cotizaciones"
                    onClick={() => setAccionResultado("ver")}
                    className={`rounded-xl px-5 py-2.5 font-bold transition-all ${
                      accionResultado === "ver"
                        ? "bg-[#00fc82] text-[#0F2547] border border-[#00fc82] shadow-[0_0_20px_rgba(0,252,130,0.5)]"
                        : "bg-[#0F2547] text-white border border-white/25 hover:border-[#00fc82] hover:text-[#00fc82] shadow-md"
                    }`}
                  >
                    Ver cotización guardada #{guardada.id}
                  </Link>
                )}

                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => {
                    setAccionResultado("carrito");
                    agregar(resultado, guardada?.id);
                  }}
                  className={`rounded-xl px-6 py-2.5 font-bold transition-all cursor-pointer disabled:opacity-40 ${
                    accionResultado === "carrito"
                      ? "bg-[#00fc82] text-[#0F2547] border border-[#00fc82] shadow-[0_0_20px_rgba(0,252,130,0.5)]"
                      : "bg-[#0F2547] text-white border border-white/25 hover:border-[#00fc82] hover:text-[#00fc82] shadow-md"
                  }`}
                >
                  Añadir al carrito
                </button>

                <Link
                  href="/checkout"
                  onClick={() => setAccionResultado("pedido")}
                  className={`rounded-xl px-5 py-2.5 font-bold transition-all ${
                    accionResultado === "pedido"
                      ? "bg-[#00fc82] text-[#0F2547] border border-[#00fc82] shadow-[0_0_20px_rgba(0,252,130,0.5)]"
                      : "bg-[#0F2547] text-white border border-white/25 hover:border-[#00fc82] hover:text-[#00fc82] shadow-md"
                  }`}
                >
                  Registrar pedido
                </Link>
              </div>
            </article>
          )}
        </div>
      )}

      {vista === "cotizaciones" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0F2547]">
                Historial de cotizaciones
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                El precio y stock se consultan de nuevo al crear
                el pedido.
              </p>
            </div>

            <button
              type="button"
              className={`${boton} shrink-0 self-start sm:self-auto`}
              disabled={ocupado}
              onClick={() =>
                ejecutar(cargar, "Cotizaciones actualizadas.", false)
              }
            >
              {ocupado ? "Actualizando..." : "Actualizar lista"}
            </button>
          </div>

          <div className="space-y-3">
            {cotizaciones.map(cotizacion => (
              <article
                key={cotizacion.id}
                className="rounded-2xl bg-white border border-gray-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-[#0F2547]">
                      Cotización #{cotizacion.id}
                    </h2>
                    <span className="text-gray-300">·</span>
                    <span
                      className={`text-xs font-semibold capitalize px-2.5 py-0.5 rounded-md border ${
                        cotizacion.estado === "aprobada" ||
                        cotizacion.estado === "aceptada"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : cotizacion.estado === "rechazada"
                            ? "bg-red-50 text-red-800 border-red-200"
                            : cotizacion.estado === "contactado"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {cotizacion.estado}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-sm font-medium text-gray-600">
                      {cotizacion.consumo_kwh_mensual} kWh/mes
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    <strong className="font-semibold text-[#0F2547]">Comuna:</strong>{" "}
                    {cotizacion.comuna || "No registrada"}
                    {cotizacion.fecha_solicitud && (
                      <>
                        {" · "}
                        <strong className="font-semibold text-[#0F2547]">Fecha:</strong>{" "}
                        {fecha(cotizacion.fecha_solicitud)}
                      </>
                    )}
                  </p>

                  {cotizacion.resultado ? (
                    <p className="text-base font-bold text-[#0F2547] pt-0.5">
                      {cotizacion.resultado.nombre}
                      {" · "}
                      <span className="text-[#00B4D8]">
                        {pesos(cotizacion.resultado.precio_clp)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Cotización anterior sin detalle KNN.
                    </p>
                  )}
                </div>

                {cotizacion.resultado && (
                  <button
                    type="button"
                    className={`${boton} shrink-0 self-start md:self-center`}
                    onClick={() =>
                      agregar(cotizacion.resultado, cotizacion.id)
                    }
                  >
                    Añadir kit al carrito
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {vista === "agenda" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0F2547]">
                Agenda de visita técnica
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Solicita una visita en terreno de 1 hora para validar la factibilidad técnica de tu instalación solar.
              </p>
            </div>

            {perfil?.rol_id === 1 && (
              <Link
                href="/admin/agenda"
                className="rounded-xl px-4 py-2.5 bg-slate-100 hover:bg-[#0F2547] text-[#0F2547] hover:text-white text-xs font-bold transition-colors self-start sm:self-auto shrink-0"
              >
                Administrar horarios y visitas →
              </Link>
            )}
          </div>

          {!perfil ? (
            <div className="rounded-2xl p-5 bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-sm text-gray-700">
                Debes iniciar sesión para reservar una visita técnica a domicilio.
              </p>

              <button
                type="button"
                className={`${boton} shrink-0`}
                onClick={abrirLogin}
              >
                Iniciar sesión o registrarse
              </button>
            </div>
          ) : (
            <form
              className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-sm"
              onSubmit={e => {
                e.preventDefault();

                ejecutar(
                  async () => {
                    await api.post("/agenda/", {
                      ...reserva,
                      turno_id: Number(reserva.turno_id),
                    });
                    setReserva({
                      turno_id: "",
                      direccion: "",
                      comuna: "",
                      telefono: "",
                    });
                  },
                  "Visita confirmada."
                );
              }}
            >
              <fieldset
                disabled={ocupado}
                className="space-y-6"
              >
                {/* Selector visual: Calendario + Bloques de Hora */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Calendario */}
                  <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setMesAgenda(
                            new Date(
                              mesAgenda.getFullYear(),
                              mesAgenda.getMonth() - 1,
                              1
                            )
                          )
                        }
                        className="px-2.5 py-1 rounded-lg hover:bg-gray-200/70 text-[#0F2547] font-bold text-sm cursor-pointer"
                        aria-label="Mes anterior"
                      >
                        ‹
                      </button>

                      <span className="text-sm font-extrabold text-[#0F2547]">
                        {NOMBRES_MESES_AGENDA[mesAgenda.getMonth()]}{" "}
                        {mesAgenda.getFullYear()}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setMesAgenda(
                            new Date(
                              mesAgenda.getFullYear(),
                              mesAgenda.getMonth() + 1,
                              1
                            )
                          )
                        }
                        className="px-2.5 py-1 rounded-lg hover:bg-gray-200/70 text-[#0F2547] font-bold text-sm cursor-pointer"
                        aria-label="Mes siguiente"
                      >
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                      {DIAS_SEMANA_AGENDA.map(d => (
                        <span
                          key={d}
                          className="text-[10px] font-extrabold uppercase text-gray-400 py-1"
                        >
                          {d}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {diasCalendarioAgenda.map((celda, idx) => {
                        if (!celda) {
                          return <div key={`v-${idx}`} className="h-9" />;
                        }
                        const cuposDia = turnosPorFecha[celda.key] || [];
                        const tieneCupos = cuposDia.length > 0;
                        const seleccionado = celda.key === fechaActivaAgenda;

                        return (
                          <button
                            key={celda.key}
                            type="button"
                            disabled={celda.esPasado}
                            onClick={() => {
                              setFechaAgendaKey(celda.key);
                              setReserva(anterior => ({
                                ...anterior,
                                turno_id: "",
                              }));
                            }}
                            className={`h-9 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all ${
                              celda.esPasado
                                ? "text-gray-300 cursor-not-allowed"
                                : seleccionado
                                  ? "bg-[#0F2547] text-white shadow-xs cursor-pointer"
                                  : tieneCupos
                                    ? "bg-white text-[#0F2547] border border-[#00B4D8]/40 hover:border-[#0F2547] cursor-pointer"
                                    : "text-gray-400 hover:bg-white cursor-pointer"
                            }`}
                          >
                            <span>{celda.dia}</span>
                            {tieneCupos && (
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

                  {/* Bloques de hora del día seleccionado */}
                  <div className="lg:col-span-7 bg-slate-50/80 rounded-2xl border border-gray-200 p-4 min-h-48 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#0F2547] mb-3">
                        Horarios disponibles para el{" "}
                        {fechaActivaAgenda.split("-").reverse().join("-")}
                      </p>

                      {!turnos.length ? (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                          No hay horarios disponibles publicados en este momento.
                        </p>
                      ) : !(turnosPorFecha[fechaActivaAgenda] || []).length ? (
                        <p className="text-xs text-gray-500 bg-white border border-gray-200 rounded-xl p-4">
                          No hay horas disponibles en esta fecha. Selecciona en el calendario un día marcado con punto celeste.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {(turnosPorFecha[fechaActivaAgenda] || []).map(t => {
                            const elegido =
                              String(reserva.turno_id) === String(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() =>
                                  setReserva(anterior => ({
                                    ...anterior,
                                    turno_id: elegido ? "" : String(t.id),
                                  }))
                                }
                                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  elegido
                                    ? "bg-[#00fc82] text-[#0F2547] border-[#00fc82] shadow-xs"
                                    : "bg-white text-[#0F2547] border-gray-200 hover:border-[#0F2547]"
                                }`}
                              >
                                {t.hora} hrs
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 pt-3 border-t border-gray-200/70 mt-4">
                      {reserva.turno_id
                        ? "Horario seleccionado. Completa tus datos abajo para confirmar."
                        : "Selecciona un día en el calendario y luego elige un bloque de hora."}
                    </p>
                  </div>
                </div>

                {/* Datos de dirección y contacto */}
                <div className="grid md:grid-cols-3 gap-5">
                  <label className="block text-sm font-bold text-[#0F2547]">
                    Comuna
                    <select
                      required
                      className={`${campoBase} ${
                        reserva.comuna === ""
                          ? "text-gray-400 font-normal"
                          : "text-[#0F2547] font-semibold"
                      }`}
                      value={reserva.comuna}
                      onChange={e => {
                        const valor = e.target.value;
                        setReserva(anterior => ({
                          ...anterior,
                          comuna: valor,
                        }));
                      }}
                    >
                      <option value="" disabled>
                        Selecciona tu comuna
                      </option>
                      {COMUNAS_COBERTURA.map(comuna => (
                        <option
                          key={comuna}
                          value={comuna}
                          className="text-[#0F2547] font-medium"
                        >
                          {comuna}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-bold text-[#0F2547]">
                    Dirección
                    <input
                      required
                      className={campo}
                      minLength={5}
                      maxLength={250}
                      placeholder="Ej: Av. Libertad 450"
                      value={reserva.direccion}
                      onChange={e => {
                        const valor = e.target.value;
                        setReserva(anterior => ({
                          ...anterior,
                          direccion: valor,
                        }));
                      }}
                    />
                  </label>

                  <label className="block text-sm font-bold text-[#0F2547]">
                    Teléfono de contacto
                    <input
                      required
                      className={campo}
                      minLength={6}
                      maxLength={30}
                      placeholder="Ej: +56 9 1234 5678"
                      value={reserva.telefono}
                      onChange={e => {
                        const valor = e.target.value;
                        setReserva(anterior => ({
                          ...anterior,
                          telefono: valor,
                        }));
                      }}
                    />
                  </label>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={!reserva.turno_id || ocupado}
                    className={boton}
                  >
                    Confirmar reserva
                  </button>
                </div>
              </fieldset>
            </form>
          )}

          {perfil && (
            <div className="space-y-3 pt-2">
              <h2 className="text-lg font-bold text-[#0F2547]">
                Mis visitas agendadas
              </h2>

              {citas.length === 0 ? (
                <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-200 p-5">
                  Aún no tienes visitas técnicas reservadas.
                </p>
              ) : (
                citas.map(cita => {
                  const esFutura = new Date(cita.inicio) > new Date();
                  return (
                    <article
                      key={cita.id}
                      className="rounded-2xl bg-white border border-gray-200 p-5 shadow-xs space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-[#0F2547]">
                            Visita #{cita.id}
                          </h3>
                          <span className="text-gray-300">·</span>
                          <span
                            className={`text-xs font-semibold capitalize px-2.5 py-0.5 rounded-md border ${
                              cita.estado === "confirmada"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}
                          >
                            {cita.estado}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="text-sm font-semibold text-[#0F2547]">
                            {fecha(cita.inicio)}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600">
                        <strong className="font-semibold text-[#0F2547]">Dirección:</strong>{" "}
                        {cita.direccion}, {cita.comuna}
                        {" · "}
                        <strong className="font-semibold text-[#0F2547]">Teléfono:</strong>{" "}
                        {cita.telefono}
                      </p>

                      {cita.estado === "confirmada" && esFutura && (
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
                          <div className="w-full sm:w-64">
                            {opcionesTurno(
                              destinos[cita.id] || "",
                              valor =>
                                setDestinos(anterior => ({
                                  ...anterior,
                                  [cita.id]: valor,
                                }))
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={ocupado || !destinos[cita.id]}
                            className={boton}
                            onClick={() =>
                              ejecutar(
                                () =>
                                  api.put(
                                    `/agenda/${cita.id}/reprogramar`,
                                    {
                                      turno_id: Number(destinos[cita.id]),
                                    }
                                  ),
                                "Cita reprogramada."
                              )
                            }
                          >
                            Reprogramar
                          </button>

                          <button
                            type="button"
                            disabled={ocupado}
                            className="rounded-xl px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold text-sm transition-colors cursor-pointer disabled:opacity-40"
                            onClick={() =>
                              ejecutar(
                                () =>
                                  api.put(`/agenda/${cita.id}/cancelar`),
                                "Cita cancelada."
                              )
                            }
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {vista === "admin" && perfil?.rol_id === 1 && (
        <>
          <h1 className="text-3xl font-bold">
            Administración
          </h1>

          <button
            type="button"
            className={boton}
            disabled={ocupado}
            onClick={() =>
              ejecutar(cargar, "Datos actualizados.", false)
            }
          >
            Actualizar
          </button>

          {stats && (
            <>
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  ["Ventas entregadas", pesos(stats.total_ingresos)],
                  ["Costos registrados", pesos(stats.costos_registrados)],
                  ["Margen bruto", pesos(stats.margen_bruto)],
                  ["Pedidos", stats.total_pedidos],
                  ["Cotizaciones", stats.total_cotizaciones],
                  ["Conversión", `${stats.tasa_conversion}%`],
                ].map(([titulo, valor]) => (
                  <article
                    key={titulo}
                    className="border rounded p-4"
                  >
                    <p>{titulo}</p>
                    <strong>{valor}</strong>
                  </article>
                ))}
              </div>

              <p>{stats.criterio}</p>

              <p>
                Pedidos sin costo completo:{" "}
                {stats.pedidos_sin_costo}.
              </p>
            </>
          )}

          <form
            className="border p-4 space-y-3"
            onSubmit={e => {
              e.preventDefault();

              ejecutar(
                () =>
                  api.put(`/costos/${costo.producto_id}`, {
                    costo_unitario: Number(costo.costo_unitario),
                  }),
                "Costo guardado."
              );
            }}
          >
            <h2>Registrar costos antes de crear pedidos</h2>

            <select
              required
              className={campo}
              value={costo.producto_id}
              onChange={e => {
                const valor = e.target.value;

                setCosto(anterior => ({
                  ...anterior,
                  producto_id: valor,
                }));
              }}
            >
              <option value="">Producto</option>

              {productos.map(producto => (
                <option value={producto.id} key={producto.id}>
                  {producto.nombre}
                </option>
              ))}
            </select>

            <input
              aria-label="Costo unitario CLP"
              required
              type="number"
              min="0"
              max="2000000000"
              step="1"
              className={campo}
              value={costo.costo_unitario}
              onChange={e => {
                const valor = e.target.value;

                setCosto(anterior => ({
                  ...anterior,
                  costo_unitario: valor,
                }));
              }}
            />

            <button
              type="submit"
              disabled={ocupado}
              className={boton}
            >
              Guardar costo CLP
            </button>

            <p>
              Los cambios no alteran los costos de pedidos
              anteriores.
            </p>
          </form>

          <h2 className="text-xl font-bold">Cotizaciones</h2>

          {cotizaciones.map(cotizacion => (
            <article
              key={cotizacion.id}
              className="border rounded p-3 space-y-2"
            >
              <p>
                #{cotizacion.id}
                {" · "}Cliente {cotizacion.usuario_id}
                {" · "}
                {cotizacion.resultado?.nombre || "Registro anterior"}
              </p>

              <p>
                <strong>Comuna:</strong>{" "}
                {cotizacion.comuna || "No registrada"}
              </p>

              <select
                disabled={ocupado}
                className={campo}
                value={cotizacion.estado}
                onChange={e => {
                  const nuevoEstado = e.target.value;

                  ejecutar(
                    () =>
                      api.put(
                        `/cotizaciones/${cotizacion.id}`,
                        null,
                        {
                          params: {
                            nuevo_estado: nuevoEstado,
                          },
                        }
                      ),
                    "Estado actualizado."
                  );
                }}
              >
                {[
                  "pendiente",
                  "contactado",
                  "aprobada",
                  "rechazada",
                ].map(estado => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </article>
          ))}
        </>
      )}

      {(vista === "pedidos" ||
        (vista === "admin" && perfil?.rol_id === 1)) && (
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#0F2547]">
              Mis pedidos
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Revisa el estado de tus órdenes de compra y el detalle de los equipos solicitados.
            </p>
          </div>

          <div className="space-y-3">
            {pedidos.map(pedido => {
              const colorEstado =
                pedido.estado === "entregado"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : pedido.estado === "enviado"
                    ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                    : pedido.estado === "confirmado"
                      ? "bg-sky-50 text-sky-800 border-sky-200"
                      : pedido.estado === "cancelado"
                        ? "bg-red-50 text-red-800 border-red-200"
                        : "bg-amber-50 text-amber-800 border-amber-200";

              return (
                <article
                  key={pedido.id}
                  className="rounded-2xl bg-white border border-gray-200 p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F2547]">
                        Pedido #{pedido.id}
                      </h3>
                      <span className="text-gray-300">·</span>
                      <span
                        className={`text-xs font-semibold capitalize px-2.5 py-0.5 rounded-md border ${colorEstado}`}
                      >
                        {pedido.estado}
                      </span>
                      {pedido.fecha && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-500">
                            {fecha(pedido.fecha)}
                          </span>
                        </>
                      )}
                    </div>

                    <span className="text-lg font-extrabold text-[#0F2547]">
                      {pesos(pedido.monto_total)}
                    </span>
                  </div>

                  {pedido.entrega && (
                    <p className="text-sm text-gray-600">
                      <strong className="font-semibold text-[#0F2547]">
                        Despacho:
                      </strong>{" "}
                      {pedido.entrega.direccion}, {pedido.entrega.comuna}
                      {" · "}
                      <strong className="font-semibold text-[#0F2547]">
                        Teléfono:
                      </strong>{" "}
                      {pedido.entrega.telefono}
                    </p>
                  )}

                  <ul className="space-y-1 text-sm text-gray-700 bg-slate-50/80 rounded-xl p-3 border border-gray-100">
                    {pedido.items.map((item, idx) => (
                      <li
                        key={`${pedido.id}-${item.producto_id ?? "item"}-${idx}`}
                        className="flex justify-between gap-2"
                      >
                        <span>
                          <strong className="text-[#0F2547]">{item.cantidad} ×</strong>{" "}
                          {item.nombre}
                        </span>
                        <span className="font-semibold text-[#0F2547]">
                          {pesos(item.precio_unitario)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {vista === "pedidos" && pedido.estado === "pendiente" && (
                    <div className="pt-1">
                      <BotonPago
                        monto={pedido.monto_total}
                        ordenCompra={`pedido_${pedido.id}`}
                      />
                    </div>
                  )}

                  {vista === "admin" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(siguientes[pedido.estado] || []).map(estado => (
                        <button
                          type="button"
                          key={estado}
                          disabled={ocupado}
                          className={boton}
                          onClick={() =>
                            ejecutar(
                              () =>
                                api.put(
                                  `/pedidos/${pedido.id}`,
                                  null,
                                  {
                                    params: {
                                      nuevo_estado: estado,
                                    },
                                  }
                                ),
                              "Pedido actualizado."
                            )
                          }
                        >
                          {estado}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}