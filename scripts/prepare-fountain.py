"""Cut the playable west-facing grotto into a source-preserving prop variant."""
import math
from pathlib import Path
import bpy
import bmesh
root=Path.cwd()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'art/models/fountain.glb'))
parts=[obj for obj in bpy.context.scene.objects if obj.type=='MESH']
bm=bmesh.new()
ring=[(-.25,-.08),(.25,-.08),(.25,.13)]+[(.25*math.cos(i*math.pi/20),.13+.25*math.sin(i*math.pi/20))for i in range(1,21)]
front=[bm.verts.new((.08,y,z))for y,z in ring]
back=[bm.verts.new((1.95,y,z))for y,z in ring]
bm.faces.new(front);bm.faces.new(list(reversed(back)))
for i in range(len(ring)):bm.faces.new((front[i],front[(i+1)%len(ring)],back[(i+1)%len(ring)],back[i]))
bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
data=bpy.data.meshes.new('Grotto clearance');bm.to_mesh(data);bm.free()
cutter=bpy.data.objects.new('Grotto clearance',data);bpy.context.scene.collection.objects.link(cutter)
for obj in parts:
    bpy.context.view_layer.objects.active=obj
    modifier=obj.modifiers.new('Playable grotto','BOOLEAN');modifier.object=cutter;modifier.operation='DIFFERENCE';modifier.solver='EXACT'
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    # The scan includes static icing-like sheets between the porcelain bowls.
    # Runtime already supplies these curtains with flowing GPU geometry. Keep
    # the actual bowl profiles and central supports, remove only those duplicate
    # outer sheets in the open vertical gaps between the measured bowls.
    bm=bmesh.new();bm.from_mesh(obj.data);remove=[]
    gaps=[(.55,.915,.64),(1.02,1.575,.37),(1.685,1.955,.24)]
    for face in bm.faces:
        p=obj.matrix_world@face.calc_center_median()
        if any(low<p.z<high and math.hypot(p.x,p.y)>radius for low,high,radius in gaps):remove.append(face)
    bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(obj.data);bm.free();obj.data.update()
    print(f'Removed duplicate static flow: {len(remove)} faces from {obj.name}')
bpy.data.objects.remove(cutter,do_unlink=True)
out=root/'art/props/finished/fountain.glb';out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB')
print('GROTTO clearance: 0.50 m wide x 0.38 m high; small character: 0.216 m')
