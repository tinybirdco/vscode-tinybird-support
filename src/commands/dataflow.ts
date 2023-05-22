import { Command } from '../types'
import { DataFlowPanel } from '../views/dataflow'

export const dataFlowStartCommand: Command = {
  id: 'dataFlowStart',
  action(context) {
    return () => DataFlowPanel.createOrShow(context.extensionUri, context)
  }
}
