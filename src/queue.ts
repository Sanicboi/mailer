export class Queue<Job, Result> {
  private jobs: Promise<Result>[] = [];

  private async wait(s: number): Promise<void> {
    await new Promise((resolve, reject) => setTimeout(resolve, s * 1000));
  }

  constructor(
    private readonly callback: (j: Job) => Promise<Result>,
    private readonly bufferSize: number,
    private readonly waitTime: number,
  ) {}

  private async end(): Promise<Result[]> {
    let res = await Promise.all(this.jobs);
    this.jobs = [];
    return res;
  }

  public async addAndProcess(jobs: Job[]): Promise<Result[]> {
    let results: Result[] = [];
    for (let i = 0; i < jobs.length; i++) {
      if ((i % this.bufferSize === 0 && i !== 0) || i + 1 === jobs.length) {
        results = results.concat(await this.end());
        if (i + 1 !== jobs.length) {
          await this.wait(this.waitTime);
        }
      }

      this.jobs.push(this.callback(jobs[i]));

      if (i + 1 === jobs.length) {
        results = results.concat(await this.end());
      }
    }
    return results;
  }
}
