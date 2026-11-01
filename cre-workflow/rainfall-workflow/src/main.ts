import { Runner } from '@chainlink/cre-sdk'
import { configSchema } from './config'
import { initWorkflow } from './handler'

/**
 * CRE entrypoint function.
 * Note: Must be a parameterless function matching WIT export `export main: func();`.
 */
export async function main() {
  const runner = await Runner.newRunner({ configSchema })
  await runner.run(initWorkflow)
}
