/*
 * Endpoints de la API. Todos responden JSON.
 * Publico: catalogo. Con sesion: carrito y transacciones.
 * Con rol: vendedor (VENDEDOR/ADMIN) y panel (ASESOR/ADMIN).
 */
import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import * as carrito from '../controllers/carritoController.js';
import * as catalogo from '../controllers/catalogoController.js';
import * as reportes from '../controllers/reporteController.js';
import * as transacciones from '../controllers/transaccionController.js';
import * as vendedor from '../controllers/vendedorController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Autenticacion
router.post('/auth/login', auth.login);
router.post('/auth/registro', auth.registro);
router.get('/auth/perfil', requireAuth, auth.perfil);

// Catalogo (publico)
router.get('/catalogo/filtros', catalogo.filtros);
router.get('/vehiculos', catalogo.buscar);
router.get('/vehiculos/:id', catalogo.detalle);
router.get('/planes', catalogo.planes);

// Carrito
router.get('/carrito', requireAuth, carrito.listar);
router.post('/carrito', requireAuth, carrito.agregar);
router.delete('/carrito/:productoId', requireAuth, carrito.quitar);

// Transacciones
router.get('/transacciones', requireAuth, transacciones.misTransacciones);
router.post('/transacciones', requireAuth, transacciones.crear);
router.get('/transacciones/pendientes', requireAuth, requireRole('ASESOR', 'ADMIN'), transacciones.pendientes);
router.get('/transacciones/:id', requireAuth, transacciones.detalle);
router.post('/transacciones/:id/pagos', requireAuth, transacciones.pagar);
router.post('/transacciones/:id/cancelar', requireAuth, transacciones.cancelar);
router.post('/transacciones/:id/asesor', requireAuth, requireRole('ASESOR'), transacciones.tomarComoAsesor);

// Vendedor
const soloVendedor = [requireAuth, requireRole('VENDEDOR', 'ADMIN')];
router.get('/vendedor/vehiculos', ...soloVendedor, vendedor.misVehiculos);
router.post('/vendedor/vehiculos', ...soloVendedor, vendedor.publicar);
router.patch('/vendedor/vehiculos/:id/precio', ...soloVendedor, vendedor.actualizarPrecio);
router.patch('/vendedor/vehiculos/:id/estado', ...soloVendedor, vendedor.cambiarEstado);

// Reportes
router.get('/reportes/panel', requireAuth, requireRole('ASESOR', 'ADMIN'), reportes.panel);

export default router;
