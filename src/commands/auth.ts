import { Command } from '../types'
import { executeCLICommand } from '../utils'

export const authCommand: Command<string> = {
  id: 'login',
  action(context) {
    return () => executeCLICommand('auth', context)
  }
}
