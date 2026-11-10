CREATE TABLE Categories (
    CategoryId INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Products (
    ProductId INT IDENTITY(1,1) PRIMARY KEY,
    ProductName NVARCHAR(100) NOT NULL,
    CategoryId INT NOT NULL,
    Price DECIMAL(10, 2) NOT NULL CHECK (Price > 0),
    Stock INT NOT NULL CHECK (Stock >= 0),
    CONSTRAINT FK_Products_Categories
        FOREIGN KEY (CategoryId) REFERENCES Categories(CategoryId)
);
