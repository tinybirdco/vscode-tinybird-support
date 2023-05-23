import { Context } from '../context'
import { Workspace } from '../types'
import { fetcher } from '../utils/fetcher'

export const getEnvironments = (context: Context) =>
  fetcher<Workspace>({
    url: '/v0/workspace',
    context
  })
