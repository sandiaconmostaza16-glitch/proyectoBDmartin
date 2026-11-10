CREATE OR ALTER VIEW dbo.vw_ProductCatalog
AS
SELECT
    p.ProductId,
    p.ProductName,
    p.CategoryId,
    c.CategoryName,
    p.Price,
    p.Stock
FROM dbo.Products AS p
INNER JOIN dbo.Categories AS c ON c.CategoryId = p.CategoryId;
GO
