#!/usr/bin/env python3
"""Genera el MER Chen en SVG y mxGraph/Draw.io, sin dependencias externas."""

from __future__ import annotations

import hashlib
import heapq
import html
import json
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET

OUT = Path(__file__).resolve().parent
SCHEMA = OUT.parents[1] / "backend/prisma/schema.prisma"
INK = "#233247"
MUTED = "#56657a"
BLUE = "#eaf2fd"
GOLD = "#fff2cf"
TEAL = "#e9f6f2"
WHITE = "#ffffff"
FONT = "Arial"
STEP = 10

NAMES = {
    "Usuario": "Usuario", "SesionUsuario": "Sesión de usuario",
    "DispositivoSesionUsuario": "Dispositivo de sesión", "PermisoUsuario": "Permiso de usuario",
    "PlantillaPermiso": "Plantilla de permiso", "BloqueoUsuario": "Bloqueo de usuario",
    "UsuarioSucursal": "Asignación de usuario", "Sucursal": "Sucursal", "Estado": "Estado geográfico",
    "Municipio": "Municipio", "DireccionSucursal": "Dirección de sucursal",
    "DescansoSucursal": "Día de descanso", "HorarioSemanalSucursal": "Horario semanal",
    "ContactoSucursal": "Contacto de sucursal", "ParticionSucursal": "Partición de sucursal",
    "ZonaParticion": "Zona", "SensorZona": "Sensor", "CamaraZona": "Cámara",
    "RecepcionEvento": "Recepción de señal", "EventoSucursal": "Evento de sucursal",
    "AtencionEvento": "Atención de evento", "HistorialEvento": "Registro de historial",
    "EscalamientoEvento": "Escalamiento", "NotificacionEvento": "Notificación",
    "IntentoNotificacion": "Intento de notificación", "ResolucionEvento": "Resolución de evento",
}

VERBS = {
    "SesionUsuario.usuario": "inicia", "DispositivoSesionUsuario.sesionUsuario": "registra",
    "PermisoUsuario.usuario": "posee", "BloqueoUsuario.usuario": "recibe bloqueo",
    "BloqueoUsuario.desbloqueadoPor": "finaliza bloqueo",
    "UsuarioSucursal.usuario": "tiene asignación", "UsuarioSucursal.sucursal": "agrupa asignaciones",
    "DireccionSucursal.estado": "ubica dirección", "DireccionSucursal.municipio": "localiza dirección",
    "DireccionSucursal.sucursal": "tiene dirección", "DescansoSucursal.sucursal": "programa descanso",
    "HorarioSemanalSucursal.sucursal": "define horario", "ContactoSucursal.sucursal": "registra contacto",
    "ParticionSucursal.sucursal": "contiene partición", "ZonaParticion.particion": "agrupa zona",
    "ZonaParticion.sucursal": "contiene zona", "SensorZona.zonaParticion": "dispone de sensor",
    "CamaraZona.zonaParticion": "dispone de cámara", "RecepcionEvento.eventoSucursal": "vincula recepción",
    "EventoSucursal.sucursal": "registra evento", "EventoSucursal.zonaParticion": "sitúa evento",
    "AtencionEvento.eventoSucursal": "tiene atención", "AtencionEvento.usuario": "realiza atención",
    "AtencionEvento.sesionUsuario": "sustenta atención", "HistorialEvento.eventoSucursal": "conserva historial",
    "HistorialEvento.atencionEvento": "contextualiza registro", "HistorialEvento.usuario": "ejecuta acción",
    "EscalamientoEvento.eventoSucursal": "origina escalamiento", "NotificacionEvento.eventoSucursal": "genera aviso",
    "NotificacionEvento.dispositivoSesionUsuario": "recibe en dispositivo",
    "NotificacionEvento.destinatario": "es destinatario", "NotificacionEvento.escalamientoEvento": "motiva aviso",
    "IntentoNotificacion.notificacionEvento": "registra intento", "ResolucionEvento.eventoSucursal": "tiene resolución",
    "ResolucionEvento.usuario": "emite resolución",
}

