#!/usr/bin/env python3
"""
Generate a roamable fantasy-themed sandbox on top of an Open World level.

Run in UE 5.7:
  UnrealEditor-Cmd <Project.uproject> /Game/Maps/L_FantasyRoam \
    -run=pythonscript -script=/absolute/path/seed_fantasy_world.py
"""

import math
import random
import unreal


TAG_NAME = unreal.Name("CodexFantasyDemo")
FOLDER_NAME = "Codex/FantasyDemo"
SEED = 5705
RNG = random.Random(SEED)


ASSET_LIB = unreal.EditorAssetLibrary
ACTOR_SUBSYSTEM = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def log(message):
    unreal.log(f"[FantasySeed] {message}")


def load_first(paths):
    for path in paths:
        asset = ASSET_LIB.load_asset(path)
        if asset:
            return asset
    return None


MESHES = {
    "cube": load_first(["/Engine/BasicShapes/Cube.Cube"]),
    "cylinder": load_first(["/Engine/BasicShapes/Cylinder.Cylinder"]),
    "cone": load_first(["/Engine/BasicShapes/Cone.Cone"]),
    "sphere": load_first(["/Engine/BasicShapes/Sphere.Sphere"]),
    "rock": load_first(
        [
            "/Game/StarterContent/Props/SM_Rock.SM_Rock",
            "/Engine/BasicShapes/Sphere.Sphere",
        ]
    ),
    "pillar": load_first(
        [
            "/Game/StarterContent/Props/SM_PillarFrame.SM_PillarFrame",
            "/Engine/BasicShapes/Cylinder.Cylinder",
        ]
    ),
    "statue": load_first(
        [
            "/Game/StarterContent/Props/SM_Statue.SM_Statue",
            "/Engine/BasicShapes/Cylinder.Cylinder",
        ]
    ),
}

MATERIALS = {
    "stone": load_first(
        [
            "/Game/StarterContent/Materials/M_Concrete_Poured.M_Concrete_Poured",
            "/Engine/EngineMaterials/DefaultMaterial.DefaultMaterial",
        ]
    ),
    "gold": load_first(
        [
            "/Game/StarterContent/Materials/M_Metal_Gold.M_Metal_Gold",
            "/Engine/EngineMaterials/DefaultMaterial.DefaultMaterial",
        ]
    ),
    "tile": load_first(
        [
            "/Game/StarterContent/Materials/M_Tile_Stone.M_Tile_Stone",
            "/Engine/EngineMaterials/DefaultMaterial.DefaultMaterial",
        ]
    ),
}


def add_tag(actor):
    tags = list(actor.tags)
    if TAG_NAME not in tags:
        tags.append(TAG_NAME)
        actor.tags = tags


def tag_to_folder(actor):
    actor.set_folder_path(FOLDER_NAME)
    add_tag(actor)


def clear_generated_actors():
    removed = 0
    for actor in ACTOR_SUBSYSTEM.get_all_level_actors():
        if TAG_NAME in list(actor.tags):
            ACTOR_SUBSYSTEM.destroy_actor(actor)
            removed += 1
    log(f"Removed {removed} previously generated actors.")


def spawn_mesh(mesh, location, scale, yaw=0.0, material=None, label=None):
    actor = ACTOR_SUBSYSTEM.spawn_actor_from_class(
        unreal.StaticMeshActor,
        location,
        unreal.Rotator(0.0, yaw, 0.0),
    )
    component = actor.static_mesh_component
    component.set_static_mesh(mesh)
    if material:
        component.set_material(0, material)
    actor.set_actor_scale3d(scale)
    if label:
        actor.set_actor_label(label)
    tag_to_folder(actor)
    return actor


def spawn_light(location, rgb):
    actor = ACTOR_SUBSYSTEM.spawn_actor_from_class(
        unreal.PointLight,
        location,
        unreal.Rotator(0.0, 0.0, 0.0),
    )
    component = actor.point_light_component
    component.set_editor_property("intensity", 5000.0)
    component.set_editor_property("attenuation_radius", 7600.0)
    component.set_editor_property(
        "light_color",
        unreal.LinearColor(rgb[0], rgb[1], rgb[2], 1.0),
    )
    tag_to_folder(actor)
    return actor


def spawn_tower(cx, cy, base_z, label):
    core_scale = unreal.Vector(2.8, 2.8, 1.1)
    for idx in range(5):
        z = base_z + idx * 240.0
        spawn_mesh(
            MESHES["cylinder"],
            unreal.Vector(cx, cy, z),
            core_scale,
            yaw=RNG.uniform(0.0, 360.0),
            material=MATERIALS["stone"],
            label=f"{label}_Segment_{idx}",
        )

    spawn_mesh(
        MESHES["cone"],
        unreal.Vector(cx, cy, base_z + 1380.0),
        unreal.Vector(2.4, 2.4, 2.2),
        material=MATERIALS["gold"],
        label=f"{label}_Spire",
    )


