INSERT INTO dbo.Categories (CategoryName)
VALUES (N'General'), (N'Oficina');

INSERT INTO dbo.Products (ProductName, CategoryId, Price, Stock)
SELECT N'Producto de ejemplo', CategoryId, 100.00, 10
FROM dbo.Categories
WHERE CategoryName = N'General';
