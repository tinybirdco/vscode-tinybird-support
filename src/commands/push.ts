import { Command } from '../types'
import { executeCLICommand } from '../utils'

export const pushCommand: Command<string> = {
  id: 'push',
  action(context) {
    return () => executeCLICommand('push', context)
  }
}

export const pushForceCommand: Command<string> = {
  id: 'pushForce',
  action(context) {
    return () => executeCLICommand('push -f', context)
  }
}
