declare module 'simple-git' {
  export interface SimpleGit {
    status(): Promise<{
      files: { path: string; status: string }[];
    }>;
    checkoutLocalBranch(branchName: string): Promise<void>;
    add(files: string | string[]): Promise<void>;
    commit(message: string): Promise<void>;
    push(remote: string, branch: string): Promise<void>;
    getRemotes(verbose?: boolean): Promise<Array<{
      name: string;
      refs: { fetch: string; push: string };
    }>>;
  }

  export function simpleGit(baseDir?: string): SimpleGit;
  export default simpleGit;
}
