export interface ManagedProcess {
  readonly label: string
  stop(): Promise<void>
}

export class ManagedProcessGroup {
  readonly #processes: ManagedProcess[] = []
  #shutdown: Promise<void> | null = null

  add(process: ManagedProcess): void {
    if (this.#shutdown) throw new Error('Cannot add a process after shutdown has started')
    this.#processes.push(process)
  }

  shutdown(): Promise<void> {
    this.#shutdown ??= Promise.allSettled([...this.#processes].reverse().map((process) => process.stop())).then((results) => {
      const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
      if (rejected) throw rejected.reason
    })
    return this.#shutdown
  }
}

