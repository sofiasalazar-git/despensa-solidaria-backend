// Datos de prueba FICTICIOS (ningún dato personal real).
// Se cargan usando los mismos servicios de la API, así el historial de
// movimientos siempre coincide con el stock.
const { crearServicios } = require('../composicion');
const { hoy, sumarDias } = require('../utils/fechas');

async function sembrarDatosDePrueba(db) {
  const { productoService, movimientoService } = crearServicios(db);
  const h = hoy();

  const productos = [
    { nombre: 'Arroz', categoria: 'Granos', unidad: 'kg', stockMinimo: 10, fechaVencimiento: sumarDias(h, 180),
      movs: [['ENTRADA', 25, 'María', 'Donación de tienda del barrio'], ['SALIDA', 4, 'Carlos', 'Almuerzo del sábado']] },
    { nombre: 'Lentejas', categoria: 'Granos', unidad: 'kg', stockMinimo: 5, fechaVencimiento: sumarDias(h, 120),
      movs: [['ENTRADA', 3, 'María', 'Compra semanal']] },
    { nombre: 'Leche', categoria: 'Lácteos', unidad: 'litros', stockMinimo: 6, fechaVencimiento: sumarDias(h, 4),
      movs: [['ENTRADA', 12, 'Ana', 'Donación de vecinos']] },
    { nombre: 'Pollo', categoria: 'Carnes', unidad: 'kg', stockMinimo: 8, fechaVencimiento: sumarDias(h, 5),
      movs: [['ENTRADA', 8, 'Carlos', 'Compra para el fin de semana']] },
    { nombre: 'Zanahoria', categoria: 'Verduras', unidad: 'kg', stockMinimo: 4, fechaVencimiento: sumarDias(h, 2),
      movs: [['ENTRADA', 15, 'Ana', 'Donación de la plaza de mercado'], ['SALIDA', 5, 'María', 'Sopa del martes']] },
    { nombre: 'Atún enlatado', categoria: 'Enlatados', unidad: 'unidades', stockMinimo: 12, fechaVencimiento: sumarDias(h, 400),
      movs: [['ENTRADA', 48, 'Carlos', 'Donación de una fundación']] },
    { nombre: 'Aceite de cocina', categoria: 'Otros', unidad: 'litros', stockMinimo: 3, fechaVencimiento: sumarDias(h, 300),
      movs: [['ENTRADA', 6, 'María', 'Compra mensual']] },
    { nombre: 'Sal', categoria: 'Otros', unidad: 'kg', stockMinimo: 2, fechaVencimiento: null,
      movs: [['ENTRADA', 4, 'Ana', 'Compra mensual']] },
  ];

  for (const { movs, ...datos } of productos) {
    const creado = await productoService.crear(datos);
    for (const [tipo, cantidad, responsable, observacion] of movs) {
      await movimientoService.registrar({ productoId: creado.id, tipo, cantidad, responsable, observacion });
    }
  }

  // Un producto desactivado para demostrar que no admite movimientos
  const harina = await productoService.crear({ nombre: 'Harina de trigo', categoria: 'Granos', unidad: 'kg', stockMinimo: 2 });
  await movimientoService.registrar({ productoId: harina.id, tipo: 'ENTRADA', cantidad: 5, responsable: 'Ana', observacion: 'Carga inicial' });
  await productoService.desactivar(harina.id);
}

async function sembrarSiEstaVacia(db) {
  const total = await db.productos.countDocuments({});
  if (total > 0) return false;
  await sembrarDatosDePrueba(db);
  return true;
}

module.exports = { sembrarSiEstaVacia };
