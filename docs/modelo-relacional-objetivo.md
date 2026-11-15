# Modelo relacional objetivo

Diagrama ER del esquema definido en
[`database/05_schema_vehiculos_objetivo.sql`](../database/05_schema_vehiculos_objetivo.sql).
Cada transaccion representa la compra de un unico vehiculo.
`Ubicacion` agrupa ciudad y provincia; modelo y combustible son atributos de `Producto`.

```mermaid
erDiagram
    MARCA ||--o{ PRODUCTO : identifica
    CATEGORIA ||--o{ PRODUCTO : clasifica
    UBICACION ||--o{ PRODUCTO : ubica
    USUARIO ||--o{ PRODUCTO : publica

    USUARIO ||--o{ TRANSACCION : compra
    USUARIO ||--o{ TRANSACCION : vende
    USUARIO o|--o{ TRANSACCION : asesora
    PRODUCTO ||--o{ TRANSACCION : se_vende_en
    PLAN_FINANCIACION o|--o{ TRANSACCION : financia

    TRANSACCION ||--o{ PAGO : registra
    TRANSACCION ||--o{ LOGISTICA : coordina
    EMPLEADO o|--o{ LOGISTICA : gestiona
    UBICACION o|--o{ LOGISTICA : origen
    UBICACION o|--o{ LOGISTICA : destino

    PRODUCTO ||--o{ IMAGEN : muestra
    PRODUCTO ||--o| AUTO_INFO_VENDEDOR : describe
    PRODUCTO ||--o{ AUTO_REVISION : inspecciona
    PRODUCTO ||--o{ HISTORIAL_PRECIO : registra
    USUARIO ||--o{ CARRITO_ITEM : agrega
    PRODUCTO ||--o{ CARRITO_ITEM : contiene
    USUARIO o|--o| EMPLEADO : puede_ser

    USUARIO {
        int UsuarioId PK
        string Nombre
        string Apellido
        string Rut UK
        string Email UK
        string PasswordHash
        string Rol
        boolean Estado
    }

    UBICACION {
        int UbicacionId PK
        string Provincia
        string Ciudad
    }

    MARCA {
        int MarcaId PK
        string Nombre UK
    }

    CATEGORIA {
        int CategoriaId PK
        string Nombre UK
    }

    PRODUCTO {
        int ProductoId PK
        int UsuarioVendedorId FK
        int MarcaId FK
        int CategoriaId FK
        int UbicacionId FK
        string Modelo
        string Combustible
        string Patente UK
        string Vin UK
        smallint Anio
        int Kilometraje
        decimal Precio
        string Estado
    }

    PLAN_FINANCIACION {
        int PlanId PK
        string Nombre UK
        smallint CantidadCuotas
        decimal TasaMensual
        boolean Activo
    }

    TRANSACCION {
        int TransaccionId PK
        int UsuarioCompradorId FK
        int UsuarioVendedorId FK
        int AsesorUsuarioId FK
        int ProductoId FK
        int PlanId FK
        datetime Fecha
        decimal Monto
        string Estado
    }

    PAGO {
        int PagoId PK
        int TransaccionId FK
        string Proveedor
        string TokenTransbank
        string OrdenCompra UK
        decimal Monto
        string CodigoAutorizacion
        string TipoPago
        string EstadoPago
    }

    IMAGEN {
        int ImagenId PK
        int ProductoId FK
        string UrlImagen
        boolean EsPrincipal
        smallint Orden
    }

    AUTO_INFO_VENDEDOR {
        int InfoVendedorId PK
        int ProductoId FK, UK
        string MotivoVenta
        smallint DuenosAnteriores
        string Mantenciones
        string Comentarios
    }

    AUTO_REVISION {
        int RevisionId PK
        int ProductoId FK
        boolean TieneChoques
        string DetalleDanos
        boolean PapelesAlDia
        boolean RevisionTecnicaOk
        string Observaciones
        datetime FechaRevision
    }

    EMPLEADO {
        int EmpleadoId PK
        int UsuarioId FK, UK
        string Nombre
        string Rut UK
        string Email UK
        string Cargo
        boolean Activo
    }

    LOGISTICA {
        int LogisticaId PK
        int TransaccionId FK
        int EmpleadoId FK
        int UbicacionOrigenId FK
        int UbicacionDestinoId FK
        string DireccionOrigen
        string DireccionDestino
        datetime FechaProgramada
        datetime FechaReal
        string EstadoLogistica
    }

    HISTORIAL_PRECIO {
        int HistorialId PK
        int ProductoId FK
        decimal PrecioAnterior
        decimal PrecioNuevo
        datetime FechaCambio
    }

    CARRITO_ITEM {
        int UsuarioId PK, FK
        int ProductoId PK, FK
        datetime FechaAgregada
    }
```

## Cómo visualizarlo

- **VS Code:** abre este archivo y usa la vista previa de Markdown (`Ctrl+Shift+V`). Si Mermaid no se renderiza, instala la extensión **Markdown Preview Mermaid Support**.
- **GitHub:** abre este archivo en el repositorio; GitHub renderiza los bloques Mermaid en Markdown.
- **SQL Server Management Studio:** ejecuta primero el DDL en una base de datos y crea un diagrama desde **Database Diagrams**. Ese diagrama se genera en SSMS; no está guardado como imagen en este repositorio.

El diagrama es una vista de las relaciones y claves principales. Para ver todos los tipos, restricciones e índices, consulta el DDL enlazado arriba.
