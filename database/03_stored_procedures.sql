CREATE OR ALTER PROCEDURE dbo.sp_CreateProduct
    @ProductName NVARCHAR(100),
    @CategoryId INT,
    @Price DECIMAL(10, 2),
    @Stock INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NULLIF(LTRIM(RTRIM(@ProductName)), '') IS NULL
        THROW 50001, 'El nombre del producto es obligatorio.', 1;
    IF @Price <= 0 OR @Stock < 0
        THROW 50002, 'El precio o stock no son válidos.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE CategoryId = @CategoryId)
        THROW 50003, 'La categoría no existe.', 1;

    INSERT INTO dbo.Products (ProductName, CategoryId, Price, Stock)
    OUTPUT INSERTED.ProductId, INSERTED.ProductName, INSERTED.CategoryId,
           INSERTED.Price, INSERTED.Stock
    VALUES (LTRIM(RTRIM(@ProductName)), @CategoryId, @Price, @Stock);
END;
GO
