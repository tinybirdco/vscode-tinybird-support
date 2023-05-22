import { Command } from '../types'
import { executeCLICommand } from '../utils'

export const authCommand: Command = {
  id: 'login',
  action(context) {
    return () => executeCLICommand('auth', context)
  }
}