def spawn_ruin_ring(cx, cy, base_z, radius, count, label):
    for idx in range(count):
        angle = (math.pi * 2.0 * idx) / float(count)
        x = cx + math.cos(angle) * radius
        y = cy + math.sin(angle) * radius
        yaw = math.degrees(angle) + 90.0
        height = RNG.uniform(1.8, 4.8)
        spawn_mesh(
            MESHES["pillar"],
            unreal.Vector(x, y, base_z + 120.0),
            unreal.Vector(1.2, 1.2, height),
            yaw=yaw,
            material=MATERIALS["tile"],
            label=f"{label}_Pillar_{idx}",
        )

    spawn_mesh(
        MESHES["statue"],
        unreal.Vector(cx, cy, base_z + 210.0),
        unreal.Vector(1.7, 1.7, 1.9),
        yaw=RNG.uniform(0.0, 360.0),
        material=MATERIALS["stone"],
        label=f"{label}_Center",
    )


def scatter_rocks():
    for idx in range(440):
        x = RNG.uniform(-98000.0, 98000.0)
        y = RNG.uniform(-98000.0, 98000.0)
        z = RNG.uniform(-160.0, 380.0)
        sx = RNG.uniform(0.9, 4.8)
        sy = RNG.uniform(0.8, 4.4)
        sz = RNG.uniform(0.6, 2.2)
        spawn_mesh(
            MESHES["rock"],
            unreal.Vector(x, y, z),
            unreal.Vector(sx, sy, sz),
            yaw=RNG.uniform(0.0, 360.0),
            material=MATERIALS["stone"],
            label=f"ScatterRock_{idx}",
        )


def scatter_crystals_and_lights():
    for idx in range(160):
        x = RNG.uniform(-93000.0, 93000.0)
        y = RNG.uniform(-93000.0, 93000.0)
        z = RNG.uniform(90.0, 420.0)
        s = RNG.uniform(0.8, 2.2)
        spawn_mesh(
            MESHES["cone"],
            unreal.Vector(x, y, z),
            unreal.Vector(s, s, RNG.uniform(1.6, 3.2)),
            yaw=RNG.uniform(0.0, 360.0),
            material=MATERIALS["gold"],
            label=f"Crystal_{idx}",
        )

        if idx % 4 == 0:
            color = (
                RNG.uniform(0.55, 0.95),
                RNG.uniform(0.35, 0.7),
                RNG.uniform(0.2, 0.5),
            )
            spawn_light(unreal.Vector(x, y, z + 180.0), color)


def spawn_landmarks():
    points = [
        (-78000.0, -64000.0, 180.0),
        (-43000.0, 12000.0, 200.0),
        (-10000.0, -32000.0, 210.0),
        (26000.0, 43000.0, 200.0),
        (64000.0, -18000.0, 190.0),
        (82000.0, 70000.0, 230.0),
    ]

    for idx, (x, y, z) in enumerate(points):
        spawn_tower(x, y, z, f"LandmarkTower_{idx}")
        spawn_ruin_ring(x, y, z, radius=2200.0, count=10, label=f"LandmarkRuin_{idx}")


def spawn_gateways():
    gate_points = [
        (-90000.0, 0.0, 240.0),
        (90000.0, 0.0, 240.0),
        (0.0, -90000.0, 240.0),
        (0.0, 90000.0, 240.0),
    ]

    for idx, (x, y, z) in enumerate(gate_points):
        spawn_mesh(
            MESHES["cube"],
            unreal.Vector(x, y, z),
            unreal.Vector(0.7, 6.2, 5.5),
            yaw=45.0 if idx % 2 == 0 else -45.0,
            material=MATERIALS["tile"],
            label=f"Gate_{idx}_Left",
        )
        spawn_mesh(
            MESHES["cube"],
            unreal.Vector(x + 620.0, y, z),
            unreal.Vector(0.7, 6.2, 5.5),
            yaw=45.0 if idx % 2 == 0 else -45.0,
            material=MATERIALS["tile"],
            label=f"Gate_{idx}_Right",
        )


def main():
    required = [MESHES["cube"], MESHES["cylinder"], MESHES["cone"], MESHES["rock"]]
    if any(item is None for item in required):
        raise RuntimeError("Required meshes are missing. Ensure Engine content is available.")

    clear_generated_actors()

    spawn_landmarks()
    spawn_gateways()
    scatter_rocks()
    scatter_crystals_and_lights()

    unreal.EditorLevelLibrary.save_current_level()
    log("Fantasy roam world generation finished.")


if __name__ == "__main__":
    main()
