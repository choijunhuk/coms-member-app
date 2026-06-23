function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function registerPushTokenWithRetry({
  register,
  payload,
  isRecoverable,
  maxAttempts = 3,
  delay = wait,
}) {
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await register(payload)
    } catch (err) {
      lastError = err
      if (attempt >= maxAttempts || !isRecoverable?.(err)) throw err
      await delay(350 * attempt)
    }
  }
  throw lastError
}