# Coordenadas en una retícula amplia: cada entidad tiene espacio para sus óvalos.
# Una referencia repite solamente el identificador; su definición completa está
# en otra lámina. Las relaciones se identifican por el campo Prisma propietario.
PAGES = [
    dict(slug="01-usuarios-acceso", title="Usuarios y acceso", size=(2200, 2310),
         nodes={"SesionUsuario": (1100, 480), "DispositivoSesionUsuario": (1840, 480),
                "PermisoUsuario": (360, 1220), "Usuario": (1100, 1220),
                "BloqueoUsuario": (1840, 1220), "PlantillaPermiso": (360, 1960)},
         primary=["Usuario", "SesionUsuario", "DispositivoSesionUsuario", "PermisoUsuario", "BloqueoUsuario", "PlantillaPermiso"],
         rels={"SesionUsuario.usuario": (1100, 850), "DispositivoSesionUsuario.sesionUsuario": (1470, 480),
               "PermisoUsuario.usuario": (730, 1220), "BloqueoUsuario.usuario": (1470, 1100),
               "BloqueoUsuario.desbloqueadoPor": (1470, 1340)},
         notes=["Dos roles distintos de Usuario: persona bloqueada y persona que finaliza el bloqueo.",
                "PlantillaPermiso comparte el dominio RolUsuario; Prisma no declara vínculos con otras entidades.",
                "Un usuario puede conservar varias sesiones, permisos y bloqueos históricos."]),
    dict(slug="02-sucursales-territorio", title="Sucursales, asignación y territorio", size=(2200, 2350),
         nodes={"Usuario": (360, 480), "UsuarioSucursal": (1100, 480), "Estado": (1840, 480),
                "DescansoSucursal": (360, 1220), "Sucursal": (1100, 1220), "DireccionSucursal": (1840, 1220),
                "ContactoSucursal": (360, 1960), "HorarioSemanalSucursal": (1100, 1960), "Municipio": (1840, 1960)},
         primary=["UsuarioSucursal", "Estado", "DescansoSucursal", "Sucursal", "DireccionSucursal", "ContactoSucursal", "HorarioSemanalSucursal", "Municipio"],
         rels={"UsuarioSucursal.usuario": (730, 480), "UsuarioSucursal.sucursal": (1100, 850),
               "DescansoSucursal.sucursal": (730, 1220), "DireccionSucursal.sucursal": (1470, 1220),
               "ContactoSucursal.sucursal": (730, 1590), "HorarioSemanalSucursal.sucursal": (1100, 1590),
               "DireccionSucursal.estado": (1840, 850), "DireccionSucursal.municipio": (1840, 1590)},
         notes=["UsuarioSucursal es una entidad de asociación con identidad y fechas propias; usuarioId es único.",
                "Cada usuario tiene 0 o 1 asignación actual. Una sucursal admite 0 a N asignaciones.",
                "Estado y Municipio son catálogos independientes en este esquema: no se infiere una relación entre ellos."]),
    dict(slug="03-infraestructura", title="Infraestructura de monitoreo", size=(2200, 1660),
         nodes={"Sucursal": (360, 480), "ParticionSucursal": (1100, 480),
                "SensorZona": (360, 1220), "ZonaParticion": (1100, 1220), "CamaraZona": (1840, 1220)},
         primary=["ParticionSucursal", "SensorZona", "ZonaParticion", "CamaraZona"],
         rels={"ParticionSucursal.sucursal": (730, 480), "ZonaParticion.particion": (1100, 850),
               "ZonaParticion.sucursal": (730, 850), "SensorZona.zonaParticion": (730, 1220),
               "CamaraZona.zonaParticion": (1470, 1220)},
         notes=["Toda zona pertenece a una sucursal; pertenecer a una partición es opcional.",
                "Cuando la zona tiene partición, ambas deben pertenecer a la misma sucursal (regla adicional).",
                "Cámaras y sensores se asocian a la zona, sin una relación directa inventada con el evento."]),
    dict(slug="04-eventos-recepcion", title="Eventos y recepción de señales", size=(2200, 1760),
         nodes={"Sucursal": (360, 480), "ZonaParticion": (1100, 480),
                "EventoSucursal": (1100, 1220), "RecepcionEvento": (1840, 1220)},
         primary=["EventoSucursal", "RecepcionEvento"],
         rels={"EventoSucursal.sucursal": (730, 850), "EventoSucursal.zonaParticion": (1100, 850),
               "RecepcionEvento.eventoSucursal": (1470, 1220)},
         notes=["Cada evento se vincula obligatoriamente a una sucursal y una zona coherentes entre sí.",
                "Una recepción técnica puede no tener evento; varios reenvíos pueden vincularse al mismo evento.",
                "El estado de recepción es técnico. El estado de EventoSucursal corresponde a la gestión operativa."]),
    dict(slug="05-atencion-historial", title="Atención, historial y resolución", size=(2200, 2090),
         nodes={"SesionUsuario": (360, 480), "Usuario": (1100, 480), "ResolucionEvento": (1840, 480),
                "AtencionEvento": (360, 1220), "EventoSucursal": (1100, 1220), "HistorialEvento": (1840, 1220)},
         primary=["AtencionEvento", "HistorialEvento", "ResolucionEvento"],
         rels={"AtencionEvento.sesionUsuario": (360, 850), "AtencionEvento.usuario": (730, 850),
               "AtencionEvento.eventoSucursal": (730, 1220), "ResolucionEvento.usuario": (1470, 480),
               "ResolucionEvento.eventoSucursal": (1470, 850), "HistorialEvento.eventoSucursal": (1470, 1220),
               "HistorialEvento.usuario": (1470, 650), "HistorialEvento.atencionEvento": (1100, 1640)},
         notes=["Un evento y un usuario conservan N atenciones históricas, pero como máximo una atención vigente cada uno.",
                "Cada atención pertenece a una sesión y un usuario; la coherencia entre ambos es una regla adicional.",
                "En el historial, usuario y atención son opcionales. Usuario nulo identifica una acción automática.",
                "Cada evento tiene como máximo una resolución; cada resolución tiene un usuario responsable."]),
    dict(slug="06-notificaciones", title="Notificaciones y escalamiento", size=(2200, 1740),
         nodes={"Usuario": (360, 480), "EscalamientoEvento": (1100, 480), "DispositivoSesionUsuario": (1840, 480),
                "EventoSucursal": (360, 1220), "NotificacionEvento": (1100, 1220), "IntentoNotificacion": (1840, 1220)},
         primary=["EscalamientoEvento", "NotificacionEvento", "IntentoNotificacion"],
         rels={"EscalamientoEvento.eventoSucursal": (730, 850), "NotificacionEvento.eventoSucursal": (730, 1220),
               "NotificacionEvento.destinatario": (730, 650), "NotificacionEvento.dispositivoSesionUsuario": (1470, 850),
               "NotificacionEvento.escalamientoEvento": (1100, 850), "IntentoNotificacion.notificacionEvento": (1470, 1220)},
         notes=["Una notificación tiene evento, destinatario y dispositivo obligatorios; el escalamiento es opcional.",
                "No se repite la combinación de evento, dispositivo y destinatario. Los intentos se numeran por aviso.",
                "La coherencia del destinatario con la sesión del dispositivo y del evento con la escalada exige validación."]),
]

