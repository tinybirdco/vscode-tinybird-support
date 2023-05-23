import { Context } from '../context'
import { Pipe } from '../types'
import { fetcher } from '../utils/fetcher'

export const getPipes = (context: Context) =>
  fetcher<{ pipes: Pipe[] }>({
    url: '/v0/pipes',
    context,
    params: {
      attrs: [
        'id',
        'name',
        'description',
        'type',
        'copy_node',
        'copy_target_datasource',
        'endpoint',
        'created_at',
        'updated_at',
        'parent',
        'url',
        'nodes'
      ].join(','),
      dependencies: true
    }
  })
