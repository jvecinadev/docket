# Database Documentation

## Overview

This directory contains the database documentation and Entity-Relationship Diagram (ERD) for the application.

The database schema is defined using Prisma ORM with PostgreSQL. The ERD provides a visual representation of the database entities, their attributes, constraints, and relationships.

## Files

| File | Description |
|---|---|
| `schema.dbml` | DBML source code used to generate the ERD |
| `../../prisma/schema.prisma` | Prisma schema defining the database models and relationships |

## Database Architecture

The database is organized around the following areas:

- **User Management** — user accounts, sessions, email verification, and password resets.
- **Workspace Management** — workspaces, memberships, roles, and versioned schemas.
- **Document Processing** — uploaded documents, extracted text, extraction runs, and field values.
- **Human Review** — corrections and reviewer feedback.
- **Model Training and Evaluation** — training runs, evaluation runs, and evaluation results.
- **Auditing** — activity logs for tracking relevant application actions.

## Viewing the ERD

1. Open [dbdiagram.io](https://dbdiagram.io/).
2. Create a new diagram.
3. Copy the contents of `schema.dbml` into the editor.
4. Generate the diagram to inspect the tables and relationships.

## Maintenance

Update `schema.dbml` whenever the Prisma database schema changes. Keep model definitions, fields, constraints, indexes, and relationships consistent between both files.

The Prisma schema remains the source of truth for the database structure.