import { Command } from '../types'
import { executeCLICommand } from '../utils'

export const pushCommand: Command = {
  id: 'push',
  action(context) {
    return () => executeCLICommand('push', context)
  }
}

export const pushForceCommand: Command = {
  id: 'pushForce',
  action(context) {
    return () => executeCLICommand('push -f', context)
  }
}
