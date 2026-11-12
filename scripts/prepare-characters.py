"""Rebind local Mixamo clips to revised proportions and add secondary chains/mouth morphs.

Original GLBs remain untouched. Outputs are input to compress-media.mjs.
"""
import json
import math
from pathlib import Path
import sys
import runpy
import bpy
from mathutils import Matrix, Vector, Quaternion
from mathutils.bvhtree import BVHTree

root = Path.cwd()
author_mouth = runpy.run_path(str(root / 'scripts/character-mouth.py'))['author_mouth']
output = root / 'art/characters/finished'
output.mkdir(parents=True, exist_ok=True)
names = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['fries', 'hatter', 'hare', 'dormouse']


def curves(action):
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    yield curve


for name in names:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root / f'art/models/{name}.glb'))
    arm = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.vertex_groups]
    repairs=0
    if name=='dormouse':
        # Repair isolated chest weights embedded in the head surface, rather than
        # allowing a single neck triangle to stretch when the head turns.
        for obj in meshes:
            adjacent=[set()for _ in obj.data.vertices]
            for edge in obj.data.edges:
                a,b=edge.vertices;adjacent[a].add(b);adjacent[b].add(a)
            weights=[{obj.vertex_groups[g.group].name:g.weight for g in vertex.groups}for vertex in obj.data.vertices]
            for index,near in enumerate(adjacent):
                own=weights[index]
                if len(near)<3 or own.get('mixamorig:Spine2',0)<.9 or own.get('mixamorig:Head',0)>.05:continue
                average={}
                for other in near:
                    for joint,weight in weights[other].items():average[joint]=average.get(joint,0)+weight/len(near)
                if average.get('mixamorig:Head',0)<.72:continue
                blended={joint:own.get(joint,0)*.25+average.get(joint,0)*.75 for joint in own.keys()|average.keys()}
                selected=sorted(blended.items(),key=lambda item:item[1],reverse=True)[:4];total=sum(weight for _,weight in selected)
                for group in list(obj.data.vertices[index].groups):obj.vertex_groups[group.group].remove([index])
                for joint,weight in selected:(obj.vertex_groups.get(joint)or obj.vertex_groups.new(name=joint)).add([index],weight/total,'REPLACE')
                repairs+=1
    original_actions = list(bpy.data.actions)
    arm.animation_data.action = None
    for track in arm.animation_data.nla_tracks:
        track.mute = True
    arm.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    arm_world = arm.matrix_world.copy()
    old = {bone.name: (arm_world @ bone.matrix_local, bone.length) for bone in arm.data.bones}
    head_name = next(bone.name for bone in arm.data.bones if bone.name.endswith(':Head') or bone.name.endswith('mixamorigHead'))
    head_origin = old[head_name][0].translation.copy()
    arm_scale = 1.23 if name in ['fries', 'hatter'] else 1.0
    before_points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    original_height = max(v.z for v in before_points) - min(v.z for v in before_points)
    base_head = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices
        if sum(g.weight for g in vertex.groups if 'Head' in obj.vertex_groups[g.group].name) > 0.5]
    head_height = max(v.z for v in base_head) - min(v.z for v in base_head)
    above_head = max(v.z for v in before_points) - head_origin.z
    head_scale = max(0.55, min(1, (original_height - above_head) / (4.25 * head_height - above_head))) if name in ['fries', 'hatter'] else 1.0
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for side in ['Left', 'Right']:
        for part in ['Arm', 'ForeArm']:
            bone = arm.data.edit_bones.get('mixamorig:' + side + part)
            if not bone:
                continue
            delta = (bone.tail - bone.head) * (arm_scale - 1)
            bone.tail += delta
            for child in bone.children_recursive:
                child.head += delta
                child.tail += delta
    bpy.ops.object.mode_set(mode='OBJECT')
    new = {bone.name: arm_world @ bone.matrix_local for bone in arm.data.bones}
    transformations = {}
    for bone in arm.data.bones:
        matrix, length = old[bone.name]
        ratio = bone.length / max(length, 1e-6)
        transformations[bone.name] = new[bone.name] @ Matrix.Diagonal((1, ratio, 1, 1)) @ matrix.inverted()
    # Skin and all existing eyelid shapes undergo the same rebind.
    for obj in meshes:
        to_world, to_local = obj.matrix_world.copy(), obj.matrix_world.inverted()
        bindings = [{obj.vertex_groups[group.group].name: group.weight for group in vertex.groups} for vertex in obj.data.vertices]
        def deform(index, coordinate):
            point = to_world @ coordinate
            weights = bindings[index]
            changed = Vector((0, 0, 0))
            total = 0
            for group, weight in weights.items():
                if group in transformations:
                    changed += (transformations[group] @ point) * weight
                    total += weight
            changed += point * max(0, 1 - total)
            head_weight = sum(weight for group, weight in weights.items() if 'Head' in group)
            changed += (head_origin - changed) * ((1 - head_scale) * min(1, head_weight))
            return to_local @ changed
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                for index, vertex in enumerate(key.data):
                    vertex.co = deform(index, vertex.co.copy())
        else:
            for vertex in obj.data.vertices:
                vertex.co = deform(vertex.index, vertex.co.copy())
    bpy.context.view_layer.update()
    head_points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices
        if sum(group.weight for group in vertex.groups if 'Head' in obj.vertex_groups[group.group].name) > 0.5]
    low = Vector([min(v[i] for v in head_points) for i in range(3)])
    high = Vector([max(v[i] for v in head_points) for i in range(3)])
    # Add two deform bones per appendage, selected in the authored rest pose.
    chains = []
    def chain(label, parent_name, selected, axis, exact=False):
        if len(selected) < 12:
            return
        bpy.ops.object.select_all(action='DESELECT')
        arm.select_set(True)
        bpy.context.view_layer.objects.active = arm
        positions = [obj.matrix_world @ obj.data.vertices[index].co for obj, index in selected]
        start = sum(positions, Vector()) / len(positions)
        end = max(positions, key=lambda point: point.dot(axis))
        start -= axis * max(0.025, (end - start).length * 0.5)
        if (end - start).length < 0.02:
            end = start + axis * 0.045
        bpy.ops.object.mode_set(mode='EDIT')
        parent = arm.data.edit_bones[parent_name]
        created = []
        inverse = arm_world.inverted()
        for segment in range(2):
            bone = arm.data.edit_bones.new(f'secondary_{label}_{segment + 1}')
            bone.head = inverse @ start.lerp(end, segment / 2)
            bone.tail = inverse @ start.lerp(end, (segment + 1) / 2)
            bone.parent = parent
            bone.use_deform = True
            created.append(bone.name)
            parent = bone
        bpy.ops.object.mode_set(mode='OBJECT')
        length = max((end - start).length, 0.001)
        for obj, index in selected:
            point = obj.matrix_world @ obj.data.vertices[index].co
            weight = max(0.05, min(0.85, (point - start).dot(axis) / length))
            if exact:
                original=obj.vertex_groups.get(parent_name)
                weight=next((g.weight for g in obj.data.vertices[index].groups if obj.vertex_groups[g.group].name==parent_name),0)
                original.remove([index])
            else:
                for group in list(obj.data.vertices[index].groups):
                    existing = obj.vertex_groups[group.group]
                    existing.add([index], group.weight * (1 - weight), 'REPLACE')
            segment = 1 if (point - start).dot(axis) / length > 0.5 else 0
            target = obj.vertex_groups.get(created[segment]) or obj.vertex_groups.new(name=created[segment])
            target.add([index], weight, 'REPLACE')
        chains.append({'name': label, 'bones': created, 'vertices': len(selected)})
    candidates = [(obj, vertex.index) for obj in meshes for vertex in obj.data.vertices]
    def points_if(predicate):
        return [(obj, index) for obj, index in candidates if predicate(obj.matrix_world @ obj.data.vertices[index].co,
            {obj.vertex_groups[g.group].name: g.weight for g in obj.data.vertices[index].groups})]
    if name == 'hare':
        for sign, side in [(-1, 'L'), (1, 'R')]:
            chain('ear_' + side, head_name, points_if(lambda p, w: p.z > low.z + (high.z - low.z) * 0.52 and p.x * sign > 0.02 and w.get(head_name, 0) > 0.5), Vector((0, 0, 1)))
    if name == 'fries':
        chain('hair', head_name, points_if(lambda p, w: p.z > low.z + (high.z - low.z) * 0.78 and p.y > head_origin.y and w.get(head_name, 0) > 0.5), Vector((0, 0, 1)))
    hips_name = next(bone.name for bone in arm.data.bones if bone.name.endswith(':Hips'))
    hips = (arm_world @ arm.data.bones[hips_name].matrix_local).translation
    if name in ['hare', 'dormouse']:
        chain('tail', hips_name, points_if(lambda p, w: p.y > hips.y + 0.065 and p.z < hips.z + 0.04 and w.get(hips_name, 0) > 0.4), Vector((0, 1, 0)))
    if name == 'hatter':
        coat=points_if(lambda p, w: p.y > hips.y + 0.065 and hips.z-original_height*.30 < p.z < hips.z-.05
            and sum(value for joint,value in w.items() if 'Arm' in joint or 'Hand' in joint)<.05
            and sum(value for joint,value in w.items() if 'Hips' in joint or 'Spine' in joint or 'UpLeg' in joint)>.5)
        # Each attachment preserves its original skin transform exactly. A hip-only
        # replacement would pull leg-weighted coat vertices away during sitting.
        parents={obj.vertex_groups[g.group].name for obj,index in coat for g in obj.data.vertices[index].groups if g.weight>.001}
        for parent_name in sorted(parents):
            selected=[(obj,index)for obj,index in coat if any(obj.vertex_groups[g.group].name==parent_name and g.weight>.001 for g in obj.data.vertices[index].groups)]
            chain('coat_'+parent_name.split(':')[-1],parent_name,selected,Vector((0,0,-1)),True)
    chest_name = next(bone.name for bone in arm.data.bones if bone.name.endswith(':Spine2'))
    chest = (arm_world @ arm.data.bones[chest_name].matrix_local).translation
    neck_name=next(bone.name for bone in arm.data.bones if bone.name.endswith(':Neck'))
    neck=(arm_world @ arm.data.bones[neck_name].matrix_local).translation
    if name=='fries':
        chosen=points_if(lambda p,w: abs(p.x-chest.x)<.09 and p.y<chest.y-.055 and chest.z-.04<p.z<chest.z+.04 and w.get(chest_name,0)>.4)
    else:
        chosen=points_if(lambda p,w: abs(p.x-neck.x)<original_height*.105 and p.y<chest.y-original_height*.035 and neck.z-original_height*.10<p.z<neck.z+original_height*.035
            and sum(value for joint,value in w.items() if 'Arm' in joint or 'Hand' in joint or 'Head' in joint)<.05
            and sum(value for joint,value in w.items() if 'Spine' in joint or 'Neck' in joint)>.5)
    chain('bow',chest_name,chosen,Vector((1,0,0)))
    def feature(label, center, dimensions, parent_name, color, axis):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, location=center)
        obj = bpy.context.object
        obj.name = label.title() + 'Detail'
        obj.scale = dimensions
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        material = bpy.data.materials.new(label + ' fabric')
        material.use_nodes=True
        material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*color,1)
        material.diffuse_color = (*color, 1)
        material.roughness = 0.85
        obj.data.materials.append(material)
        obj.vertex_groups.new(name=parent_name).add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
        obj.modifiers.new('Armature', 'ARMATURE').object = arm
        obj.parent = arm
        obj.matrix_parent_inverse = arm.matrix_world.inverted()
        meshes.append(obj)
        chain(label, parent_name, [(obj, vertex.index) for vertex in obj.data.vertices], axis)
    if name in ['hare', 'dormouse'] and not any(item['name'] == 'tail' for item in chains):
        depth = max(p.y for p in before_points)
        radius = original_height * (0.032 if name == 'hare' else 0.018)
        feature('tail', Vector((hips.x, depth + radius * 0.7, hips.z)),
            (radius, radius * (1.2 if name == 'hare' else 5), radius), hips_name,
            (0.65, 0.54, 0.44) if name == 'dormouse' else (0.88, 0.82, 0.72), Vector((0, 1, 0)))
    if name in ['hatter', 'dormouse'] and not any(item['name'] == 'bow' for item in chains):
        width = original_height * 0.035
        feature('bow', chest + Vector((0, -original_height * 0.055, 0.02 * original_height)),
            (width, width * 0.24, width * 0.48), chest_name, (0.35, 0.055, 0.08), Vector((1, 0, 0)))
    mouth, mouth_report = author_mouth(name, arm, meshes, head_name)
    arm['mouthLocal'] = list((arm_world @ arm.data.bones[head_name].matrix_local).inverted() @ mouth)
    arm['secondaryChains'] = json.dumps(chains)
    # Preserve local with-skin actions; the new rest bind is exported with each clip.
    for action in original_actions:
        duration = action.frame_range[1] - action.frame_range[0]
        target = 4.5 * bpy.context.scene.render.fps if action.name == 'stuff' else 18.54 * bpy.context.scene.render.fps if action.name == 'mend' else duration
        if duration > 0 and target != duration:
            start_frame = action.frame_range[0]
            for curve in curves(action):
                for key in curve.keyframe_points:
                    for value in [key.co, key.handle_left, key.handle_right]:
                        value.x = start_frame + (value.x - start_frame) * target / duration
            for track in arm.animation_data.nla_tracks:
                for strip in track.strips:
                    if strip.action == action:
                        strip.action_frame_start = start_frame
                        strip.action_frame_end = start_frame + target
                        strip.frame_end = strip.frame_start + target
    if name == 'fries' and bpy.data.actions.get('look_around') and bpy.data.actions.get('found'):
        found, source = bpy.data.actions['found'], bpy.data.actions['look_around']
        replacement = source.copy()
        found.name = 'legacy_found'
        replacement.name = 'found'
        for track in arm.animation_data.nla_tracks:
            for strip in track.strips:
                if strip.action == found:
                    strip.action = replacement
                    strip.action_frame_start = replacement.frame_range[0]
                    strip.action_frame_end = replacement.frame_range[1]
                    strip.frame_end = strip.frame_start + replacement.frame_range[1] - replacement.frame_range[0]
    if name=='hatter':
        # The imported "lean_over" is an arms-overhead crouch. Author a gentle
        # supported bend from idle instead, with feet and arms kept in their
        # ordinary posture. This is baked into the delivered clip, not a runtime
        # correction around the bad adult performance.
        legacy=bpy.data.actions['lean_over'];idle=bpy.data.actions['idle']
        scene=bpy.context.scene;arm.data.pose_position='POSE';arm.animation_data.action=idle
        duration=9*scene.render.fps;poses=[];idle_start,idle_end=idle.frame_range
        for frame in range(0,duration+1,2):
            scene.frame_set(int(idle_start)+frame%max(1,int(idle_end-idle_start)))
            k=min(1,frame/(1.5*scene.render.fps),(duration-frame)/(1.5*scene.render.fps));k=max(0,k);k=k*k*(3-2*k)
            pose={}
            for bone in arm.pose.bones:
                rotation=bone.rotation_quaternion.copy()
                angle={'mixamorig:Spine':.22,'mixamorig:Spine1':.25,'mixamorig:Spine2':.25,'mixamorig:Neck':.06,'mixamorig:Head':.08}.get(bone.name,0)
                if angle:
                    # Mixamo's local X is not necessarily the anatomical right
                    # axis. Convert the model-space right vector into this
                    # bone's rest frame, then pitch forward around that axis.
                    axis=(arm_world@bone.bone.matrix_local).to_quaternion().inverted()@Vector((1,0,0))
                    rotation=Quaternion(axis.normalized(),angle*k)@rotation
                pose[bone.name]=(bone.location.copy(),rotation,bone.scale.copy())
            poses.append((frame,pose))
        legacy.name='legacy_lean_over';replacement=bpy.data.actions.new('lean_over');arm.animation_data.action=replacement
        for frame,pose in poses:
            for bone in arm.pose.bones:
                bone.rotation_mode='QUATERNION';bone.location,bone.rotation_quaternion,bone.scale=pose[bone.name]
                for path in ['location','rotation_quaternion','scale']:bone.keyframe_insert(data_path=path,frame=frame,group=bone.name)
        for track in arm.animation_data.nla_tracks:
            for strip in track.strips:
                if strip.action==legacy:
                    strip.action=replacement;strip.action_frame_start=0;strip.action_frame_end=duration;strip.frame_end=strip.frame_start+duration
        original_actions[original_actions.index(legacy)]=replacement
        arm.animation_data.action=None;arm.data.pose_position='REST'
    points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    scale = original_height / (max(p.z for p in points) - min(p.z for p in points))
    wrapper = bpy.data.objects.new('CharacterRoot', None)
    bpy.context.scene.collection.objects.link(wrapper)
    for obj in list(bpy.context.scene.objects):
        if obj != wrapper and obj.parent is None:
            obj.parent = wrapper
    wrapper.scale = (scale, scale, scale)
    wrapper.location.z = -min(p.z for p in points) * scale
    arm.data.pose_position = 'POSE'
    for track in arm.animation_data.nla_tracks:
        track.mute = False
    bpy.ops.object.select_all(action='SELECT')
    target = output / f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', export_animation_mode='NLA_TRACKS', export_extras=True)
    report = {'character': name, 'headScale': head_scale, 'armScale': arm_scale, 'height': original_height,'weightRepairs':repairs,
        'headHeight': (high.z - low.z) * scale, 'headsTall': original_height / ((high.z - low.z) * scale),
        'secondaryChains': chains, 'mouthLocal': list(arm['mouthLocal']), 'mouth':mouth_report, 'clips': [action.name for action in original_actions]}
    (output / f'{name}.json').write_text(json.dumps(report, indent=2))
    print('CHARACTER', json.dumps(report), flush=True)
