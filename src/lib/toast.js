/**
 * Minimal pub/sub toast emitter.
 * Usage:
 *   import { showToast } from '../lib/toast'
 *   showToast('Message here')              // default success
 *   showToast('Oops!', 'error')
 */

let _id = 0
const listeners = new Set()

export function showToast(message, type = 'success') {
  const toast = { id: ++_id, message, type }
  listeners.forEach(fn => fn(toast))
}

export function onToast(fn)  { listeners.add(fn);    return () => listeners.delete(fn) }
