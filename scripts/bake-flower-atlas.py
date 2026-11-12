"""Bake species-specific front/side albedo cards, preserving each clump's rooted dimensions."""
import json
from pathlib import Path
import bpy
from mathutils import Vector

root = Path.cwd()
output = root / 'art/optimized/flowers'
output.mkdir(parents=True, exist_ok=True)
names = ['flower_daisy', 'flower_forget_me_not', 'flower_violets', 'flower_foxglove', 'flower_mallow', 'flower_pink_rose', 'flower_red_rose']
metadata = {}
for name in names:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = next((root / 'art/models').rglob(name + '.glb'))
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    low = Vector([min(point[i] for point in points) for i in range(3)])
    high = Vector([max(point[i] for point in points) for i in range(3)])
    center = (low + high) * 0.5
    height = max(high.z - low.z, 0.05) * 1.12
    width = max(high.x - low.x, high.y - low.y, height) * 1.12
    # Copy base albedo into emission: the runtime lights the cards once.
    for material in {mat for obj in meshes for mat in obj.data.materials if mat}:
        material.use_nodes = True
        nodes, links = material.node_tree.nodes, material.node_tree.links
        bsdf = next((node for node in nodes if node.type == 'BSDF_PRINCIPLED'), None)
        emission = nodes.new('ShaderNodeEmission')
        if bsdf:
            base = bsdf.inputs['Base Color']
            if base.is_linked:
                links.new(base.links[0].from_socket, emission.inputs['Color'])
            else:
                emission.inputs['Color'].default_value = base.default_value
        links.new(emission.outputs[0], next(node for node in nodes if node.type == 'OUTPUT_MATERIAL').inputs['Surface'])
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.film_transparent = True
    scene.render.resolution_x = scene.render.resolution_y = 256
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    camera = bpy.data.objects.new('Atlas camera', bpy.data.cameras.new('Atlas camera'))
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = width
    for index, direction in enumerate([Vector((0, -3, 0)), Vector((3, 0, 0))]):
        camera.location = center + direction
        camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(output / f'{name}-{index}.png')
        bpy.ops.render.render(write_still=True)
    metadata[name] = {'width': width, 'height': width, 'center': [center.x, center.z, -center.y]}
    print('BAKED', name, flush=True)
(output / 'dimensions.json').write_text(json.dumps(metadata, indent=2))
