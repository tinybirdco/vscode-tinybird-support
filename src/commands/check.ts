import { Command } from '../types'
import { executeCLICommand } from '../utils'

export const checkCommand: Command<string> = {
  id: 'check',
  action(context) {
    return () => executeCLICommand('check', context)
  }
}
