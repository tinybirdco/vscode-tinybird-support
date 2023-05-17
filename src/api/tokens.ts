import { Context } from '../context'
import { Token } from '../types'
import { fetcher } from '../utils/fetcher'

export const getTokens = (context: Context) =>
  fetcher<{ tokens: Token[] }>({
    url: '/tokens',
    context
  })
