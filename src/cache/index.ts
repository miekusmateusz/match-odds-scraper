import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 60 })

export const getFromCache = (key: string) => {
  return cache.get(key)
}

export const setToCache = (key: string, value: any) => {
  cache.set(key, value)
}

export const deleteFromCache = (key: string) => {
  cache.del(key)
}

export default cache
