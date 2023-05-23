import * as vscode from 'vscode'
import { Command } from '../types'
import { executeCLICommand } from '../utils'

export const connectionListCommand: Command = {
  id: 'connectionList',
  action(context) {
    return () => executeCLICommand('connection ls', context)
  }
}

export const connectionCreateKafkaCommand: Command = {
  id: 'connectionCreateKafka',
  action(context) {
    return () => executeCLICommand('connection create kafka', context)
  }
}

export const connectionCreateBigQueryCommand: Command = {
  id: 'connectionCreateBigQuery',
  action(context) {
    return () => executeCLICommand('connection create bigquery', context)
  }
}

export const connectionCreateSnowflakeCommand: Command = {
  id: 'connectionCreateSnowflake',
  action(context) {
    return () => executeCLICommand('connection create snowflake', context)
  }
}

export const connectionRemoveCommand: Command = {
  id: 'connectionRemove',
  action(context) {
    return async () => {
      const connectionId = await vscode.window.showInputBox({
        prompt: 'Enter the ID of the connection',
        title: 'Connection ID'
      })

      if (!connectionId) {
        return
      }

      executeCLICommand(`connection rm ${connectionId}`, context)
    }
  }
}
