"""
Blair & Jack — cream pour film.

The cleanser bottle stays on a cream studio. A lotion ribbon leaves the pump,
spins in the air, then drops back down into the package.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/blender_cream_pour.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path("/Users/shamrikin/Desktop/ISstudio/Work/CuttingEdgeSites/BlairandJack")
GLB = ROOT / "3D" / "Meshy_AI_Blair_Jack_Refreshing_0908132300_generate.glb"
OUT_DIR = ROOT / "public" / "videos"
BLEND_DIR = ROOT / "3D" / "blender"
PREVIEW = BLEND_DIR / "cream-pour-preview.png"
VIDEO = OUT_DIR / "cleanser-cream.mp4"
BLEND = BLEND_DIR / "cream-pour.blend"

FPS = 24
DURATION = 8
TOTAL = FPS * DURATION  # 192
RES_X, RES_Y = 1920, 1080

CREAM = (0.957, 0.933, 0.878, 1.0)
INK = (0.047, 0.043, 0.043, 1.0)
TAUPE = (0.50, 0.42, 0.35, 1.0)
SAGE = (0.48, 0.62, 0.56, 1.0)
LOTION = (0.98, 0.94, 0.84, 1.0)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    engines = bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys()
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.resolution_x = RES_X
    scene.render.resolution_y = RES_Y
    scene.render.resolution_percentage = 100
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = TOTAL
    scene.frame_current = 1
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
    scene.render.ffmpeg.ffmpeg_preset = "GOOD"
    scene.render.ffmpeg.audio_codec = "NONE"
    scene.eevee.taa_render_samples = 16
    if hasattr(scene.eevee, "use_shadows"):
        scene.eevee.use_shadows = True
    if hasattr(scene.eevee, "use_raytracing"):
        scene.eevee.use_raytracing = False
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    return scene


def make_material(name, color, *, roughness=0.35, specular=0.45, subsurface=0.0, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    principled = nt.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    if "Specular IOR Level" in principled.inputs:
        principled.inputs["Specular IOR Level"].default_value = specular
    if subsurface > 0 and "Subsurface Weight" in principled.inputs:
        principled.inputs["Subsurface Weight"].default_value = subsurface
        if "Subsurface Radius" in principled.inputs:
            principled.inputs["Subsurface Radius"].default_value = (0.8, 0.35, 0.18)
        if "Subsurface Scale" in principled.inputs:
            principled.inputs["Subsurface Scale"].default_value = 0.04
    return mat


def import_bottle():
    bpy.ops.import_scene.gltf(filepath=str(GLB))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bottle = meshes[0]
    bottle.name = "CleanserBottle"

    bpy.context.view_layer.objects.active = bottle
    bottle.select_set(True)
    bpy.ops.object.shade_smooth()

    dec = bottle.modifiers.new("Decimate", "DECIMATE")
    dec.ratio = 0.06
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = bottle.evaluated_get(deps)
    new_mesh = bpy.data.meshes.new_from_object(evaluated)
    old = bottle.data
    bottle.modifiers.clear()
    bottle.data = new_mesh
    bpy.data.meshes.remove(old)

    # Stand the bottle on the ground (lowest Z = 0)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    bbox = [bottle.matrix_world @ Vector(c) for c in bottle.bound_box]
    min_z = min(v.z for v in bbox)
    max_z = max(v.z for v in bbox)
    bottle.location.z -= min_z
    bpy.context.view_layer.update()

    bbox = [bottle.matrix_world @ Vector(c) for c in bottle.bound_box]
    height = max(v.z for v in bbox) - min(v.z for v in bbox)
    top = max(v.z for v in bbox)

    mat = make_material(
        "BottleTaupe",
        TAUPE,
        roughness=0.28,
        specular=0.55,
        metallic=0.08,
    )
    if "Coat Weight" in mat.node_tree.nodes["Principled BSDF"].inputs:
        mat.node_tree.nodes["Principled BSDF"].inputs["Coat Weight"].default_value = 0.35
        mat.node_tree.nodes["Principled BSDF"].inputs["Coat Roughness"].default_value = 0.12
    bottle.data.materials.clear()
    bottle.data.materials.append(mat)

    print(f"Bottle verts={len(bottle.data.vertices)} height={height:.3f} top={top:.3f}")
    return bottle, height, top


def helix_point(t, top_z):
    """t in 0..1: leave pump, spin in air, drop back into the package."""
    mouth = top_z * 0.93
    peak = top_z + 0.95

    if t < 0.32:
        u = t / 0.32
        ease = u * u * (3 - 2 * u)
        radius = 0.02 + 0.48 * ease
        z = mouth + (peak - mouth) * ease
        turns = 1.6 * ease
    elif t < 0.68:
        u = (t - 0.32) / 0.36
        radius = 0.50 + 0.08 * math.sin(u * math.pi)
        z = peak + 0.06 * math.sin(u * math.pi * 2)
        turns = 1.6 + 2.4 * u
    else:
        u = (t - 0.68) / 0.32
        ease = u * u * (3 - 2 * u)
        radius = 0.50 * (1 - ease)
        z = peak + (mouth - 0.12 - peak) * ease
        turns = 4.0 + 1.5 * ease

    ang = turns * math.tau
    return Vector((math.cos(ang) * radius, math.sin(ang) * radius, z))


def make_cream_ribbon(top_z):
    curve_data = bpy.data.curves.new("CreamPath", "CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 8
    spline = curve_data.splines.new("POLY")
    count = 280
    spline.points.add(count - 1)
    for i in range(count):
        t = i / (count - 1)
        p = helix_point(t, top_z)
        spline.points[i].co = (p.x, p.y, p.z, 1.0)

    curve_data.bevel_resolution = 8
    curve_data.bevel_depth = 0.055
    curve_data.use_fill_caps = True
    curve_data.twist_mode = "Z_UP"
    curve_data.use_path = True
    curve_data.path_duration = TOTAL

    ribbon = bpy.data.objects.new("CreamRibbon", curve_data)
    bpy.context.collection.objects.link(ribbon)

    mat = make_material(
        "CreamLotion",
        LOTION,
        roughness=0.18,
        specular=0.55,
        subsurface=0.55,
    )
    ribbon.data.materials.append(mat)

    # A thinner sage-tinted trail on the same path
    trail_data = curve_data.copy()
    trail_data.bevel_depth = 0.028
    trail = bpy.data.objects.new("CreamTrail", trail_data)
    bpy.context.collection.objects.link(trail)
    trail.rotation_euler.z = math.radians(18)
    sage_mat = make_material(
        "CreamSage",
        (0.82, 0.86, 0.80, 1.0),
        roughness=0.28,
        subsurface=0.35,
    )
    trail.data.materials.append(sage_mat)

    return ribbon, trail


def make_cream_blobs(top_z, ribbon):
    blobs = []
    mat = bpy.data.materials["CreamLotion"]
    for i, scale in enumerate((0.09, 0.07, 0.055, 0.08)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=scale, location=(0, 0, 0))
        blob = bpy.context.active_object
        blob.name = f"CreamBlob.{i+1:02d}"
        bpy.ops.object.shade_smooth()
        blob.data.materials.append(mat)

        con = blob.constraints.new("FOLLOW_PATH")
        con.target = ribbon
        con.use_curve_follow = True
        con.use_fixed_location = True
        offset = 0.08 * i
        con.offset_factor = 0.0
        con.keyframe_insert("offset_factor", frame=1)
        blob.scale = (0, 0, 0)
        blob.keyframe_insert("scale", frame=1)

        appear = 18 + i * 10
        blob.scale = (0, 0, 0)
        blob.keyframe_insert("scale", frame=appear)
        blob.scale = (1, 1, 1)
        blob.keyframe_insert("scale", frame=appear + 14)

        con.offset_factor = 0.0
        con.keyframe_insert("offset_factor", frame=appear)
        con.offset_factor = 1.0
        con.keyframe_insert("offset_factor", frame=TOTAL - 8)

        blob.scale = (1, 1, 1)
        blob.keyframe_insert("scale", frame=TOTAL - 28)
        blob.scale = (0, 0, 0)
        blob.keyframe_insert("scale", frame=TOTAL - 4)

        for fcu in blob.animation_data.action.fcurves:
            for kp in fcu.keyframe_points:
                kp.interpolation = "BEZIER"
        blobs.append(blob)
    return blobs


def animate_ribbon(ribbon, trail):
    for obj, start_grow, end_grow in ((ribbon, 12, 88), (trail, 20, 100)):
        data = obj.data
        data.bevel_factor_start = 0.0
        data.bevel_factor_end = 0.0
        data.keyframe_insert("bevel_factor_end", frame=start_grow)
        data.bevel_factor_end = 1.0
        data.keyframe_insert("bevel_factor_end", frame=end_grow)

        # Retract from the tail so the cream appears to fall into the package
        data.bevel_factor_start = 0.0
        data.keyframe_insert("bevel_factor_start", frame=118)
        data.bevel_factor_start = 1.0
        data.keyframe_insert("bevel_factor_start", frame=TOTAL - 6)

        obj.rotation_euler.z = 0
        obj.keyframe_insert("rotation_euler", frame=1)
        obj.rotation_euler.z = math.radians(420)
        obj.keyframe_insert("rotation_euler", frame=TOTAL)

        for fcu in obj.animation_data.action.fcurves:
            for kp in fcu.keyframe_points:
                kp.interpolation = "BEZIER"


def setup_stage(height):
    bpy.ops.mesh.primitive_plane_add(size=18, location=(0, 0, -0.001))
    floor = bpy.context.active_object
    floor.name = "StudioFloor"
    floor.data.materials.append(make_material("FloorCream", CREAM, roughness=0.62, specular=0.2))

    bpy.ops.mesh.primitive_plane_add(size=22, location=(0, -6.5, 3.2), rotation=(math.radians(90), 0, 0))
    backdrop = bpy.context.active_object
    backdrop.name = "StudioBackdrop"
    backdrop.data.materials.append(make_material("BackdropCream", CREAM, roughness=0.85, specular=0.08))

    world = bpy.data.worlds.new("StudioWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = CREAM
    bg.inputs["Strength"].default_value = 0.55


def setup_lights():
    def add_light(name, type_, energy, loc, color=(1, 0.96, 0.9)):
        data = bpy.data.lights.new(name, type_)
        data.energy = energy
        data.color = color
        if type_ == "AREA":
            data.size = 3.2
        obj = bpy.data.objects.new(name, data)
        obj.location = loc
        bpy.context.collection.objects.link(obj)
        return obj

    key = add_light("Key", "AREA", 420, (2.6, -2.4, 4.2))
    key.rotation_euler = (math.radians(55), 0, math.radians(40))
    fill = add_light("Fill", "AREA", 140, (-3.4, 1.6, 2.4), (0.85, 0.9, 0.86))
    fill.rotation_euler = (math.radians(70), 0, math.radians(-50))
    add_light("Rim", "AREA", 180, (-1.4, 3.6, 3.8), (1, 0.92, 0.84)).rotation_euler = (
        math.radians(40),
        0,
        math.radians(190),
    )


def setup_camera(height):
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 35
    cam_data.dof.use_dof = False
    cam = bpy.data.objects.new("Camera", cam_data)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    target = Vector((0, 0, height * 0.48))
    empty = bpy.data.objects.new("CamTarget", None)
    empty.location = target
    bpy.context.collection.objects.link(empty)

    radius = 5.6
    cam.location = (radius * 0.62, -radius * 0.86, height * 0.52)
    track = cam.constraints.new("TRACK_TO")
    track.target = empty
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"

    cam.keyframe_insert("location", frame=1)
    cam.location = (radius * 0.18, -radius * 1.04, height * 0.62)
    cam.keyframe_insert("location", frame=TOTAL)
    for fcu in cam.animation_data.action.fcurves:
        for kp in fcu.keyframe_points:
            kp.interpolation = "LINEAR"
    return cam


def setup_compositor(scene):
    scene.use_nodes = False


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    BLEND_DIR.mkdir(parents=True, exist_ok=True)

    scene = reset_scene()
    bottle, height, top = import_bottle()
    ribbon, trail = make_cream_ribbon(top)
    make_cream_blobs(top, ribbon)
    animate_ribbon(ribbon, trail)
    setup_stage(height)
    setup_lights()
    setup_camera(height)
    setup_compositor(scene)

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    print(f"Saved blend: {BLEND}")

    scene.frame_set(96)
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW)
    bpy.ops.render.render(write_still=True)
    print(f"Preview: {PREVIEW}")

    if "--preview" in sys.argv:
        return

    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.filepath = str(VIDEO)
    bpy.ops.render.render(animation=True)
    print(f"Video: {VIDEO}")


if __name__ == "__main__":
    main()
