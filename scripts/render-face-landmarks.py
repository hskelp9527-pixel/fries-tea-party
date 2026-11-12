import bpy,json,sys
from pathlib import Path
from mathutils import Vector
root=Path.cwd();original='--original' in sys.argv
out=root/'art/review/2026-11-11/revision'/('faces-original' if original else 'faces-revised');out.mkdir(parents=True,exist_ok=True)
for name in ([arg for arg in sys.argv[sys.argv.index('--')+1:] if not arg.startswith('--')] if '--' in sys.argv else ['fries','hatter','hare','dormouse']):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root/(f'art/models/{name}.glb' if original else f'art/characters/finished/{name}.glb')))
    for obj in list(bpy.context.scene.objects):
        if obj.type=='ARMATURE':obj.data.pose_position='REST';obj.animation_data_clear()
        if obj.name.startswith('SpeechMouth'):raise RuntimeError('Legacy mouth overlay remains in the delivered character')
        if obj.name.startswith('MouthContact'):obj.hide_render=True
    bpy.context.view_layer.update()
    eyes=[o.matrix_world@v.co for o in bpy.context.scene.objects if o.type=='MESH'and'eyelid'in o.name.lower()for v in o.data.vertices]
    lo=Vector([min(p[i]for p in eyes)for i in range(3)]);hi=Vector([max(p[i]for p in eyes)for i in range(3)])
    size=(hi.x-lo.x)*2.2;aim=(lo+hi)/2;aim.z-=size*.1
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=scene.render.resolution_y=768;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Neutral');scene.world.color=(.12,.12,.12)
    for location,energy in [((-2,-3,4),350),((2,-2,2),220)]:
        light=bpy.data.objects.new('Face light',bpy.data.lights.new('Face light','AREA'));scene.collection.objects.link(light);light.location=Vector(location);light.data.energy=energy;light.data.size=3;light.rotation_euler=(aim-light.location).to_track_quat('-Z','Y').to_euler()
    camera=bpy.data.objects.new('Face camera',bpy.data.cameras.new('Face camera'));scene.collection.objects.link(camera);camera.location=aim+Vector((0,-3,0));camera.rotation_euler=(aim-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=size;scene.camera=camera
    scene.render.image_settings.file_format='PNG'
    for pose,value in [('closed',0),('half',.5),('speaking',1)]:
        for obj in bpy.context.scene.objects:
            if obj.type=='MESH' and obj.data.shape_keys:
                key=obj.data.shape_keys.key_blocks.get('mouth_open')
                if key:key.value=value
        for side,offset in [('',Vector((0,-3,0))),('-side',Vector((1.7,-3,.1)))]:
            camera.location=aim+offset;camera.rotation_euler=(aim-camera.location).to_track_quat('-Z','Y').to_euler()
            scene.render.filepath=str(out/f'{name}-{pose}{side}.png');bpy.ops.render.render(write_still=True)
    (out/f'{name}.json').write_text(json.dumps({'aim':list(aim),'scale':size,'eyeLow':list(lo),'eyeHigh':list(hi)}))
