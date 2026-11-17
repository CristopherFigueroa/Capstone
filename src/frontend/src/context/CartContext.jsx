"use client";

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAlert } from './AlertContext';

const CartContext = createContext();

const obtenerUsuarioToken = () => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const payload = JSON.parse(window.atob(base64));
    return payload?.sub || null;
  } catch {
    return null;
  }
};

export function CartProvider({ children }) {
  const [carrito, setCarrito] = useState([]);
  const [montado, setMontado] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { mostrarAlerta } = useAlert();

  const abrirCarrito = useCallback(() => setIsCartOpen(true), []);
  const cerrarCarrito = useCallback(() => setIsCartOpen(false), []);

  // Cargar y sincronizar el carrito según el usuario autenticado
  useEffect(() => {
    const sincronizarSesion = () => {
      try {
        const usuarioActual = obtenerUsuarioToken();
        const propietarioGuardado = localStorage.getItem("carrito-anglo-owner");

        // Si se cerró sesión o cambió a un usuario distinto, vaciamos el carrito anterior
        if (
          !usuarioActual ||
          (propietarioGuardado && propietarioGuardado !== usuarioActual)
        ) {
          localStorage.removeItem("carrito-anglo");
          if (usuarioActual) {
            localStorage.setItem("carrito-anglo-owner", usuarioActual);
          } else {
            localStorage.removeItem("carrito-anglo-owner");
          }
          setCarrito([]);
          setMontado(true);
          return;
        }

        localStorage.setItem("carrito-anglo-owner", usuarioActual);
        const carritoGuardado = localStorage.getItem("carrito-anglo");
        if (carritoGuardado) {
          setCarrito(JSON.parse(carritoGuardado));
        } else {
          setCarrito([]);
        }
      } catch (error) {
        console.error("Error cargando carrito:", error);
      }
      setMontado(true);
    };

    queueMicrotask(sincronizarSesion);
    window.addEventListener("auth-change", sincronizarSesion);
    return () => {
      window.removeEventListener("auth-change", sincronizarSesion);
    };
  }, []);

  // Guardar en localStorage cada vez que cambia el carrito
  useEffect(() => {
    if (montado) {
      const usuarioActual = obtenerUsuarioToken();
      if (usuarioActual) {
        localStorage.setItem("carrito-anglo-owner", usuarioActual);
      }
      localStorage.setItem('carrito-anglo', JSON.stringify(carrito));
    }
  }, [carrito, montado]);

  const agregarAlCarrito = useCallback((producto, cantidad = 1) => {
    setCarrito((prev) => {
      const index = prev.findIndex((item) => item.id === producto.id);
      if (index !== -1) {
        // Si ya existe, sumamos la cantidad
        const nuevoCarrito = [...prev];
        nuevoCarrito[index].cantidad += cantidad;
        return nuevoCarrito;
      }
      // Si es nuevo, lo añadimos
      const imagenFinal = producto.imagen_url || producto.imagen || "/panel-solar.png";
      return [
        ...prev,
        {
          ...producto,
          imagen_url: imagenFinal,
          imagen: imagenFinal,
          cantidad,
        },
      ];
    });
    
    mostrarAlerta(`${cantidad} x ${producto.nombre} añadido al carrito`, 'success');
  }, [mostrarAlerta]);

  const eliminarDelCarrito = useCallback((idProducto) => {
    setCarrito((prev) => prev.filter((item) => item.id !== idProducto));
    mostrarAlerta('Producto eliminado del carrito', 'error'); // error rojo por probar
  }, [mostrarAlerta]);

  const vaciarCarrito = useCallback(() => {
    setCarrito([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem('carrito-anglo');
    }
  }, []);

  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <CartContext.Provider value={{ 
      carrito, 
      agregarAlCarrito, 
      eliminarDelCarrito, 
      vaciarCarrito, 
      totalItems,
      isCartOpen,
      setIsCartOpen,
      abrirCarrito,
      cerrarCarrito,
      montado
    }}>
      {children}
    </CartContext.Provider>
  );
}

// Hook personalizado
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
};
