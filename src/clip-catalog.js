import contacts from '../docs/fries_hand_contacts.json'

// This table owns posture, looping, contact windows and support-height policy.
// "upper" clips borrow only the upper body while the seated pelvis/legs remain fixed.
export const CLIPS = {
  idle: { posture: 'standing', loop: true },
  walk: { posture: 'standing', loop: true }, run: { posture: 'standing', loop: true },
  jump: { posture: 'standing', loop: false }, talk: { posture: 'standing', loop: true },
  laugh: { posture: 'standing', loop: true }, sing: { posture: 'standing', loop: true },
  cheer: { posture: 'standing', loop: false }, surprised: { posture: 'standing', loop: false },
  found: { posture: 'standing', loop: false }, look_around: { posture: 'standing', loop: false },
  examine: { posture: 'upper', loop: false }, clap: { posture: 'upper', loop: false, contact: { time: 0.18, fadeIn: 0.12, hold: 0.05, fadeOut: 0.14, hands: ['left', 'right'] } },
  drink: { posture: 'upper', loop: false, contact: { ...contacts.drink, fadeIn: 0.5, hold: 0.65, fadeOut: 0.5 } },
  reach: { posture: 'upper', loop: false, contact: { ...contacts.reach, fadeIn: 1.2, hold: 0.4, fadeOut: 0.35 } },
  pick_up: { posture: 'standing', loop: false, contact: { ...contacts.pick_up, fadeIn: 0.8, hold: 0.5, fadeOut: 0.6 } },
  sit_down: { posture: 'transition', transition: 'sit', loop: false, rootHeight: 'seat' },
  stand_up: { posture: 'transition', transition: 'stand', loop: false, rootHeight: 'seat' },
  sit_idle: { posture: 'seated', loop: true, rootHeight: 'seat' },
  sit_talk: { posture: 'seated', loop: true, rootHeight: 'seat' },
  sit_laugh: { posture: 'seated', loop: true, rootHeight: 'seat' },
  sit_yell: { posture: 'seated', loop: true, rootHeight: 'seat' },
  sit_point: { posture: 'seated', loop: true, rootHeight: 'seat' },
  sit_beckon: { posture: 'seated', loop: false, rootHeight: 'seat' },
  sit_scared: { posture: 'seated', loop: false, rootHeight: 'seat' },
  show_watch: { posture: 'upper', loop: false, rootHeight: 'seat', contact: { hand: 'right', phase: 0.45, width: 0.35 } },
  mend: { posture: 'upper', loop: false, rootHeight: 'support', duetDuration: 18.54, contact: { hands: ['left', 'right'], phase: 0.5, width: 0.45 } },
  stuff: { posture: 'upper', loop: false, rootHeight: 'support', duetDuration: 4.5, contact: { hands: ['left', 'right'], phase: 0.55, width: 0.4 } },
  butter: { posture: 'upper', loop: false, rootHeight: 'seat', contact: { hand: 'right', phase: 0.55, width: 0.4 } },
  dunk_watch: { posture: 'upper', loop: false, rootHeight: 'seat', contact: { hand: 'right', phase: 0.65, width: 0.3 } },
  conduct: { posture: 'standing', loop: false }, serve: { posture: 'upper', loop: false },
  lean_over: { posture: 'standing', loop: false },
  lay_spoon: { posture: 'standing', loop: false, contact: { hand: 'right', phase: 0.6, width: 0.35 } },
  pour: { posture: 'upper', loop: false, contact: { hand: 'right', phase: 0.5, width: 0.4 } },
  sleep: { posture: 'lying', loop: true, rootHeight: 'support' },
  wake: { posture: 'lying', loop: false, rootHeight: 'support' },
  dance_swing: { posture: 'standing', loop: true }, dance_silly: { posture: 'standing', loop: true },
}

for (const name of Object.keys(CLIPS)) CLIPS[name] = Object.freeze({ rootHeight: 'ground', contact: null, ...CLIPS[name] })
export const clipInfo = name => CLIPS[name] ?? { posture: name.startsWith('sit_') ? 'seated' : 'standing', loop: !name.startsWith('sit_'), contact: null, rootHeight: 'ground' }
export const SEATED_GESTURES = { idle: 'sit_idle', talk: 'sit_talk', laugh: 'sit_laugh', yell: 'sit_yell', point: 'sit_point' }
export const STANDING_GESTURES = { idle: 'idle', talk: 'talk', laugh: 'laugh', yell: 'talk', point: 'talk' }

export function contactWeight(name, time, duration) {
  const contact = clipInfo(name).contact
  if (!contact) return 0
  const centre = contact.time ?? (contact.phase ?? 0.5) * duration
  const before = contact.fadeIn ?? (contact.width ?? 0.3) * duration
  const after = contact.hold ?? (contact.width ?? 0.3) * duration
  const out = contact.fadeOut ?? 0.25
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t) }
  return smooth((time - centre + before) / Math.max(before, 0.001)) * (1 - smooth((time - centre - after) / Math.max(out, 0.001)))
}

export function resolveClip(name, seated, actions) {
  if (seated && SEATED_GESTURES[name] && actions[SEATED_GESTURES[name]]) return SEATED_GESTURES[name]
  // Borrowed upper-body performances are allowed only with a canonical lower-body mask.
  if (seated && clipInfo(name).posture === 'standing') return actions.sit_idle ? 'sit_idle' : name
  return name
}
