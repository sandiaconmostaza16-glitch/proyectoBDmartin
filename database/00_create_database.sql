/*
    00_create_database.sql
    Crea (o recrea) la base de datos RutaDB.
    ATENCION: si la base ya existe, se elimina con todos sus datos.
    Ejecutar conectado a la base master.
*/
USE master;
GO

IF DB_ID(N'RutaDB') IS NOT NULL
BEGIN
    ALTER DATABASE RutaDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE RutaDB;
END;
GO

CREATE DATABASE RutaDB COLLATE Modern_Spanish_CI_AS;
GO
