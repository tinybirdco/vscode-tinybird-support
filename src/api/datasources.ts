import { Context } from '../context'
import { DataSource } from '../types'
import { fetcher } from '../utils/fetcher'

export const getDataSources = (context: Context) =>
  fetcher<{ datasources: DataSource[] }>({
    url: '/v0/datasources',
    context
  })
