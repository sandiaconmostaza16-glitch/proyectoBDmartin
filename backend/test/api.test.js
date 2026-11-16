/*
 * Pruebas de integracion de la API contra SQL Server real.
 * Recrea la base (00 -> 04) antes y despues, asi que necesita el .env
 * configurado y SQL Server corriendo.
 *
 *   pnpm test
 *
 * Cubre: casos normales, casos limite, errores de validacion, permisos,
 * conflictos de estado e intento de inyeccion SQL.
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import app from '../src/app.js';
import { closeConnection } from '../src/config/db.js';
import { initDatabase } from '../scripts/init-db.js';

let server;
let baseUrl;
const tokens = {};

async function api(method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, data: await response.json() };
}

async function login(email) {
  const { data } = await api('POST', '/auth/login', { body: { email, password: 'ruta123' } });
  return data.token;
}

before(async () => {
  await initDatabase({ quiet: true });
  server = app.listen(0);
  baseUrl = `http://localhost:${server.address().port}`;
  tokens.cliente = await login('demo@ruta.cl');
  tokens.cliente2 = await login('javiera@ruta.cl');
  tokens.vendedor = await login('vendedor@ruta.cl');
  tokens.asesor = await login('asesor@ruta.cl');
  tokens.admin = await login('admin@ruta.cl');
});

after(async () => {
  server?.close();
  await closeConnection();
  await initDatabase({ quiet: true });
});

describe('Catalogo', () => {
  test('lista vehiculos disponibles con paginacion', async () => {
    const { status, data } = await api('GET', '/vehiculos?tamanoPagina=5');
    assert.equal(status, 200);
    assert.equal(data.total, 28);
    assert.equal(data.vehiculos.length, 5);
    assert.ok(data.vehiculos.every((v) => v.CuotaReferencia > 0));
  });

  test('filtra por categoria y rango de precio', async () => {
    const { data } = await api('GET', '/vehiculos?categoriaId=1&precioMax=20000000&orden=precio_asc');
    assert.ok(data.vehiculos.length > 0);
    assert.ok(data.vehiculos.every((v) => v.Categoria === 'SUV' && v.Precio <= 20000000));
    const precios = data.vehiculos.map((v) => v.Precio);
    assert.deepEqual(precios, [...precios].sort((a, b) => a - b));
  });

  test('limite: pagina fuera de rango devuelve lista vacia', async () => {
    const { status, data } = await api('GET', '/vehiculos?pagina=99');
    assert.equal(status, 200);
    assert.equal(data.vehiculos.length, 0);
  });

  test('inyeccion SQL en la busqueda se trata como texto', async () => {
    const { status, data } = await api('GET', `/vehiculos?q=${encodeURIComponent("' OR 1=1; DROP TABLE dbo.Producto;--")}`);
    assert.equal(status, 200);
    assert.equal(data.total, 0);
    const despues = await api('GET', '/vehiculos');
    assert.equal(despues.data.total, 28);
  });

  test('error: rango de precio invertido (validado por el SP)', async () => {
    const { status, data } = await api('GET', '/vehiculos?precioMin=30000000&precioMax=1000');
    assert.equal(status, 400);
    assert.equal(data.code, 51003);
  });

  test('error: parametro no numerico', async () => {
    const { status } = await api('GET', '/vehiculos?marcaId=abc');
    assert.equal(status, 400);
  });

  test('detalle con imagenes, historial de precio y planes', async () => {
    const { status, data } = await api('GET', '/vehiculos/13');
    assert.equal(status, 200);
    assert.equal(data.Modelo, 'Hilux');
    assert.equal(data.historialPrecios.length, 2);
    assert.equal(data.BajoDePrecio, true);
    assert.equal(data.planes.length, 4);
  });

  test('error: vehiculo inexistente', async () => {
    const { status } = await api('GET', '/vehiculos/9999');
    assert.equal(status, 404);
  });
});

describe('Autenticacion', () => {
  test('rechaza contrasena incorrecta', async () => {
    const { status } = await api('POST', '/auth/login', { body: { email: 'demo@ruta.cl', password: 'otra' } });
    assert.equal(status, 401);
  });

  test('rechaza cuenta inactiva', async () => {
    const { status } = await api('POST', '/auth/login', { body: { email: 'tomas@ruta.cl', password: 'ruta123' } });
    assert.equal(status, 403);
  });

  test('registro: correo duplicado', async () => {
    const { status, data } = await api('POST', '/auth/registro', {
      body: { nombre: 'Ana', apellido: 'Lagos', email: 'DEMO@ruta.cl', password: '123456' }
    });
    assert.equal(status, 409);
    assert.equal(data.code, 54101);
  });

  test('registro: no permite auto-asignarse ADMIN', async () => {
    const { status } = await api('POST', '/auth/registro', {
      body: { nombre: 'Ana', apellido: 'Lagos', email: 'ana@ruta.cl', password: '123456', rol: 'ADMIN' }
    });
    assert.equal(status, 400);
  });

  test('ruta protegida sin token', async () => {
    const { status } = await api('GET', '/carrito');
    assert.equal(status, 401);
  });
});

describe('Flujo de compra', () => {
  let transaccionId;

  test('agrega al carrito y rechaza duplicados', async () => {
    const ok = await api('POST', '/carrito', { token: tokens.cliente, body: { productoId: 1 } });
    assert.equal(ok.status, 201);
    const repetido = await api('POST', '/carrito', { token: tokens.cliente, body: { productoId: 1 } });
    assert.equal(repetido.status, 409);
  });

  test('no se puede agregar un vehiculo propio ni uno reservado', async () => {
    const propio = await api('POST', '/carrito', { token: tokens.vendedor, body: { productoId: 1 } });
    assert.equal(propio.status, 409);
    const reservado = await api('POST', '/carrito', { token: tokens.cliente, body: { productoId: 17 } });
    assert.equal(reservado.status, 409);
  });

  test('crea la transaccion: reserva el vehiculo y lo saca de los carritos', async () => {
    await api('POST', '/carrito', { token: tokens.cliente2, body: { productoId: 1 } });
    const { status, data } = await api('POST', '/transacciones', {
      token: tokens.cliente,
      body: { productoId: 1, planId: 2, direccionEntrega: 'Los Leones 789', ubicacionDestinoId: 1 }
    });
    assert.equal(status, 201);
    assert.equal(data.Estado, 'PENDIENTE');
    assert.equal(data.EstadoVehiculo, 'RESERVADO');
    assert.equal(data.Monto, 24990000);
    transaccionId = data.TransaccionId;

    const carritoOtro = await api('GET', '/carrito', { token: tokens.cliente2 });
    assert.ok(!carritoOtro.data.some((item) => item.ProductoId === 1));
  });

  test('error: otro comprador no puede comprar el mismo vehiculo', async () => {
    const { status, data } = await api('POST', '/transacciones', {
      token: tokens.cliente2, body: { productoId: 1, direccionEntrega: 'Barros Arana 321' }
    });
    assert.equal(status, 409);
    assert.equal(data.code, 54502);
  });

  test('error: direccion demasiado corta', async () => {
    const { status } = await api('POST', '/transacciones', {
      token: tokens.cliente, body: { productoId: 2, direccionEntrega: 'abc' }
    });
    assert.equal(status, 400);
  });

  test('error: otro usuario no puede pagar la transaccion', async () => {
    const { status } = await api('POST', `/transacciones/${transaccionId}/pagos`, {
      token: tokens.cliente2, body: { tipoPago: 'CREDITO' }
    });
    assert.equal(status, 403);
  });

  test('pago rechazado deja la transaccion pendiente', async () => {
    const { status, data } = await api('POST', `/transacciones/${transaccionId}/pagos`, {
      token: tokens.cliente, body: { tipoPago: 'CREDITO', simularRechazo: true }
    });
    assert.equal(status, 201);
    assert.equal(data.EstadoPago, 'RECHAZADO');
    assert.equal(data.EstadoTransaccion, 'PENDIENTE');
  });

  test('pago autorizado: transaccion pagada y vehiculo vendido', async () => {
    const { data } = await api('POST', `/transacciones/${transaccionId}/pagos`, {
      token: tokens.cliente, body: { tipoPago: 'CREDITO' }
    });
    assert.equal(data.EstadoPago, 'AUTORIZADO');
    assert.equal(data.EstadoTransaccion, 'PAGADA');

    const detalle = await api('GET', `/transacciones/${transaccionId}`, { token: tokens.cliente });
    assert.equal(detalle.data.EstadoVehiculo, 'VENDIDO');
    assert.equal(detalle.data.pagos.length, 2);
  });

  test('error: no se puede pagar dos veces', async () => {
    const { status } = await api('POST', `/transacciones/${transaccionId}/pagos`, {
      token: tokens.cliente, body: { tipoPago: 'CREDITO' }
    });
    assert.equal(status, 409);
  });

  test('cancelar una pendiente libera el vehiculo', async () => {
    const { status } = await api('POST', '/transacciones/5/cancelar', { token: tokens.cliente2 });
    assert.equal(status, 200);
    const vehiculo = await api('GET', '/vehiculos/17');
    assert.equal(vehiculo.data.Estado, 'DISPONIBLE');
  });
});

describe('Vendedor', () => {
  test('publica un vehiculo (patente normalizada)', async () => {
    const { status, data } = await api('POST', '/vendedor/vehiculos', {
      token: tokens.vendedor,
      body: {
        marcaId: 1, categoriaId: 2, ubicacionId: 1, modelo: 'Corolla', combustible: 'Bencina',
        anio: 2022, patente: 'gh-jk-12', kilometraje: 15000, transmision: 'CVT', precio: 15990000,
        urlImagen: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900'
      }
    });
    assert.equal(status, 201);
    assert.equal(data.Patente, 'GHJK12');
  });

  test('error: patente duplicada', async () => {
    const { status, data } = await api('POST', '/vendedor/vehiculos', {
      token: tokens.vendedor,
      body: {
        marcaId: 1, categoriaId: 2, ubicacionId: 1, modelo: 'Corolla', combustible: 'Bencina',
        anio: 2022, patente: 'GHJK12', kilometraje: 15000, transmision: 'CVT', precio: 15990000
      }
    });
    assert.equal(status, 409);
    assert.equal(data.code, 54201);
  });

  test('error: un cliente no puede publicar', async () => {
    const { status } = await api('POST', '/vendedor/vehiculos', { token: tokens.cliente, body: {} });
    assert.equal(status, 403);
  });

  test('cambia el precio y queda en el historial', async () => {
    const { status } = await api('PATCH', '/vendedor/vehiculos/2/precio', { token: tokens.vendedor, body: { precio: 21000000 } });
    assert.equal(status, 200);
    const detalle = await api('GET', '/vehiculos/2');
    assert.equal(detalle.data.historialPrecios[0].PrecioNuevo, 21000000);
    assert.equal(detalle.data.BajoDePrecio, true);
  });

  test('error: no puede cambiar el precio de un vehiculo ajeno', async () => {
    const { status } = await api('PATCH', '/vendedor/vehiculos/3/precio', { token: tokens.vendedor, body: { precio: 21000000 } });
    assert.equal(status, 403);
  });

  test('limite: rebaja de mas del 50% se rechaza', async () => {
    const { status, data } = await api('PATCH', '/vendedor/vehiculos/4/precio', { token: tokens.vendedor, body: { precio: 10000000 } });
    assert.equal(status, 400);
    assert.equal(data.code, 51302);
  });

  test('pausar saca el vehiculo del catalogo', async () => {
    const { status } = await api('PATCH', '/vendedor/vehiculos/9/estado', { token: tokens.vendedor, body: { estado: 'PAUSADO' } });
    assert.equal(status, 200);
    const { data } = await api('GET', '/vehiculos?q=sentra');
    assert.equal(data.total, 0);
  });
});

describe('Asesor y reportes', () => {
  test('el asesor ve las pendientes y toma una', async () => {
    const pendientes = await api('GET', '/transacciones/pendientes', { token: tokens.asesor });
    assert.equal(pendientes.status, 200);
    assert.ok(pendientes.data.some((t) => t.PorVencer));
    const { status, data } = await api('POST', '/transacciones/6/asesor', { token: tokens.asesor });
    assert.equal(status, 200);
    assert.equal(data.Asesor, 'Carla Soto');
  });

  test('error: un cliente no ve el panel', async () => {
    const { status } = await api('GET', '/reportes/panel', { token: tokens.cliente });
    assert.equal(status, 403);
  });

  test('panel con resumen y ventas por marca', async () => {
    const { status, data } = await api('GET', '/reportes/panel', { token: tokens.admin });
    assert.equal(status, 200);
    assert.ok(data.resumen.Ventas >= 3);
    assert.ok(data.ventasPorMarca.length > 0);
  });
});
