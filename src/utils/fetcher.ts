import * as vscode from 'vscode'
import { Context } from '../context'

export type FetcherError<TError> = TError

export type FetcherOptions<TBody, THeaders, TParams> = {
  url: string
  context: Context
  method?: string
  body?: TBody
  headers?: THeaders
  params?: TParams
  token?: string
  silentError?: boolean
}

export async function fetcher<
  TData,
  TError extends {
    message: string
  } = {
    message: string
  },
  TBody extends Record<string, any> | undefined | null = undefined,
  THeaders extends Record<string, any> = Record<string, any>,
  TParams extends Record<string, any> = Record<string, any>
>({
  url,
  method = 'get',
  body,
  headers,
  params,
  token,
  silentError,
  context
}: FetcherOptions<TBody, THeaders, TParams>): Promise<
  { success: true; data: TData } | { success: false; error: FetcherError<TError> }
> {
  try {
    if (!token) {
      token = await context.getToken()
    }

    if (!token) {
      throw new Error('Tinybird: Invalid token')
    }

    const baseUrl = context.getBaseUrl()
    const fetch = await import('node-fetch').then(m => m.default)
    const response = await fetch(
      `${baseUrl}${resolveUrl(url, { ...params, token })}`,
      {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          ...headers
        },
        method,
        body: body ? JSON.stringify(body) : undefined
      }
    )

    if (response.status === 401) {
      throw new Error('Tinybird: Invalid token')
    }

    if (response.status === 204 /* no content */) {
      return { success: true, data: undefined as any }
    }

    if (!response.status.toString().startsWith('2')) {
      const payload = (await response.json()) as any

      if (response.status === 400 && !silentError) {
        vscode.window.showErrorMessage(payload.message)
      }

      return {
        success: false,
        error: {
          status: response.status,
          payload
        } as any
      }
    }

    return { success: true, data: (await response.json()) as any }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOTFOUND') {
      throw new Error('Error: You are offline')
    }
    throw e
  }
}

const resolveUrl = (url: string, queryParams: Record<string, string> = {}) => {
  let query = new URLSearchParams(queryParams).toString()
  if (query) query = `?${query}`
  return `${url}${query}`
}