OVERVIEW = dict(slug="00-vista-general", title="Vista conceptual general", size=(2940, 2350),
    nodes={"Usuario": (360, 480), "Sucursal": (1100, 480), "ZonaParticion": (1840, 480), "CamaraZona": (2580, 480),
           "SesionUsuario": (360, 1220), "AtencionEvento": (1100, 1220), "EventoSucursal": (1840, 1220), "RecepcionEvento": (2580, 1220),
           "HistorialEvento": (1100, 1960), "ResolucionEvento": (1840, 1960), "NotificacionEvento": (2580, 1960)},
    primary=[], overview=True,
    rels={"__asignacion": (730, 480), "ZonaParticion.sucursal": (1470, 480), "CamaraZona.zonaParticion": (2210, 480),
          "SesionUsuario.usuario": (360, 850), "AtencionEvento.usuario": (730, 850),
          "AtencionEvento.eventoSucursal": (1470, 1220), "EventoSucursal.zonaParticion": (1840, 850),
          "RecepcionEvento.eventoSucursal": (2210, 1220), "HistorialEvento.atencionEvento": (1100, 1590),
          "ResolucionEvento.eventoSucursal": (1840, 1590), "NotificacionEvento.eventoSucursal": (2210, 1590)},
    notes=["Vista resumida: selección de entidades, atributos y relaciones. Las láminas 01 a 06 contienen el detalle completo.",
           "La relación «se asigna a» resume UsuarioSucursal; conserva 0 o 1 sucursal por usuario y 0 a N usuarios por sucursal.",
           "Basado en el esquema de Prisma. Este dibujo describe datos; no certifica funciones ni integraciones implementadas."])


def parse_schema():
    raw = SCHEMA.read_text()
    blocks = dict(re.findall(r"model (\w+) \{(.*?)\n\}", raw, re.S))
    models, relations = {}, {}
    for name, body in blocks.items():
        fields = []
        for line in body.splitlines():
            line = line.split("//", 1)[0].strip()
            if line and not line.startswith("@@"):
                field, typ, *tail = line.split()
                fields.append(dict(name=field, type=typ, declaration=" ".join(tail)))
        fks = {v.strip() for f in fields for m in re.findall(r"fields:\s*\[([^]]+)\]", f["declaration"]) for v in m.split(",")}
        attrs = [f for f in fields if f["name"] not in fks and f["type"].rstrip("?[]") not in blocks]
        models[name] = dict(fields=fields, attrs=attrs)
        for f in fields:
            matches = re.findall(r"fields:\s*\[([^]]+)\]", f["declaration"])
            if not matches:
                continue
            fk_names = [x.strip() for x in matches[0].split(",")]
            fk_fields = [x for x in fields if x["name"] in fk_names]
            unique = len(fk_fields) == 1 and "@unique" in fk_fields[0]["declaration"]
            relations[name + "." + f["name"]] = dict(parent=f["type"].rstrip("?"), child=name,
                field=f["name"], fks=fk_names, label=VERBS[name + "." + f["name"]],
                parent_card="(0,1)" if unique else "(0,N)", child_card="(0,1)" if f["type"].endswith("?") else "(1,1)")
    enums = {n: [l.strip().split()[0] for l in b.splitlines() if l.strip() and not l.strip().startswith("//")]
             for n, b in re.findall(r"enum (\w+) \{(.*?)\n\}", raw, re.S)}
    return raw, models, relations, enums


