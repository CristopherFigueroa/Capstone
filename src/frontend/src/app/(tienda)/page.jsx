"use client";

import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/src/components/ProductCard";
import { useState, useEffect } from "react";
import { productService } from "@/src/services/api";

const TRABAJOS_REALIZADOS = [
  { id: "slide1", src: "/trabajo-1.jpg", alt: "Instalación de paneles solares 1" },
  { id: "slide2", src: "/trabajo-2.jpg", alt: "Instalación de paneles solares 2" },
  { id: "slide3", src: "/trabajo-3.jpg", alt: "Instalación de paneles solares 3" },
];

// Mock data de trabajos realizados para el carrusel (esto sí lo dejamos por ahora)

export default function Inicio() {
  const [slideActual, setSlideActual] = useState(0);
  const [productosDestacados, setProductosDestacados] = useState([]);

  useEffect(() => {
    // 1. Carrusel automático
    const intervalo = setInterval(() => {
      setSlideActual((prev) => {
        const siguiente = (prev + 1) % TRABAJOS_REALIZADOS.length;
        const carousel = document.getElementById("carousel-proyectos");
        const elemento = document.getElementById(TRABAJOS_REALIZADOS[siguiente].id);
        
        if (carousel && elemento) {
          carousel.scrollTo({ left: elemento.offsetLeft, behavior: 'smooth' });
        }
        return siguiente;
      });
    }, 4000);

    // 2. Cargar productos desde la base de datos de forma centralizada
    let cancelado = false;
    productService.getAll()
      .then((data) => {
        if (!cancelado && Array.isArray(data)) {
          setProductosDestacados(data.slice(0, 3));
        }
      })
      .catch((err) => {
        console.warn("Backend no disponible temporalmente para productos destacados:", err?.message);
      });

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, []);

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <section className="flex flex-col md:flex-row items-stretch gap-6 md:gap-8 mb-24 min-h-112.5 md:min-h-125">
        
        {/* Resumen de la empresa */}
        <div className="order-2 md:order-1 flex-1 flex flex-col justify-center p-8 md:p-12 rounded-3xl transition-all duration-500 bg-linear-to-br from-[#09203F] to-[#00B4D8] border border-[#09203F]/50 hover:border-[#00fc82]/80 hover:shadow-[0_0_40px_rgba(0,252,130,0.25)] text-white relative overflow-hidden shadow-xl">
          
          <span className="inline-flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-wider text-[#00fc82] mb-3">
            Ahorra hoy, disfruta energía siempre
          </span>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-white drop-shadow-sm">
            Energía que Transforma tu <span className="text-[#00fc82]">Hogar</span>
          </h1>

          <p className="text-base md:text-lg font-medium mb-6 text-gray-100 leading-relaxed">
            Especialistas en instalación de sistemas solares completos con equipos de alta calidad, garantía en instalación y soporte técnico permanente.
          </p>

          {/* Beneficios clave */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[#00fc82] text-[#0F2547] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-white leading-snug">
                Ahorra en tu factura de luz
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[#00fc82] text-[#0F2547] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-white leading-snug">
                Energía limpia y renovable
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[#00fc82] text-[#0F2547] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-white leading-snug">
                Independencia y seguridad energética
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[#00fc82] text-[#0F2547] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <span className="text-sm font-bold text-white leading-snug">
                Ideal para hogares, parcelas y negocios
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link href="/catalogo" className="btn bg-[#0F2547] text-white hover:bg-[#00fc82] hover:text-[#0F2547] border border-transparent font-bold rounded-xl px-6 transition-all shadow-[0_4px_14px_0_rgba(15,37,71,0.39)] hover:shadow-[0_0_20px_rgba(0,252,130,0.5)]">
              Ver Catálogo
            </Link>
            <Link href="/cotizador" className="btn btn-outline border-[#00fc82] text-[#00fc82] hover:bg-[#00fc82] hover:text-[#0F2547] rounded-xl px-6 transition-colors backdrop-blur-sm">
              Cotizador IA
            </Link>
          </div>
        </div>
        
        {/* Carrusel del mismo tamaño exacto */}
        <div className="order-1 md:order-2 flex-1 relative rounded-3xl overflow-hidden shadow-2xl group h-80 md:h-auto border border-gray-200/50 hover:border-[#00B4D8]/80 hover:shadow-[0_0_40px_rgba(0,180,216,0.25)] transition-all duration-500">
          <div className="absolute top-0 left-0 w-full p-6 bg-linear-to-b from-[#09203F]/80 to-transparent z-10 pointer-events-none">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg tracking-wide">
              Proyectos Recientes
            </h2>
          </div>
          
          <div id="carousel-proyectos" className="carousel absolute inset-0 w-full h-full">
            {TRABAJOS_REALIZADOS.map((trabajo) => (
              <div key={trabajo.id} id={trabajo.id} className="carousel-item w-full h-full relative">
                <div className="absolute inset-0 bg-[#09203F]/10 group-hover:bg-transparent transition-colors duration-700 z-10 pointer-events-none"></div> 
                <Image
                  src={trabajo.src}
                  alt={trabajo.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
            ))}
          </div>
          
          <div className="absolute bottom-6 left-0 w-full flex justify-center gap-3 z-10 pointer-events-none">
            {TRABAJOS_REALIZADOS.map((trabajo, index) => (
              <button 
                key={`btn-${trabajo.id}`} 
                onClick={(e) => {
                  e.preventDefault();
                  setSlideActual(index);
                  const carousel = document.getElementById("carousel-proyectos");
                  const target = document.getElementById(trabajo.id);
                  if (carousel && target) {
                    carousel.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
                  }
                }}
                className={`btn btn-sm btn-circle backdrop-blur-md border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all pointer-events-auto ${slideActual === index ? "bg-[#00fc82] text-[#0F2547]" : "bg-black/40 text-white hover:bg-[#00fc82] hover:text-[#0F2547]"}`}
                aria-label={`Ver proyecto ${index + 1}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </section>
      {/* Sección: Cómo funciona la IA */}
      <section className="mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F2547] mb-4">
            ¿Cómo funciona nuestro Cotizador Solar con IA?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Nuestro modelo de Machine Learning (KNN) calcula la potencia que necesitas y te recomienda el kit solar ideal en 3 simples pasos.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Paso 1 */}
          <div className="bg-linear-to-br from-[#09203F] to-[#00B4D8] p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-all duration-300 text-center relative overflow-hidden group border border-[#09203F]/50">
            <div className="absolute inset-0 bg-linear-to-tr from-[#00fc82]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="w-16 h-16 bg-white/10 text-[#00fc82] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg backdrop-blur-md border border-white/10 group-hover:border-[#00fc82]/50 transition-colors relative z-10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3 relative z-10">1. Ingresa tus Datos</h3>
            <p className="text-gray-200 relative z-10">
              Indica tu consumo mensual en kWh, tu comuna, el tipo de sistema (On-Grid, Híbrido u Off-Grid) y opcionalmente tu presupuesto o superficie.
            </p>
          </div>
          
          {/* Paso 2 */}
          <div className="bg-linear-to-br from-[#09203F] to-[#00B4D8] p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-all duration-300 text-center relative overflow-hidden group border border-[#09203F]/50">
            <div className="absolute inset-0 bg-linear-to-tr from-[#00fc82]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="w-16 h-16 bg-white/10 text-[#00fc82] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg backdrop-blur-md border border-white/10 group-hover:border-[#00fc82]/50 transition-colors relative z-10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3 relative z-10">2. Dimensionamiento KNN</h3>
            <p className="text-gray-200 relative z-10">
              El modelo clasifica tu requerimiento según las horas solares pico (HSP), calculando la potencia en kWp, número de paneles y generación mensual.
            </p>
          </div>
          
          {/* Paso 3 */}
          <div className="bg-linear-to-br from-[#09203F] to-[#00B4D8] p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-all duration-300 text-center relative overflow-hidden group border border-[#09203F]/50">
            <div className="absolute inset-0 bg-linear-to-tr from-[#00fc82]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="w-16 h-16 bg-white/10 text-[#00fc82] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg backdrop-blur-md border border-white/10 group-hover:border-[#00fc82]/50 transition-colors relative z-10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3 relative z-10">3. Recibe y Guarda tu Cotización</h3>
            <p className="text-gray-200 relative z-10">
              Obtén al instante el kit disponible en catálogo que mejor se adapta a tus restricciones, guárdalo en tu historial y añádelo directo al carrito.
            </p>
          </div>
        </div>
        
        <div className="flex justify-center mt-12">
          <Link href="/cotizador" className="btn bg-[#0F2547] text-white hover:bg-[#00fc82] hover:text-[#0F2547] border-none font-bold rounded-full px-10 py-3 shadow-[0_4px_14px_0_rgba(15,37,71,0.39)] hover:shadow-[0_0_25px_rgba(0,252,130,0.6)] transition-all h-auto">
            <span className="flex items-center gap-2">
              Calcular mi Kit Solar ahora →
            </span>
          </Link>
        </div>
      </section>


      <section className="mb-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F2547] mb-4">Productos Destacados</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Equipos de alta eficiencia seleccionados para brindarte el mejor rendimiento en tu instalación solar.
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {productosDestacados.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
        
        <div className="flex justify-center mt-12">
          <Link href="/catalogo" className="btn bg-[#0F2547] text-white hover:bg-[#00fc82] hover:text-[#0F2547] border-none font-bold px-10 py-3 rounded-full shadow-[0_4px_14px_0_rgba(15,37,71,0.39)] hover:shadow-[0_0_25px_rgba(0,252,130,0.6)] transition-all h-auto">
            Ver todo el catálogo →
          </Link>
        </div>
      </section>
      
    </main>
  );
}