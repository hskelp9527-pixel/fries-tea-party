"""Open the existing cottage shell into a real connected ground floor."""
from pathlib import Path
import bpy
root=Path.cwd()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'art/models/house.glb'))
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH'and any(slot.material and slot.material.name.startswith('doorway_hall')for slot in obj.material_slots):bpy.data.objects.remove(obj,do_unlink=True)
# Coordinates in the game: x -2.7..3.4, y 1.08..4.4, z -2.3..2.55.
# Keep the front wall; its existing arched doorway connects to this cavity.
bpy.ops.mesh.primitive_cube_add(size=1,location=(.35,-.125,2.74))
cutter=bpy.context.object;cutter.name='Connected cottage interior';cutter.dimensions=(6.1,4.85,3.32)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH'or obj==cutter:continue
    bpy.context.view_layer.objects.active=obj
    modifier=obj.modifiers.new('Full ground floor','BOOLEAN');modifier.object=cutter;modifier.operation='DIFFERENCE';modifier.solver='EXACT'
    bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.data.objects.remove(cutter,do_unlink=True)
out=root/'art/props/finished/house.glb';out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB')
print('Connected interior: 6.1 x 4.85 m; doorway and exterior retained')
