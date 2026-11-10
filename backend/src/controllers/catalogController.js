import { getConnection, sql } from '../config/db.js';

export async function listProducts(req, res, next) {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
      return res.status(400).json({ error: 'categoryId debe ser un entero positivo' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .query(`
        SELECT ProductId, ProductName, CategoryName, Price, Stock
        FROM dbo.vw_ProductCatalog
        WHERE @categoryId IS NULL OR CategoryId = @categoryId
        ORDER BY ProductName;
      `);

    return res.json(result.recordset);
  } catch (error) {
    return next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const { name, categoryId, price, stock } = req.body;
    if (!name || !Number.isInteger(categoryId) || categoryId <= 0 ||
        typeof price !== 'number' || price <= 0 ||
        !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: 'Datos de producto inválidos' });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('ProductName', sql.NVarChar(100), name.trim())
      .input('CategoryId', sql.Int, categoryId)
      .input('Price', sql.Decimal(10, 2), price)
      .input('Stock', sql.Int, stock)
      .execute('dbo.sp_CreateProduct');

    return res.status(201).json(result.recordset[0]);
  } catch (error) {
    return next(error);
  }
}
