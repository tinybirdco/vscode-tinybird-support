import { Context } from '../context'
import { DataSource } from '../types'
import { fetcher } from '../utils/fetcher'

export const getDataSources = (context: Context) =>
  fetcher<{ datasources: DataSource[] }>({
    url: '/v0/datasources',
    context,
    params: {
      attrs: [
        'id',
        'name',
        'description',
        'cluster',
        'tags',
        'created_at',
        'updated_at',
        'replicated',
        'version',
        'project',
        'headers',
        'shared_with',
        'shared_from',
        'engine',
        'columns',
        'type',
        'statistics',
        'new_columns_detected',
        'kafka_topic',
        'kafka_group_id',
        'kafka_auto_offset_reset',
        'kafka_store_raw_value',
        'kafka_target_partitions',
        'service',
        'connector',
        'quarantine_rows',
        'used_by'
      ].join(',')
    }
  })
