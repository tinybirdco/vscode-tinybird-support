import { Context } from './context'

export type Column = {
  name: string
  type: string
}

export type DataSource = {
  id: string
  name: string
  columns: Column[] | null
}

export type Pipe = {
  id: string
  name: string
  nodes: Node[] | null
}

export type Node = {
  id: string
  name: string
}

export type RefreshAction = () => void

export type Command<T = void> = {
  id: string
  icon?: string
  action: (context: Context, refresh: RefreshAction) => (params?: T) => void
}

export type Token = {
  id: string
  name: string
}

export type Workspace = {
  id: string
  name: string
}
