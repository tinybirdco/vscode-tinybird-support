import { Context } from '../context'
import { Pipe } from '../types'
import { fetcher } from '../utils/fetcher'

export const getPipes = (context: Context) =>
  fetcher<{ pipes: Pipe[] }>({
    url: '/v0/pipes',
    context
  })
