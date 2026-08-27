# Estándar de trabajo con Git

Esta guía define las convenciones mínimas para mantener el trabajo del equipo ordenado y fácil de revisar.

## 1. Reglas generales

- Todo cambio debe relacionarse con una tarea o issue.
- No se realizan cambios directos en `main` ni `develop`.
- Cada rama debe atender un solo objetivo.
- Todo cambio debe ingresar mediante un Pull Request.
- No se deben subir credenciales, archivos `.env` ni datos sensibles.
- El código debe compilar y superar las pruebas antes del merge.

## 2. Ramas principales

| Rama | Uso |
| --- | --- |
| `main` | Versión estable y entregable |
| `develop` | Integración de los cambios del equipo |

Las ramas de trabajo se crean desde `develop` y regresan a `develop` mediante Pull Request. Los `hotfix` se crean desde `main`.

## 3. Nombres de ramas

### Formato

```text
<tipo>-<grupo>-<descripcion>
```

Ejemplos:

```text
feature-g01-user-login
fix-g02-email-validation
docs-g01-api-guide
```

### Tipos permitidos

| Tipo | Uso |
| --- | --- |
| `feature` | Nueva funcionalidad |
| `fix` | Corrección |
| `hotfix` | Corrección urgente en `main` |
| `refactor` | Reestructuración sin cambiar el comportamiento |
| `docs` | Documentación |
| `test` | Pruebas |
| `chore` | Configuración o mantenimiento |

### Reglas

- Usar minúsculas.
- Separar las palabras con guiones.
- No usar espacios, tildes ni caracteres especiales.
- Usar el identificador acordado para el grupo, por ejemplo `g01`.
- Mantener la descripción breve y clara.

## 4. Commits

### Formato

```text
<tipo>(<modulo>): <descripcion>
```

Ejemplos:

```text
feat(auth): add user login
fix(users): prevent duplicate emails
docs(api): update endpoint documentation
test(auth): add login validation tests
```

Tipos principales:

- `feat`: nueva funcionalidad.
- `fix`: corrección.
- `docs`: documentación.
- `refactor`: reorganización del código.
- `test`: pruebas.
- `chore`: configuración o mantenimiento.

La descripción debe comenzar con un verbo, escribirse en minúscula y no terminar con punto. Cada commit debe representar un cambio lógico.

## 5. Pull Requests

### Título

```text
<tipo>(<modulo>): <descripcion> [<grupo>]
```

Ejemplo:

```text
feat(auth): implement user login [g01]
```

### Plantilla

Este contenido puede copiarse en `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Description

Describa brevemente el propósito del Pull Request.

## Related Issue

- Issue ID:
- Group ID:

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactor
- [ ] Tests
- [ ] Configuration

## What Was Done?

-
-

## Testing

Indique brevemente cómo se verificaron los cambios.

## Additional Notes

Agregue riesgos, limitaciones o trabajo pendiente. Escriba `None` si no aplica.

## Checklist

- [ ] El cambio cumple los criterios de aceptación.
- [ ] El proyecto compila y las pruebas pasan.
- [ ] Revisé mis propios cambios.
- [ ] No incluí credenciales ni información sensible.
```

## 6. Formato breve para tareas o issues

```markdown
# Título de la tarea

## Group

g01

## Objective

Describa el resultado esperado.

## Acceptance Criteria

- [ ]
- [ ]

## Dependencies

Indique dependencias o escriba `None`.
```

## 7. Flujo de trabajo

1. Crear o asignarse una tarea.
2. Crear una rama desde `develop`.
3. Implementar el cambio y realizar commits claros.
4. Ejecutar las pruebas.
5. Abrir un Pull Request hacia `develop`.
6. Atender la revisión y obtener al menos una aprobación.
7. Integrar mediante **Squash and merge** y eliminar la rama.

## 8. Requisitos para realizar el merge

- El Pull Request está completo.
- Se cumplen los criterios de aceptación.
- El proyecto compila y las pruebas pasan.
- No existen conversaciones pendientes.
- Hay al menos una aprobación.
- La rama está actualizada con la rama de destino.

### Ejemplo completo

```text
Branch: feature-g01-user-login
Commit: feat(auth): add user login
PR:     feat(auth): implement user login [g01]
Target: develop
```
