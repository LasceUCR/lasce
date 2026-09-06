"""SQLAlchemy mirror of the Prisma schema.

``packages/db/prisma/schema.prisma`` is the source of truth and the only place
migrations are written. These classes just let the worker read and write the
same tables. Whenever you change a Prisma model, change the matching class here.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
