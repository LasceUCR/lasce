"""Domain logic that is neither an SDK wrapper (``app.clients``) nor a job entry
point (``app.processors``). A service takes plain values in, does something
with a side effect (usually a database write), and hands back plain values —
no BullMQ job object crosses this boundary.
"""
