export function isNetworkError(error: any): boolean {
  if (!error) return false

  const errMsg = (error.message || '').toLowerCase()
  const errCode = (error.code || '').toLowerCase()
  const status = error.status

  if (
    errMsg.includes('fetch failed') ||
    errMsg.includes('enotfound') ||
    errMsg.includes('eai_again') ||
    errMsg.includes('econnrefused') ||
    errMsg.includes('etimedout') ||
    errMsg.includes('socket hang up') ||
    errMsg.includes('network') ||
    errMsg.includes('dns') ||
    errCode.includes('enotfound') ||
    errCode.includes('eai_again') ||
    errCode.includes('econnrefused') ||
    errCode.includes('etimedout')
  ) {
    return true
  }

  if (status === 0) {
    return true
  }

  return false
}
