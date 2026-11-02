import RAPIER from '@dimforge/rapier3d-compat'

await RAPIER.init()

export { RAPIER }
export const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