def wrap(text, width):
    words, lines, line = text.split(), [], ""
    for word in words:
        if len(line) + len(word) + 1 > width and line:
            lines.append(line)
            line = word
        else:
            line = (line + " " + word).strip()
    return lines + ([line] if line else [])


def offset_polyline(points, distance):
    """Desplazamiento paralelo para la participación total de Chen."""
    normals = []
    for (ax, ay), (bx, by) in zip(points, points[1:]):
        length = math.hypot(bx - ax, by - ay)
        normals.append((-(by - ay) / length, (bx - ax) / length))
    out = []
    for i, (x, y) in enumerate(points):
        if i == 0:
            nx, ny = normals[0]
        elif i == len(points) - 1:
            nx, ny = normals[-1]
        else:
            nx, ny = normals[i - 1][0] + normals[i][0], normals[i - 1][1] + normals[i][1]
        out.append((x + distance * nx, y + distance * ny))
    return out


class Diagram:
    def __init__(self, spec, models, relations):
        self.spec, self.models, self.relations = spec, models, relations
        self.width, self.height = spec["size"]
        self.shapes, self.edges, self.node_ids, self.relation_ids = [], [], {}, {}
        self.occupied = {}
        self.ports_used = {}
        self.blocked_cells = None
        self.counter = 0

    def shape(self, kind, x, y, w, h, label, **extra):
        self.counter += 1
        item = dict(id=f"s{self.counter}", kind=kind, x=x, y=y, w=w, h=h, label=label, **extra)
        self.shapes.append(item)
        return item["id"]

    def text(self, x, y, label, size=18, **extra):
        return self.shape("text", x, y, 0, 0, label, size=size, **extra)

    def by_id(self, sid):
        return next(s for s in self.shapes if s["id"] == sid)

    def add_entity(self, name, x, y):
        reference = name not in self.spec["primary"]
        eid = self.shape("entity", x, y, 260, 80, NAMES[name], model=name, reference=reference)
        self.node_ids[name] = eid
        attrs = self.models[name]["attrs"]
        if self.spec.get("overview"):
            preferred = {"Usuario": "numeroControl", "Sucursal": "nombre", "ZonaParticion": "nombre", "CamaraZona": "prioridad",
                         "SesionUsuario": "inicio", "AtencionEvento": "inicio", "EventoSucursal": "estado", "RecepcionEvento": "origen",
                         "HistorialEvento": "accion", "ResolucionEvento": "accion", "NotificacionEvento": "estado"}
            attrs = [f for f in attrs if f["name"] in ("id", preferred[name])]
        elif reference:
            attrs = [f for f in attrs if "@id" in f["declaration"]]
        for i, f in enumerate(attrs):
            # Pares sobre y bajo el rectángulo; dejan un corredor vertical.
            side = -1 if i % 2 == 0 else 1
            pair = i // 2
            dy = -(110 + 70 * pair) if pair < 3 else 110 + 70 * (pair - 3)
            ax, ay = x + side * 140, y + dy
            key = "@id" in f["declaration"]
            label = f["name"] + (" ?" if f["type"].endswith("?") else "")
            aid = self.shape("attribute", ax, ay, 240, 48, label, key=key, model=name, field=f["name"])
            # Ramales anidados por el corredor central: ninguna conexión a un
            # atributo atraviesa el óvalo de otro atributo.
            lane = 16 - 5 * (pair if pair < 3 else pair - 3)
            start = (x + side * lane, y + (-40 if dy < 0 else 40))
            endpoint = (ax - side * 120, ay)
            self.edges.append(dict(id=f"a-{aid}", source=eid, target=aid,
                                   points=[start, (x + side * lane, ay), endpoint], total=False, attribute=True))

    def ports(self, sid):
        s = self.by_id(sid)
        ports = [(s["x"] + s["w"] / 2, s["y"], 1, 0), (s["x"] - s["w"] / 2, s["y"], -1, 0),
                 (s["x"], s["y"] - s["h"] / 2, 0, -1), (s["x"], s["y"] + s["h"] / 2, 0, 1)]
        if s["kind"] == "entity":
            for offset in [-30, 30]:
                ports += [(s["x"] + s["w"] / 2, s["y"] + offset, 1, 0),
                          (s["x"] - s["w"] / 2, s["y"] + offset, -1, 0)]
            for offset in [-80, 80]:
                ports += [(s["x"] + offset, s["y"] - s["h"] / 2, 0, -1),
                          (s["x"] + offset, s["y"] + s["h"] / 2, 0, 1)]
        return ports

    def route(self, source, target, card):
        if self.blocked_cells is None:
            self.blocked_cells = set()
            for s in self.shapes:
                if s["kind"] == "text":
                    continue
                for xx in range(math.floor((s["x"] - s["w"] / 2 - 10) / STEP) * STEP, math.ceil((s["x"] + s["w"] / 2 + 10) / STEP) * STEP + 1, STEP):
                    for yy in range(math.floor((s["y"] - s["h"] / 2 - 10) / STEP) * STEP, math.ceil((s["y"] + s["h"] / 2 + 10) / STEP) * STEP + 1, STEP):
                        if abs(xx - s["x"]) < s["w"] / 2 + 10 and abs(yy - s["y"]) < s["h"] / 2 + 10:
                            self.blocked_cells.add((xx, yy))
        def blocked(x, y):
            return (x, y) in self.blocked_cells

        # Los mejores puertos se eligen en conjunto con el recorrido para evitar
        # atravesar óvalos y permitir relaciones dobles entre las mismas entidades.
        starts = self.ports(source)
        ends = self.ports(target)
        options = []
        for a in starts:
            for b in ends:
                length = abs(a[0] - b[0]) + abs(a[1] - b[1])
                penalty = 600 * (self.ports_used.get((source, a[0], a[1]), 0) + self.ports_used.get((target, b[0], b[1]), 0))
                options.append((length + penalty, a, b))
        best = None
        for _, a, b in sorted(options)[:8]:
            start = (int(a[0] + a[2] * 30), int(a[1] + a[3] * 30))
            end = (int(b[0] + b[2] * 30), int(b[1] + b[3] * 30))
            initial = (start[0], start[1], a[2], a[3])
            queue, costs, prev = [(0, 0, initial)], {initial: 0}, {}
            final = None
            while queue:
                _, cost, state = heapq.heappop(queue)
                x, y, old_dx, old_dy = state
                if cost != costs.get(state):
                    continue
                if (x, y) == end:
                    final = state
                    break
                for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                    xx, yy = x + dx * STEP, y + dy * STEP
                    if not (40 <= xx <= self.width - 40 and 290 <= yy <= self.height - 190):
                        continue
                    if blocked(xx, yy):
                        continue
                    step_cost = STEP + (20 if (dx, dy) != (old_dx, old_dy) else 0) + 12 * self.occupied.get((xx, yy), 0)
                    nxt = (xx, yy, dx, dy)
                    nc = cost + step_cost
                    if nc < costs.get(nxt, math.inf):
                        costs[nxt], prev[nxt] = nc, state
                        heuristic = abs(xx - end[0]) + abs(yy - end[1])
                        heapq.heappush(queue, (nc + heuristic, nc, nxt))
            if final is None:
                continue
            cost = costs[final] + 600 * (self.ports_used.get((source, a[0], a[1]), 0) + self.ports_used.get((target, b[0], b[1]), 0))
            if best is not None and cost >= best[0]:
                continue
            path, current = [], final
            while current != initial:
                path.append(current[:2])
                current = prev[current]
            path.append(start)
            path.reverse()
            best = (cost, a, b, path)
        if best is None:
            raise ValueError(f"No se encontró ruta para {source} -> {target} en {self.spec['slug']}")
        _, a, b, path = best
        for p in path:
            self.occupied[p] = self.occupied.get(p, 0) + 1
        for sid, port in [(source, a), (target, b)]:
            self.ports_used[(sid, port[0], port[1])] = self.ports_used.get((sid, port[0], port[1]), 0) + 1
        points = [a[:2], *path, b[:2]]
        simplified = [points[0]]
        for i in range(1, len(points) - 1):
            before, here, after = points[i - 1], points[i], points[i + 1]
            if (here[0] - before[0]) * (after[1] - here[1]) != (here[1] - before[1]) * (after[0] - here[0]):
                simplified.append(here)
        simplified.append(points[-1])
        self.counter += 1
        self.edges.append(dict(id=f"e{self.counter}", source=source, target=target, points=simplified, total=card == "(1,1)", attribute=False))
        if a[2]:
            self.text(a[0] + a[2] * 40, a[1] - 18, card, size=17, cardinal=True)
        else:
            self.text(a[0] + 70, a[1] + a[3] * 24, card, size=17, cardinal=True)

    def build(self):
        for name, (x, y) in self.spec["nodes"].items():
            self.add_entity(name, x, y)
        rels = {}
        for key, (x, y) in self.spec["rels"].items():
            rel = self.relations[key] if key != "__asignacion" else dict(parent="Usuario", child="Sucursal", label="se asigna a", parent_card="(0,1)", child_card="(0,N)")
            rid = self.shape("relationship", x, y, 200, 120, rel["label"], relation=key)
            self.relation_ids[key] = rid
            rels[key] = rel
        # Siempre se dibujan sin flechas. La línea doble expresa participación total.
        for key, rel in rels.items():
            for side in ["parent", "child"]:
                self.route(self.node_ids[rel[side]], self.relation_ids[key], rel[side + "_card"])
        self.text(70, 56, "ARGOS  /  MODELO ENTIDAD–RELACIÓN", size=19, align="left", color=MUTED)
        self.text(70, 110, self.spec["title"], size=36, align="left", bold=True)
        self.text(70, 158, "Notación de Chen · derivado de backend/prisma/schema.prisma · 28 de octubre de 2026", size=18, align="left", color=MUTED)
        self.text(70, 204, "Rectángulo: entidad    /    Rombo: relación    /    Óvalo: atributo    /    Subrayado: identificador", size=18, align="left")
        self.text(70, 242, "(mín,máx) junto a cada entidad: participaciones de esa instancia. N = muchas. Línea doble = obligatoria. ? = atributo opcional.", size=17, align="left")
        if not self.spec.get("overview"):
            self.text(70, 280, "Las entidades en verde son referencias: su definición completa aparece en otra lámina.", size=16, align="left", color=MUTED)
        y = self.height - 136
        for note in self.spec["notes"]:
            self.text(70, y, note, size=17, align="left", color=MUTED)
            y += 30
        self.text(self.width - 70, self.height - 22, self.spec["slug"] + "  ·  Chen", size=15, align="right", color=MUTED)
        return self

    def svg(self):
        svg = ET.Element("svg", xmlns="http://www.w3.org/2000/svg", width=str(self.width), height=str(self.height), viewBox=f"0 0 {self.width} {self.height}", role="img")
        ET.SubElement(svg, "title").text = "Argos — " + self.spec["title"]
        ET.SubElement(svg, "desc").text = "Modelo entidad-relación en notación de Chen. Entidades en rectángulos, relaciones en rombos y atributos en óvalos. Las cardinalidades mínimas y máximas se leen junto a cada entidad."
        ET.SubElement(svg, "rect", width="100%", height="100%", fill=WHITE)
        lines = ET.SubElement(svg, "g", fill="none", stroke=INK, **{"stroke-width": "1.6", "stroke-linejoin": "round"})
        for edge in self.edges:
            paths = [edge["points"]] if not edge["total"] else [offset_polyline(edge["points"], -2.4), offset_polyline(edge["points"], 2.4)]
            for points in paths:
                ET.SubElement(lines, "polyline", points=" ".join(f"{x:g},{y:g}" for x, y in points), **{"data-edge": edge["id"]})
        for s in self.shapes:
            kind, x, y, w, h = (s[k] for k in ["kind", "x", "y", "w", "h"])
            g = ET.SubElement(svg, "g", id=s["id"])
            if kind == "entity":
                ET.SubElement(g, "rect", x=str(x - w / 2), y=str(y - h / 2), width=str(w), height=str(h), fill=TEAL if s["reference"] else BLUE, stroke=INK, **{"stroke-width": "2"})
                self.svg_text(g, x, y - 8, s["label"], 20, bold=True)
                self.svg_text(g, x, y + 18, s["model"], 13, color=MUTED)
            elif kind == "attribute":
                ET.SubElement(g, "ellipse", cx=str(x), cy=str(y), rx=str(w / 2), ry=str(h / 2), fill=WHITE, stroke=INK, **{"stroke-width": "1.5"})
                self.svg_text(g, x, y, s["label"], 15, underline=s["key"])
            elif kind == "relationship":
                ET.SubElement(g, "polygon", points=f"{x},{y-h/2} {x+w/2},{y} {x},{y+h/2} {x-w/2},{y}", fill=GOLD, stroke=INK, **{"stroke-width": "1.8"})
                labels = wrap(s["label"], 17)
                for i, line in enumerate(labels):
                    self.svg_text(g, x, y + (i - (len(labels) - 1) / 2) * 21, line, 16)
            elif kind == "text":
                if s.get("cardinal"):
                    ET.SubElement(g, "rect", x=str(x - 30), y=str(y - 11), width="60", height="22", fill=WHITE)
                self.svg_text(g, x, y, s["label"], s["size"], align=s.get("align", "center"), bold=s.get("bold", False), color=s.get("color", INK))
        return ET.tostring(svg, encoding="unicode", xml_declaration=False)

    @staticmethod
    def svg_text(parent, x, y, label, size, align="center", bold=False, color=INK, underline=False):
        attrs = {"x": str(x), "y": str(y), "font-family": FONT, "font-size": str(size), "fill": color,
                 "text-anchor": {"center": "middle", "left": "start", "right": "end"}[align], "dominant-baseline": "central"}
        if bold:
            attrs["font-weight"] = "700"
        if underline:
            attrs["text-decoration"] = "underline"
        ET.SubElement(parent, "text", attrs).text = label

    def mxgraph(self):
        model = ET.Element("mxGraphModel", dx="1400", dy="900", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth=str(self.width), pageHeight=str(self.height), math="0", shadow="0")
        root = ET.SubElement(model, "root")
        ET.SubElement(root, "mxCell", id="0")
        ET.SubElement(root, "mxCell", id="1", parent="0")
        # Primero las conexiones para que los nodos y sus etiquetas queden encima.
        for e in self.edges:
            paths = [e["points"]] if not e["total"] else [offset_polyline(e["points"], -2.4), offset_polyline(e["points"], 2.4)]
            for idx, points in enumerate(paths):
                src, dst = self.by_id(e["source"]), self.by_id(e["target"])
                def relative(point, shape):
                    return ((point[0] - shape["x"] + shape["w"] / 2) / shape["w"], (point[1] - shape["y"] + shape["h"] / 2) / shape["h"])
                ex, ey = relative(points[0], src)
                ix, iy = relative(points[-1], dst)
                style = f"endArrow=none;startArrow=none;html=0;rounded=0;strokeColor={INK};strokeWidth=1.5;exitX={ex:g};exitY={ey:g};exitPerimeter=0;entryX={ix:g};entryY={iy:g};entryPerimeter=0;"
                c = ET.SubElement(root, "mxCell", id=e["id"] + f"-{idx}", edge="1", parent="1", source=e["source"], target=e["target"], style=style)
                geom = ET.SubElement(c, "mxGeometry", relative="1", **{"as": "geometry"})
                if len(points) > 2:
                    arr = ET.SubElement(geom, "Array", **{"as": "points"})
                    for xx, yy in points[1:-1]:
                        ET.SubElement(arr, "mxPoint", x=f"{xx:g}", y=f"{yy:g}")
        for s in self.shapes:
            kind = s["kind"]
            label, w, h = s["label"], s["w"], s["h"]
            style = f"fontFamily={FONT};fontColor={INK};whiteSpace=wrap;html=1;"
            if kind == "entity":
                fill = TEAL if s["reference"] else BLUE
                style += f"shape=rectangle;rounded=0;fillColor={fill};strokeColor={INK};strokeWidth=2;fontSize=20;"
                label = f'<b>{html.escape(label)}</b><br><font style="font-size:13px;color:{MUTED}">{s["model"]}</font>'
            elif kind == "attribute":
                style += f"shape=ellipse;fillColor={WHITE};strokeColor={INK};fontSize=15;"
                label = html.escape(label)
                if s["key"]:
                    label = f"<u>{label}</u>"
            elif kind == "relationship":
                style += f"shape=rhombus;fillColor={GOLD};strokeColor={INK};fontSize=16;spacing=8;"
                label = "<br>".join(html.escape(t) for t in wrap(label, 17))
            else:
                w, h = (60, 24) if s.get("cardinal") else (self.width - 140, max(30, s["size"] * 1.5))
                style += f"shape=text;strokeColor=none;fillColor={'#ffffff' if s.get('cardinal') else 'none'};fontSize={s['size']};align={s.get('align', 'center')};fontColor={s.get('color', INK)};"
                if s.get("bold"):
                    style += "fontStyle=1;"
                label = html.escape(label)
            xx = s["x"] - w / 2
            if kind == "text" and s.get("align") == "left":
                xx = s["x"]
            elif kind == "text" and s.get("align") == "right":
                xx = s["x"] - w
            c = ET.SubElement(root, "mxCell", id=s["id"], value=label, style=style, vertex="1", parent="1")
            ET.SubElement(c, "mxGeometry", x=f"{xx:g}", y=f"{s['y']-h/2:g}", width=f"{w:g}", height=f"{h:g}", **{"as": "geometry"})
        return model


