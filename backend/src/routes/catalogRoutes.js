import { Router } from 'express';
import { createProduct, listProducts } from '../controllers/catalogController.js';

const router = Router();

router.get('/products', listProducts);
router.post('/products', createProduct);

export default router;
