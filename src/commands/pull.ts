import { Command } from '../types'
import { executeCLICommand } from '../utils'

export const pullCommand: Command = {
  id: 'pull',
  action(context) {
    return () => executeCLICommand('pull', context)
  }
}

export const pullForceCommand: Command = {
  id: 'pullForce',
  action(context) {
    return () => executeCLICommand('pull -f', context)
  }
}
