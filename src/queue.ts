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
      this.jobs.push(this.callback(jobs[i]));
      
      if (this.jobs.length >= this.bufferSize || i === jobs.length - 1) {
        results = results.concat(await this.end());
        await this.wait(this.waitTime);
      }
    }
    return results;
  }
}