def main():
    raw, models, relations, enums = parse_schema()
    detail_keys = [k for p in PAGES for k in p["rels"]]
    assert len(detail_keys) == len(set(detail_keys))
    assert set(detail_keys) == set(relations), (set(relations) - set(detail_keys), set(detail_keys) - set(relations))
    primary = [n for p in PAGES for n in p["primary"]]
    assert len(primary) == len(set(primary)) and set(primary) == set(models)
    diagrams = []
    for page in [OVERVIEW, *PAGES]:
        page = dict(page, nodes={n: (x, y + 120) for n, (x, y) in page["nodes"].items()},
                    rels={n: (x, y + 120) for n, (x, y) in page["rels"].items()}, size=(page["size"][0], page["size"][1] + 120))
        print("Generando " + page["slug"], flush=True)
        diagram = Diagram(page, models, relations).build()
        (OUT / (page["slug"] + ".svg")).write_text(diagram.svg())
        diagrams.append(diagram)
    drawio = ET.Element("mxfile", host="app.diagrams.net", modified="2026-10-28T12:00:00.000Z", agent="Argos MER generator", version="24.7.17", type="device", compressed="false")
    for d in diagrams:
        page = ET.SubElement(drawio, "diagram", id=d.spec["slug"], name=d.spec["slug"][:2] + " · " + d.spec["title"])
        page.append(d.mxgraph())
    ET.indent(drawio)
    ET.ElementTree(drawio).write(OUT / "argos-modelo-chen.drawio", encoding="utf-8", xml_declaration=True)

    rows = ["# Trazabilidad del modelo Chen", "", "Archivo generado por `generar.py`. Fuente: `backend/prisma/schema.prisma`.", "",
            f"SHA-256 del esquema: `{hashlib.sha256(raw.encode()).hexdigest()}`.", "",
            f"Cobertura: **{len(models)} entidades**, **{len(relations)} relaciones explícitas**, **{sum(len(m['attrs']) for m in models.values())} atributos no relacionales** y **{len(enums)} dominios enumerados**.", "",
            "## Entidades y atributos", "", "Cada entidad se define completa en una lámina de detalle. Las claves foráneas se representan como relaciones. `?` señala un atributo opcional.", "",
            "| Entidad Prisma | Lámina | Atributos dibujados |", "| --- | --- | --- |"]
    for name, model in models.items():
        p = next(p for p in PAGES if name in p["primary"])
        attrs = ", ".join("`" + a["name"] + ("?" if a["type"].endswith("?") else "") + "`" for a in model["attrs"])
        rows.append(f"| `{name}` | [{p['slug']}]({p['slug']}.svg) | {attrs} |")
    rows.extend(["", "## Relaciones y participación", "", "Las dos cardinalidades expresan cuántas veces **cada instancia del extremo indicado** puede participar en esa relación; no se leen desde el extremo contrario. N significa muchas. La participación mínima de una colección es 0 porque Prisma no exige hijos.", "", "| Campo Prisma | Entidad referenciada: participación | Relación | Entidad propietaria: participación | Lámina |", "| --- | --- | --- | --- | --- |"])
    for key, rel in relations.items():
        p = next(p for p in PAGES if key in p["rels"])
        rows.append(f"| `{key}` | `{rel['parent']}` {rel['parent_card']} | {rel['label']} | `{rel['child']}` {rel['child_card']} | {p['slug'][:2]} |")
    rows.extend(["", "## Dominios enumerados", "", "Los enumerados restringen atributos; no se convierten en entidades ni en relaciones nuevas.", "", "| Dominio | Valores Prisma |", "| --- | --- |"])
    for name, values in enums.items():
        rows.append(f"| `{name}` | {', '.join('`' + v + '`' for v in values)} |")
    rows.extend(["", "## Atributos y dominios", "", "Tipos usados para rastrear los dominios del esquema; se omiten del dibujo para mantener la notación conceptual.", "", "| Entidad | Atributo | Dominio Prisma |", "| --- | --- | --- |"])
    for name, model in models.items():
        for a in model["attrs"]:
            rows.append(f"| `{name}` | `{a['name']}` | `{a['type']}` |")
    (OUT / "trazabilidad.md").write_text("\n".join(rows) + "\n")
    manifest = dict(schema_sha256=hashlib.sha256(raw.encode()).hexdigest(), entities=len(models), relations=len(relations),
                    attributes=sum(len(m["attrs"]) for m in models.values()), enums=len(enums),
                    pages=[dict(slug=d.spec["slug"], entities=len(d.node_ids), relations=len(d.relation_ids),
                                shapes=len(d.shapes), connections=len(d.edges)) for d in diagrams])
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
