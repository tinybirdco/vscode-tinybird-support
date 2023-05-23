import { Context } from '../context'
import { Environment } from '../types'
import { fetcher } from '../utils/fetcher'

export const getEnvironments = (context: Context) =>
  fetcher<{ environments: Environment[] }>({
    url: '/v0/workspace',
    context
  })
