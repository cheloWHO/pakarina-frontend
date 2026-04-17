// ── AGREGAR ESTAS RUTAS AL BACKEND (pakarina-api) ──────────────────────────
// Crear los siguientes archivos en src/routes/ y src/controllers/

// ─────────────────────────────────────────────────────────
// src/routes/servicios.routes.js
// ─────────────────────────────────────────────────────────
/*
const router = require('express').Router();
const { pool } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/servicios
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM servicios WHERE activo = 1 ORDER BY tipo, precio'
    );
    res.json(rows);
  } catch(err) { next(err); }
});

module.exports = router;
*/

// ─────────────────────────────────────────────────────────
// src/routes/grupos.routes.js
// ─────────────────────────────────────────────────────────
/*
const router = require('express').Router();
const { pool } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// GET /api/grupos
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM grupos WHERE activo = 1 ORDER BY id'
    );
    res.json(rows);
  } catch(err) { next(err); }
});

module.exports = router;
*/

// ─────────────────────────────────────────────────────────
// src/routes/inventario.routes.js
// ─────────────────────────────────────────────────────────
/*
const router   = require('express').Router();
const { pool } = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken, requireAdmin);

// GET /api/inventario/stock
router.get('/stock', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, p.nombre, p.precio_venta, p.stock_minimo
       FROM inventario i
       JOIN productos p ON p.id = i.producto_id
       ORDER BY p.nombre, i.ubicacion`
    );
    res.json(rows);
  } catch(err) { next(err); }
});

// GET /api/inventario/productos
router.get('/productos', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM productos WHERE activo = 1 ORDER BY nombre'
    );
    res.json(rows);
  } catch(err) { next(err); }
});

// GET /api/inventario/alertas
router.get('/alertas', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM v_stock_alertas WHERE alerta_stock = 1');
    res.json(rows);
  } catch(err) { next(err); }
});

// POST /api/inventario/movimientos
// Registra entrada, transferencia o ajuste y actualiza stock
router.post('/movimientos', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const {
      producto_id, usuario_id, tipo,
      cantidad, local_origen_id, local_destino_id, nota,
    } = req.body;

    // Insertar movimiento
    await conn.query(
      `INSERT INTO movimientos_inventario
         (producto_id, usuario_id, local_origen_id, local_destino_id, cantidad, tipo, nota)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [producto_id, req.user.id, local_origen_id || null,
       local_destino_id || null, cantidad, tipo, nota || null]
    );

    // Actualizar stock según tipo
    if (tipo === 'entrada_proveedor') {
      // Suma a bodega (ubicacion='bodega', local_id=NULL)
      await conn.query(
        `UPDATE inventario SET cantidad = cantidad + ?
         WHERE producto_id = ? AND ubicacion = 'bodega'`,
        [cantidad, producto_id]
      );
    } else if (tipo === 'transferencia') {
      // Resta de bodega, suma al local destino
      await conn.query(
        `UPDATE inventario SET cantidad = cantidad - ?
         WHERE producto_id = ? AND ubicacion = 'bodega'`,
        [cantidad, producto_id]
      );
      const ubicDest = local_destino_id === 1 ? 'villaflora' : 'florida';
      await conn.query(
        `UPDATE inventario SET cantidad = cantidad + ?
         WHERE producto_id = ? AND ubicacion = ?`,
        [cantidad, producto_id, ubicDest]
      );
    } else if (tipo === 'ajuste') {
      // Ajuste manual en bodega
      await conn.query(
        `UPDATE inventario SET cantidad = ?
         WHERE producto_id = ? AND ubicacion = 'bodega'`,
        [cantidad, producto_id]
      );
    }

    await conn.commit();
    res.status(201).json({ ok: true });
  } catch(err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
*/

// ─────────────────────────────────────────────────────────
// AGREGAR en src/index.js (después de las rutas existentes):
// ─────────────────────────────────────────────────────────
/*
app.use('/api/servicios',   require('./routes/servicios.routes'));
app.use('/api/grupos',      require('./routes/grupos.routes'));
app.use('/api/inventario',  require('./routes/inventario.routes'));
*/
