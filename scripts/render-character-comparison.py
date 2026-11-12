import sys
from pathlib import Path
import bpy
from mathutils import Vector

name = sys.argv[sys.argv.index('--') + 1]
root = Path.cwd()
out = root / 'art/review/2026-11-11/complete'
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
for index, source in enumerate([root / f'art/models/{name}.glb', root / f'art/characters/finished/{name}.glb']):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    added = set(bpy.context.scene.objects) - before
    for obj in added:
        if obj.type == 'ARMATURE':
            obj.data.pose_position = 'REST'
            obj.animation_data_clear()
        if obj.parent is None:
            spacing = 0.8 if name == 'hatter' else 0.65
            obj.location.x += -spacing if index == 0 else spacing
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 1280, 900
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Studio')
scene.world.color = (0.15, 0.13, 0.2)
for name_light, location, energy, size in [('Key', (-3, -4, 5), 750, 5), ('Fill', (3, -1, 2), 350, 4)]:
    light = bpy.data.objects.new(name_light, bpy.data.lights.new(name_light, 'AREA'))
    light.data.energy, light.data.shape, light.data.size = energy, 'DISK', size
    light.location = location
    light.rotation_euler = (Vector((0, 0, 0.8)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(light)
camera = bpy.data.objects.new('Comparison camera', bpy.data.cameras.new('Comparison camera'))
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 3.3 if name == 'hatter' else 2.35
aim = Vector((0, 0, 0.9 if name == 'hatter' else 0.63))
camera.location = aim + Vector((0.2, -5, 0.1))
camera.rotation_euler = (aim - camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.render.filepath = str(out / f'{name}-proportions.jpg')
scene.render.image_settings.file_format = 'JPEG'
bpy.ops.render.render(write_still=True)
