import re
import unicodedata

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator


router = APIRouter(
    prefix="/ia",
    tags=["Asistente solar"],
)


class MensajeChat(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[dict] = Field(default_factory=list, max_length=30)

    @field_validator("message")
    @classmethod
    def validar_mensaje(cls, valor: str) -> str:
        valor = valor.strip()

        if not valor:
            raise ValueError("Escribe un mensaje para continuar.")

        return valor


def normalizar(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", texto.lower())
    texto = "".join(
        caracter
        for caracter in texto
        if not unicodedata.combining(caracter)
    )
    texto = re.sub(r"[^a-z0-9\s]", " ", texto)
    return re.sub(r"\s+", " ", texto).strip()


def contiene(texto: str, *expresiones: str) -> bool:
    """Busca palabras o frases completas."""
    return any(
        re.search(rf"\b{re.escape(expresion)}\b", texto)
        for expresion in expresiones
    )


def enlace(etiqueta: str, ruta: str) -> dict:
    return {
        "label": etiqueta,
        "url": ruta,
    }


CATALOGO = enlace("🛒 Ver productos", "/catalogo")
COTIZADOR = enlace("☀️ Cotizar un kit", "/cotizador")
PEDIDOS = enlace("📦 Ver mis pedidos", "/mis-pedidos")
COTIZACIONES = enlace("📋 Ver mis cotizaciones", "/mis-cotizaciones")
AGENDA = enlace("📅 Agendar una visita", "/agenda")


def responder(
    payload: MensajeChat,
    texto: str,
    acciones: list[dict] | None = None,
) -> dict:
    hay_mensajes_previos = any(
        mensaje.get("role") == "user"
        for mensaje in payload.history
    )

    if not hay_mensajes_previos and not texto.startswith("¡Hola"):
        texto = f"¡Hola! 😊 {texto}"

    return {
        "reply": texto,
        "actions": acciones or [],
    }


@router.post("/chat")
def chat(payload: MensajeChat):
    texto = normalizar(payload.message)

    # Saludo sin botones.
    saludo = re.match(
        r"^(hola+|holi|buenos dias|buenas tardes|buenas noches|buenas)\b",
        texto,
    )

    consulta = texto[saludo.end():].strip() if saludo else texto

    if (
        saludo and consulta in ("", "como estas", "que tal", "como estas hoy")
    ) or texto in ("como estas", "que tal", "como estas hoy"):
        return responder(
            payload,
            (
                "¡Hola! 😊 Qué gusto saludarte. "
                "Estoy aquí para ayudarte con energía solar. "
                "Puedes preguntarme por nuestros productos, "
                "cómo cotizar un kit o cómo agendar una visita. "
                "¿En qué te puedo ayudar?"
            ),
        )

    # Corrección de la confusión entre productos y pedidos.
    corrige_pedidos = contiene(
        texto,
        "me estas mostrando los pedidos",
        "me estas mostrando pedidos",
        "me muestras los pedidos",
        "me muestras pedidos",
        "no quiero pedidos",
        "no quiero ver pedidos",
        "no pedi pedidos",
        "productos no pedidos",
        "no los pedidos",
        "te pedi productos",
        "te dije productos",
    )

    if corrige_pedidos:
        return responder(
            payload,
            (
                "Disculpa la confusión 😊. Me pediste ver productos "
                "y te indiqué tus pedidos por error. "
                "Este es el enlace correcto al catálogo. "
                "Puedes abrirlo con el botón de abajo."
            ),
            [CATALOGO],
        )

    if contiene(
        texto,
        "no entendiste",
        "no me entendiste",
        "eso no pregunte",
        "eso no te pregunte",
        "no es lo que pedi",
        "no responde mi pregunta",
    ):
        return responder(
            payload,
            (
                "Disculpa, entendí mal tu consulta. "
                "¿Podrías decirme qué necesitas saber? "
                "Por ejemplo: ver productos, revisar un pedido "
                "o cotizar un kit solar."
            ),
            [CATALOGO, PEDIDOS, COTIZADOR],
        )

    # Agradecimientos.
    if texto in (
        "gracias",
        "muchas gracias",
        "muchisimas gracias",
        "ok gracias",
        "perfecto gracias",
        "genial gracias",
        "bueno gracias",
    ):
        return responder(
            payload,
            (
                "¡Con mucho gusto! 😊 Si tienes otra pregunta, "
                "aquí estoy para ayudarte."
            ),
        )

    # Despedidas.
    if texto in (
        "adios",
        "chao",
        "chau",
        "hasta luego",
        "nos vemos",
        "gracias adios",
        "gracias chao",
    ):
        return responder(
            payload,
            (
                "¡Hasta luego! 😊 Gracias por visitarnos. "
                "Que tengas un excelente día."
            ),
        )

    # Tipos de sistemas solares.
    if contiene(
        texto,
        "on grid",
        "ongrid",
        "off grid",
        "offgrid",
        "hibrido",
    ):
        if contiene(
            texto,
            "diferencia",
            "diferencias",
            "comparar",
            "comparacion",
            "cual es mejor",
        ):
            return responder(
                payload,
                (
                    "¡Claro! 😊 La diferencia principal es cómo se conectan "
                    "y almacenan la energía:\n\n"
                    "• On-grid: funciona conectado a la red eléctrica. "
                    "Un sistema convencional se apaga si hay un corte de luz.\n"
                    "• Híbrido: puede combinar paneles, red y baterías. "
                    "El respaldo durante cortes depende del equipo "
                    "y de cómo esté instalado.\n"
                    "• Off-grid: funciona sin conexión a la red y necesita "
                    "un diseño que cubra tu consumo y autonomía.\n\n"
                    "¿Buscas ahorrar en tu cuenta o también tener respaldo "
                    "cuando se corta la luz?"
                ),
                [COTIZADOR, AGENDA],
            )

        if contiene(
            texto,
            "que es",
            "como funciona",
            "explicame",
            "significa",
        ):
            if contiene(texto, "hibrido"):
                explicacion = (
                    "Un sistema híbrido combina energía solar con la red "
                    "y puede incorporar baterías. El respaldo durante un "
                    "corte depende del inversor, las baterías y la instalación."
                )
            elif contiene(texto, "off grid", "offgrid"):
                explicacion = (
                    "Un sistema off-grid funciona sin conexión a la red "
                    "eléctrica. Habitualmente usa baterías y necesita "
                    "dimensionarse según tu consumo y la autonomía requerida."
                )
            else:
                explicacion = (
                    "Un sistema on-grid funciona conectado a la red eléctrica "
                    "y permite aprovechar la energía de los paneles. "
                    "Un sistema convencional se apaga durante un corte "
                    "de luz por seguridad."
                )

            return responder(
                payload,
                f"¡Con gusto! 😊 {explicacion}",
                [COTIZADOR, AGENDA],
            )

    # Funcionamiento de los paneles.
    if contiene(
        texto,
        "como funcionan los paneles",
        "como funciona un panel",
        "que es un panel solar",
        "que son los paneles solares",
        "como funciona la energia solar",
    ):
        return responder(
            payload,
            (
                "¡Claro! 😊 Los paneles solares fotovoltaicos convierten "
                "la luz del sol en electricidad. Un inversor transforma "
                "esa energía para que puedas usarla en tu hogar. "
                "La producción depende del sol disponible, las sombras, "
                "la orientación y la instalación."
            ),
            [CATALOGO, COTIZADOR],
        )

    # Consumo eléctrico.
    if contiene(
        texto,
        "kwh",
        "consumo mensual",
        "donde veo mi consumo",
        "como saber mi consumo",
        "boleta",
    ):
        return responder(
            payload,
            (
                "¡Te ayudo! 😊 Busca en tu boleta eléctrica el consumo "
                "expresado en kWh. Para el cotizador necesitas el consumo "
                "mensual, no el monto en pesos. Revisa también el período "
                "facturado para confirmar que corresponde a un mes."
            ),
            [COTIZADOR],
        )

    # Comunas configuradas.
    if contiene(
        texto,
        "cobertura",
        "comunas",
        "ciudades",
        "valparaiso",
        "vina del mar",
        "concon",
        "quilpue",
        "villa alemana",
        "donde atienden",
    ):
        return responder(
            payload,
            (
                "¡Con gusto! 😊 Las comunas configuradas en el cotizador "
                "son Valparaíso, Viña del Mar, Concón, Quilpué y "
                "Villa Alemana. Si necesitas atención en otra comuna, "
                "hay que confirmar la disponibilidad con el equipo."
            ),
            [COTIZADOR, AGENDA],
        )

    # Agenda antes del catálogo para distinguir horarios de stock.
    if contiene(
        texto,
        "agenda",
        "agendar",
        "visita",
        "visitas",
        "horario",
        "horarios",
        "cita",
        "reprogramar",
        "cancelar visita",
        "reservar",
    ):
        return responder(
            payload,
            (
                "¡Con gusto te oriento! 😊 Abre la agenda para revisar "
                "las opciones de visita técnica y gestionar tu solicitud. "
                "Desde este chat no realizo reservas ni confirmo horarios."
            ),
            [AGENDA],
        )

    # Información que requiere confirmación del equipo.
    if contiene(
        texto,
        "garantia",
        "garantias",
        "certificacion",
        "sec",
        "plazo de instalacion",
        "cuanto demora la instalacion",
    ):
        return responder(
            payload,
            (
                "¡Buena pregunta! 😊 Esos detalles deben confirmarse "
                "con el equipo según el producto y la instalación. "
                "No tengo información verificada para darte una "
                "garantía, certificación o plazo específico. "
                "Puedes solicitar orientación mediante una visita técnica."
            ),
            [AGENDA],
        )

    # Cotizaciones guardadas.
    if contiene(
        texto,
        "mis cotizaciones",
        "ver cotizaciones",
        "ver mi cotizacion",
        "cotizaciones guardadas",
        "cotizacion guardada",
        "no se guarda",
        "no se guardo",
    ):
        return responder(
            payload,
            (
                "¡Claro! 😊 Puedes revisar tus cotizaciones guardadas "
                "en Mis cotizaciones con tu sesión iniciada. "
                "Si una no aparece, comprueba que la aplicación haya "
                "confirmado que se guardó. Desde aquí no puedo verificar "
                "los registros de tu cuenta."
            ),
            [COTIZACIONES],
        )

    quiere_productos = contiene(
        texto,
        "producto",
        "productos",
        "catalogo",
        "panel",
        "paneles",
        "inversor",
        "inversores",
        "bateria",
        "baterias",
        "kit",
        "kits",
        "precio",
        "precios",
        "stock",
    )

    quiere_pedidos = contiene(
        texto,
        "pedido",
        "pedidos",
        "mis compras",
        "mi compra",
        "seguimiento",
        "despacho",
        "envio",
    )

    # Consulta que menciona ambas secciones.
    if quiere_productos and quiere_pedidos:
        return responder(
            payload,
            (
                "Te ayudo 😊. El catálogo muestra los productos para "
                "comprar y Mis pedidos muestra tus compras realizadas. "
                "¿Cuál de las dos secciones necesitas revisar?"
            ),
            [CATALOGO, PEDIDOS],
        )

    # Pedidos.
    if quiere_pedidos:
        return responder(
            payload,
            (
                "¡Claro! 😊 Puedes revisar tus compras en Mis pedidos "
                "con tu sesión iniciada. Desde este chat no puedo "
                "consultar tus pedidos personales ni confirmar pagos "
                "o fechas de entrega."
            ),
            [PEDIDOS],
        )

    # Nueva cotización o recomendación.
    if contiene(
        texto,
        "cotizar",
        "cotizacion",
        "cotizador",
        "presupuesto",
        "recomendar",
        "recomiendas",
        "recomendacion",
        "cuantos paneles",
        "que kit necesito",
        "que kit me sirve",
        "cuanto puedo ahorrar",
    ):
        return responder(
            payload,
            (
                "¡Con gusto te ayudo a empezar! 😊 En el cotizador "
                "puedes ingresar tu consumo mensual, comuna y los "
                "otros datos solicitados para obtener una recomendación "
                "preliminar. La selección final necesita una revisión "
                "técnica de tu caso."
            ),
            [COTIZADOR, AGENDA],
        )

    # Productos.
    if quiere_productos:
        if contiene(
            texto,
            "precio",
            "precios",
            "cuesta",
            "cuestan",
            "stock",
        ):
            respuesta = (
                "¡Claro! 😊 Puedes consultar los precios y la "
                "disponibilidad publicados en el catálogo. "
                "Desde este chat no consulto el stock en tiempo real, "
                "así que no quiero darte un dato incorrecto."
            )
        else:
            respuesta = (
                "¡Claro! 😊 Aquí puedes abrir nuestro catálogo "
                "y revisar los productos publicados. "
                "Si necesitas elegir un kit según tu consumo, "
                "también puedes usar el cotizador."
            )

        return responder(
            payload,
            respuesta,
            [CATALOGO, COTIZADOR],
        )

    # Ayuda general.
    if contiene(
        texto,
        "ayuda",
        "ayudame",
        "que puedes hacer",
        "que haces",
        "como me puedes ayudar",
    ):
        return responder(
            payload,
            (
                "¡Con gusto! 😊 Puedo explicarte conceptos básicos "
                "de energía solar y orientarte para ver productos, "
                "cotizar un kit, revisar tus pedidos o agendar una visita. "
                "¿Qué necesitas hacer?"
            ),
            [CATALOGO, COTIZADOR, PEDIDOS, AGENDA],
        )

    # Consulta no reconocida: sin ejemplos ni botones.
    return responder(
        payload,
        (
            "Quiero ayudarte bien 😊, pero no identifiqué con claridad "
            "tu consulta. ¿Puedes darme un poco más de detalle?"
        ),
    )